#!/usr/bin/env node
/**
 * imagediff.mjs -- per-pixel PNG comparison gate.
 *
 * Exits non-zero on ANY pixel movement (like Claude-of-Duty's imagediff.mjs),
 * so it works as a hard regression gate rather than a soft assertion.
 *
 * Usage:
 *   node tools/imagediff.mjs baseline.png candidate.png [--diff out-diff.png] [--threshold 0]
 *
 * --threshold is pixelmatch color tolerance per pixel (0 = strictest).
 * The gate fails if ANY pixel differs beyond that tolerance.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

export function diffPng(baselineBuf, candidateBuf, { threshold = 0 } = {}) {
  const a = PNG.sync.read(baselineBuf)
  const b = PNG.sync.read(candidateBuf)
  if (a.width !== b.width || a.height !== b.height) {
    return {
      mismatch: Infinity,
      total: a.width * a.height,
      dimMismatch: true,
      message: `dimension mismatch: baseline ${a.width}x${a.height} vs candidate ${b.width}x${b.height}`,
      diff: null,
    }
  }
  const diff = new PNG({ width: a.width, height: a.height })
  const mismatch = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold,
    includeAA: true,
  })
  return { mismatch, total: a.width * a.height, dimMismatch: false, diff }
}

function parseArgs(argv) {
  const args = { baseline: null, candidate: null, diff: null, threshold: 0 }
  const positional = []
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--diff') args.diff = argv[++i]
    else if (a === '--threshold') args.threshold = Number(argv[++i])
    else positional.push(a)
  }
  args.baseline = positional[0]
  args.candidate = positional[1]
  return args
}

function main() {
  const args = parseArgs(process.argv)
  if (!args.baseline || !args.candidate) {
    console.error(
      'usage: imagediff.mjs baseline.png candidate.png [--diff out.png] [--threshold 0]'
    )
    process.exit(2)
  }
  const res = diffPng(readFileSync(args.baseline), readFileSync(args.candidate), {
    threshold: args.threshold,
  })
  if (res.dimMismatch) {
    console.error(res.message)
    process.exit(1)
  }
  if (args.diff && res.diff) writeFileSync(args.diff, PNG.sync.write(res.diff))
  if (res.mismatch > 0) {
    console.error(`FAIL: ${res.mismatch}/${res.total} pixels differ`)
    process.exit(1)
  }
  console.log(`OK: bit-identical (${res.total} pixels)`)
}

// Run only when invoked directly (not when imported by gate.mjs).
if (import.meta.url === `file://${process.argv[1]}`) main()
