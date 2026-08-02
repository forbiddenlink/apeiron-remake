#!/usr/bin/env node
/**
 * baseline.mjs -- (re)generate the golden PNGs for every shot in the set.
 *
 * Each shot runs in its own fresh browser context for isolation. Commit the
 * resulting tools/baselines/*.png so the gate has something to diff against.
 * Re-run and re-commit ONLY when a visual change is intended and reviewed.
 *
 * Usage: node tools/baseline.mjs [--url http://localhost:4173/]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bootPage, pump, shootCanvas, startRun } from './lib/harness.js'
import { SHOTS } from './lib/shots.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASELINE_DIR = join(__dirname, 'baselines')

function argUrl() {
  const i = process.argv.indexOf('--url')
  return i > -1 ? process.argv[i + 1] : undefined
}

async function captureShot(shot, url) {
  const h = await bootPage({ seed: shot.seed, url })
  try {
    if (shot.play) await startRun(h.page)
    await pump(h.page, shot.frames)
    return await shootCanvas(h.page)
  } finally {
    await h.close()
  }
}

async function main() {
  const url = argUrl()
  mkdirSync(BASELINE_DIR, { recursive: true })
  for (const shot of SHOTS) {
    const png = await captureShot(shot, url)
    const out = join(BASELINE_DIR, `${shot.name}.png`)
    writeFileSync(out, png)
    console.log(`baseline: ${shot.name}.png (seed=${shot.seed}, frames=${shot.frames})`)
  }
  console.log(`\n${SHOTS.length} baselines written to tools/baselines/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
