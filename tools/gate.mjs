#!/usr/bin/env node
/**
 * gate.mjs -- the CI regression gate.
 *
 * For every shot: fresh-context capture -> pixel diff vs committed baseline.
 * Writes tools/artifacts/<name>.png (candidate) and <name>.diff.png on
 * mismatch. Exits non-zero if any shot moved a pixel or has no baseline.
 *
 * Usage: node tools/gate.mjs [--url http://localhost:4173/] [--threshold 0] [--update]
 *   --update  rewrite baselines instead of failing (same as baseline.mjs)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { diffPng } from './imagediff.mjs'
import { bootPage, pump, shootCanvas, startRun } from './lib/harness.js'
import { SHOTS } from './lib/shots.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASELINE_DIR = join(__dirname, 'baselines')
const ARTIFACT_DIR = join(__dirname, 'artifacts')

function flag(name) {
  return process.argv.includes(name)
}
function opt(name, dflt) {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : dflt
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
  const url = opt('--url', undefined)
  const threshold = Number(opt('--threshold', '0'))
  const update = flag('--update')
  mkdirSync(BASELINE_DIR, { recursive: true })
  mkdirSync(ARTIFACT_DIR, { recursive: true })

  let failures = 0
  for (const shot of SHOTS) {
    const candidate = await captureShot(shot, url)
    const baselinePath = join(BASELINE_DIR, `${shot.name}.png`)

    if (update || !existsSync(baselinePath)) {
      writeFileSync(baselinePath, candidate)
      console.log(`${update ? 'updated' : 'created'} baseline: ${shot.name}`)
      continue
    }

    const res = diffPng(readFileSync(baselinePath), candidate, { threshold })
    if (res.dimMismatch) {
      console.error(`✗ ${shot.name}: ${res.message}`)
      writeFileSync(join(ARTIFACT_DIR, `${shot.name}.png`), candidate)
      failures++
      continue
    }
    if (res.mismatch > 0) {
      writeFileSync(join(ARTIFACT_DIR, `${shot.name}.png`), candidate)
      if (res.diff)
        writeFileSync(join(ARTIFACT_DIR, `${shot.name}.diff.png`), PNG.sync.write(res.diff))
      console.error(`✗ ${shot.name}: ${res.mismatch}/${res.total} pixels differ`)
      failures++
    } else {
      console.log(`✓ ${shot.name}: bit-identical`)
    }
  }

  if (failures > 0) {
    console.error(
      `\n${failures}/${SHOTS.length} shot(s) regressed. See tools/artifacts/. If intended: node tools/gate.mjs --update`
    )
    process.exit(1)
  }
  console.log(`\nall ${SHOTS.length} shots bit-identical`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
