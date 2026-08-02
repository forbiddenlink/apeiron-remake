#!/usr/bin/env node
/**
 * capture.mjs -- take one deterministic PNG of the game canvas.
 *
 * Usage:
 *   node tools/capture.mjs --out shot.png [--frames 120] [--seed 0x1234abcd] [--play] [--url http://localhost:4173/]
 *
 * `--play` starts a run before pumping frames (otherwise you get the title).
 */
import { writeFileSync } from 'node:fs'
import { bootPage, pump, shootCanvas, startRun } from './lib/harness.js'

function parseArgs(argv) {
  const args = { out: 'shot.png', frames: 120, seed: 0x1234abcd, play: false, url: undefined }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--out') args.out = argv[++i]
    else if (a === '--frames') args.frames = Number(argv[++i])
    else if (a === '--seed') args.seed = Number(argv[++i])
    else if (a === '--play') args.play = true
    else if (a === '--url') args.url = argv[++i]
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv)
  const h = await bootPage({ seed: args.seed, url: args.url })
  try {
    if (args.play) await startRun(h.page)
    await pump(h.page, args.frames)
    const png = await shootCanvas(h.page)
    writeFileSync(args.out, png)
    console.log(
      `captured ${args.out} (seed=${args.seed}, frames=${args.frames}, play=${args.play})`
    )
  } finally {
    await h.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
