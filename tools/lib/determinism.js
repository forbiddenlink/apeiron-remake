/**
 * Determinism harness for headless Apeiron capture.
 *
 * WHY: Engine.ts drives its own rAF loop off performance.now() with a time
 * accumulator, and 36 Math.random() call sites live in the render/gameplay
 * path. Both make frame N non-reproducible across runs. Rather than edit the
 * Engine, we override the browser globals BEFORE any app code runs (Playwright
 * addInitScript), giving the exact CoD-style "engine clock" determinism:
 *
 *   - Math.random  -> seeded mulberry32 (all 36 sites become deterministic)
 *   - performance.now / Date.now -> a virtual clock we advance by hand
 *   - requestAnimationFrame -> a manual queue pumped one fixed step at a time
 *   - AudioContext -> no-op stub (headless has no audio device; avoids throws)
 *
 * Advancing the virtual clock by exactly 1000/60 ms per pump yields exactly one
 * fixed 1/60 tick per frame (Engine's FIXED_DT), so gameplay + render are
 * bit-identical given a fixed seed and frame count.
 *
 * This file runs in the BROWSER context. Keep it dependency-free and ES5-ish.
 */

/**
 * @param {{ seed?: number, startMs?: number, fixedDtMs?: number }} opts
 */
export function installDeterminism(opts) {
  const seed = (opts && opts.seed) || 0x1234abcd
  const startMs = (opts && opts.startMs) || 1700000000000
  const fixedDtMs = (opts && opts.fixedDtMs) || 1000 / 60

  // --- seeded PRNG (mulberry32) replacing Math.random -------------------
  let s = seed >>> 0
  Math.random = () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // --- virtual clock ----------------------------------------------------
  const clock = { t: 0 }
  const _now = () => clock.t
  // performance.now is read-only on the prototype in some engines; define it.
  try {
    Object.defineProperty(performance, 'now', { value: _now, configurable: true })
  } catch (_e) {
    performance.now = _now
  }
  Date.now = () => startMs + clock.t

  // --- manual requestAnimationFrame queue -------------------------------
  let rafQueue = []
  let rafId = 0
  window.requestAnimationFrame = (cb) => {
    rafId += 1
    rafQueue.push({ id: rafId, cb: cb })
    return rafId
  }
  window.cancelAnimationFrame = (id) => {
    rafQueue = rafQueue.filter((e) => e.id !== id)
  }

  // --- audio stub (headless has no output device) -----------------------
  // A universal Proxy node: any property read returns another universal node
  // (so a.b.c chains work), any call is a no-op returning a node, `.value`/
  // numeric-ish reads return 0. This covers every Web Audio node type + the
  // howler dependency without hand-listing each create*/method.
  function universalNode() {
    const fn = () => universalNode()
    return new Proxy(fn, {
      get: (_t, prop) => {
        if (prop === 'value' || prop === 'currentTime' || prop === 'sampleRate') return 0
        if (prop === 'state') return 'running'
        if (prop === Symbol.toPrimitive) return () => 0
        if (prop === 'then') return undefined // never look thenable to await
        if (prop === 'getChannelData') return () => new Float32Array(1)
        return universalNode()
      },
      set: () => true,
      apply: () => universalNode(),
    })
  }
  function FakeAudioCtx() {
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop === 'currentTime') return 0
        if (prop === 'sampleRate') return 44100
        if (prop === 'state') return 'running'
        if (prop === 'destination') return universalNode()
        if (prop === 'resume' || prop === 'suspend' || prop === 'close') {
          return () => Promise.resolve()
        }
        if (prop === 'decodeAudioData') {
          return () => Promise.resolve(universalNode())
        }
        if (prop === 'listener') return universalNode()
        if (prop in target) return target[prop]
        // createOscillator / createGain / createConvolver / anything else
        return () => universalNode()
      },
    })
  }
  window.AudioContext = FakeAudioCtx
  window.webkitAudioContext = FakeAudioCtx

  // --- pump API surfaced to Node ---------------------------------------
  // Advance the virtual clock by one fixed step and flush the rAF callbacks
  // that were queued for this frame. Callbacks that re-schedule (the game
  // loop) land in the next frame's batch, so one pump == one rendered frame.
  window.__apeironPumpFrame = () => {
    clock.t += fixedDtMs
    const batch = rafQueue
    rafQueue = []
    for (let i = 0; i < batch.length; i++) {
      batch[i].cb(clock.t)
    }
    return clock.t
  }
  window.__apeironPump = (frames) => {
    for (let i = 0; i < frames; i++) window.__apeironPumpFrame()
    return clock.t
  }
  window.__apeironClock = clock
  window.__APEIRON_TEST__ = true
}

/**
 * Serialized IIFE string for environments that prefer addInitScript({content}).
 * @param {object} opts
 * @returns {string}
 */
export function installDeterminismSource(opts) {
  return '(' + installDeterminism.toString() + ')(' + JSON.stringify(opts || {}) + ');'
}

/**
 * Profiler installer -- for REAL frame-time measurement.
 *
 * Unlike installDeterminism, this leaves performance.now / rAF / the clock
 * REAL so we observe true runtime cost. It only (a) seeds Math.random for a
 * reproducible workload and (b) wraps rAF to record the real delta between
 * presented frames into window.__apeironFrameTimes (ms). Distribution of these
 * -- p50/p95/p99/worst -- is what exposes stalls a median FPS hides.
 *
 * @param {{ seed?: number }} opts
 */
export function installProfiler(opts) {
  const seed = (opts && opts.seed) || 0x1234abcd
  let s = seed >>> 0
  Math.random = () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const times = []
  window.__apeironFrameTimes = times
  const realRaf = window.requestAnimationFrame.bind(window)
  let last = -1
  // Multiple rAF users (engine + sparticles overlay) can fire on the SAME
  // animation-frame timestamp; only record a delta when the clock actually
  // advances so a real frame period is measured, not a 0ms intra-frame gap.
  window.requestAnimationFrame = (cb) =>
    realRaf((ts) => {
      if (ts > last) {
        if (last >= 0) times.push(ts - last)
        last = ts
      }
      return cb(ts)
    })
  window.__APEIRON_TEST__ = true
}
