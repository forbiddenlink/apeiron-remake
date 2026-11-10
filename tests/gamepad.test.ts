import { describe, expect, it } from 'vitest'
import { type PadLike, readGamepad } from '../src/game/Gamepad'

function pad(axes: number[], pressed: number[] = []): PadLike {
  return {
    axes,
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })),
  }
}

describe('Gamepad mapping', () => {
  it('reports nothing without a controller', () => {
    expect(readGamepad(null).active).toBe(false)
  })

  it('ignores stick drift inside the deadzone', () => {
    const input = readGamepad(pad([0.1, -0.15]))
    expect(input.x).toBe(0)
    expect(input.y).toBe(0)
    expect(input.active).toBe(false)
  })

  it('reaches full speed at full deflection and never exceeds it on a diagonal', () => {
    expect(readGamepad(pad([1, 0])).x).toBeCloseTo(1)
    const diagonal = readGamepad(pad([1, 1]))
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1)
  })

  it('lets the d-pad override the stick', () => {
    const input = readGamepad(pad([0.9, 0], [14]))
    expect(input.x).toBe(-1)
  })

  it('fires on a face button and pauses on Start', () => {
    expect(readGamepad(pad([0, 0], [0])).fire).toBe(true)
    expect(readGamepad(pad([0, 0], [0])).active).toBe(true)
    expect(readGamepad(pad([0, 0], [9])).pause).toBe(true)
    expect(readGamepad(pad([0, 0], [9])).fire).toBe(false)
  })
})
