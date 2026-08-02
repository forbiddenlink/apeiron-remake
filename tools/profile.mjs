#!/usr/bin/env node
/**
 * profile.mjs -- real frame-time DISTRIBUTION, not median FPS.
 *
 * Claude-of-Duty's key finding: a 94 fps median hid 12-17 fps real gameplay
 * because a few frames stalled 700ms+ on lazy shader compiles. Averages lie;
 * p95/p99 and the worst frame tell the truth. This runs the game at REAL time
 * (seeded workload) and reports the distribution.
 *
 * Usage: node tools/profile.mjs [--frames 600] [--seed 0x1234abcd] [--url ...] [--json]
 */
import { bootPage, readState, startRun } from './lib/harness.js'

function opt(name, dflt) {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : dflt
}
function flag(name) {
  return process.argv.includes(name)
}

function pct(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

async function main() {
  const targetFrames = Number(opt('--frames', '600'))
  const seed = Number(opt('--seed', String(0x1234abcd)))
  const url = opt('--url', undefined)

  const h = await bootPage({ seed, url, profile: true })
  try {
    await startRun(h.page)
    // Let the real rAF loop present targetFrames, then read the recorded deltas.
    await h.page.waitForFunction(
      (n) => (window.__apeironFrameTimes?.length ?? 0) >= n,
      targetFrames,
      { timeout: 120000, polling: 100 }
    )
    const raw = await h.page.evaluate(() => window.__apeironFrameTimes.slice())
    const state = await readState(h.page)

    // Drop warmup frames (boot / lazy-compile spikes) so steady-state shows
    // clean, but report the worst warmup frame separately -- that stall is the
    // real signal a median would bury.
    const WARMUP = 8
    const warmup = raw.slice(0, WARMUP)
    const times = raw.slice(WARMUP)
    const worstWarmup = warmup.length ? Math.max(...warmup) : 0
    const sorted = times.slice().sort((a, b) => a - b)
    const sum = sorted.reduce((a, b) => a + b, 0)
    const stats = {
      frames: sorted.length,
      meanMs: +(sum / sorted.length).toFixed(2),
      p50Ms: +pct(sorted, 50).toFixed(2),
      p95Ms: +pct(sorted, 95).toFixed(2),
      p99Ms: +pct(sorted, 99).toFixed(2),
      worstMs: +sorted[sorted.length - 1].toFixed(2),
      worstWarmupMs: +worstWarmup.toFixed(2),
      fpsP50: +(1000 / pct(sorted, 50)).toFixed(1),
      fpsP99: +(1000 / pct(sorted, 99)).toFixed(1),
      finalScore: state.score,
      finalLevel: state.level,
    }

    if (flag('--json')) {
      console.log(JSON.stringify(stats, null, 2))
    } else {
      console.log('frame-time distribution (real, seeded workload)')
      console.log(`  frames   ${stats.frames}`)
      console.log(`  mean     ${stats.meanMs} ms`)
      console.log(`  p50      ${stats.p50Ms} ms   (${stats.fpsP50} fps)`)
      console.log(`  p95      ${stats.p95Ms} ms`)
      console.log(`  p99      ${stats.p99Ms} ms   (${stats.fpsP99} fps)`)
      console.log(`  worst    ${stats.worstMs} ms   (steady-state)`)
      console.log(`  warmup   ${stats.worstWarmupMs} ms   (worst boot frame, excluded above)`)
      console.log(`  reached  score=${stats.finalScore} level=${stats.finalLevel}`)
    }
  } finally {
    await h.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
