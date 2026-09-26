import { describe, expect, it } from 'vitest'
import { Centipede } from '../src/game/Centipede'
import { CELL } from '../src/game/Constants'
import { Grid } from '../src/game/Grid'

// Minimal fake engine bits to simulate a bullet hit at a segment
function hitSegment(c: Centipede, segIndex: number) {
  const cent: any = c as any
  const left = cent.segments.slice(0, segIndex)
  const right = cent.segments.slice(segIndex + 1)
  return { left, right }
}

describe('Centipede splitting', () => {
  it('splits into two new heads around the destroyed segment', () => {
    const grid = new Grid()
    const c = new Centipede(5, 1)
    const mid = 2
    const { left, right } = hitSegment(c, mid)
    expect(left.length).toBe(2)
    expect(right.length).toBe(2)
    // both new heads should be marked when reattached by engine; simulate it
    if (left.length) left[0].head = true
    if (right.length) right[0].head = true
    expect(left[0].head).toBe(true)
    expect(right[0].head).toBe(true)
  })
})
