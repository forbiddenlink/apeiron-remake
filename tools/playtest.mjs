#!/usr/bin/env node
/**
 * playtest.mjs -- scripted deterministic smoke test.
 *
 * Drives a real run (hold fire, sweep left/right) under the frozen-clock
 * harness and asserts invariants every chunk:
 *   - zero console errors and zero uncaught page errors
 *   - score is a finite number, never decreases
 *   - lives never goes negative
 *   - mode is always one of the valid states
 * Exits non-zero on any violation. This is the "does it crash under play"
 * gate that pure unit tests can't see (real render + input + spawn loop).
 *
 * Usage: node tools/playtest.mjs [--frames 900] [--seed ...] [--url ...]
 */
import { bootPage, pump, readState, startRun } from './lib/harness.js'

function opt(name, dflt) {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : dflt
}

const VALID_MODES = new Set(['title', 'playing', 'pause', 'gameover'])

async function main() {
  const totalFrames = Number(opt('--frames', '900'))
  const seed = Number(opt('--seed', String(0x1234abcd)))
  const url = opt('--url', undefined)
  const CHUNK = 30

  const h = await bootPage({ seed, url })
  const failures = []
  let prevScore = 0

  try {
    await startRun(h.page)
    await h.page.keyboard.down('Space') // hold fire

    for (let f = 0; f < totalFrames; f += CHUNK) {
      // sweep movement so collision/mushroom-block paths get exercised
      const dir = Math.floor(f / CHUNK) % 2 === 0 ? 'ArrowLeft' : 'ArrowRight'
      await h.page.keyboard.down(dir)
      await pump(h.page, CHUNK)
      await h.page.keyboard.up(dir)

      const s = await readState(h.page)
      if (!VALID_MODES.has(s.mode)) failures.push(`frame ${f}: invalid mode "${s.mode}"`)
      if (!Number.isFinite(s.score)) failures.push(`frame ${f}: score not finite (${s.score})`)
      if (s.score < prevScore)
        failures.push(`frame ${f}: score decreased ${prevScore} -> ${s.score}`)
      if (s.lives < 0) failures.push(`frame ${f}: lives negative (${s.lives})`)
      if (!Number.isFinite(s.level) || s.level < 1)
        failures.push(`frame ${f}: bad level (${s.level})`)
      prevScore = s.score
      if (s.mode === 'gameover') break // survived to a legit game over -- not a crash
    }
    await h.page.keyboard.up('Space')

    for (const e of h.consoleErrors) failures.push(`console.error: ${e}`)
    for (const e of h.pageErrors) failures.push(`pageerror: ${e}`)

    const final = await readState(h.page)
    if (failures.length) {
      console.error(`playtest FAILED (${failures.length} issue(s)):`)
      for (const f of failures.slice(0, 20)) console.error(`  - ${f}`)
      process.exit(1)
    }
    console.log(
      `playtest OK: ${totalFrames} frames, no crash. final score=${final.score} level=${final.level} mode=${final.mode}`
    )
  } finally {
    await h.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
