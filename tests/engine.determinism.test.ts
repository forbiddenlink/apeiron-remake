import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// ARCHITECTURE.md: gameplay must be a pure function of previous state, the
// seeded RNG, and input, with no wall-clock reads inside Engine.tick. Wall
// clock is allowed only where the frame loop measures real time (loop) and in
// the FPS readout. This fails the moment another method starts reading it.

const source = readFileSync(path.join(process.cwd(), 'src/game/Engine.ts'), 'utf8')

function methodOf(index: number): string {
  const before = source.slice(0, index)
  const matches = [...before.matchAll(/^ {2}(?:private |public |static )*(\w+)\s*\(/gm)]
  return matches.at(-1)?.[1] ?? '<module>'
}

describe('Engine determinism', () => {
  it('reads the wall clock only in the frame loop and the FPS readout', () => {
    const readers = [...source.matchAll(/performance\.now\(\)|Date\.now\(\)/g)].map((m) =>
      methodOf(m.index ?? 0)
    )
    const allowed = new Set(['loop', 'start', 'drawHud', 'draw'])
    expect(readers.filter((name) => !allowed.has(name))).toEqual([])
  })
})
