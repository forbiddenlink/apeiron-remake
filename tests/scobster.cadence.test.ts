import { describe, expect, it } from 'vitest'
import { getLevelTuning, tickScobsterSpawn } from '../src/game/GameMode'

// Observed in original footage (youtube.com/watch?v=irQzOwsLlok) and the Apeiron X
// port (youtube.com/watch?v=yG6W0hnXdPw): Larry the Scobster never shares the screen
// with a second Scobster, and appearances in the same wave are 8-28s apart.

describe('Classic Scobster cadence', () => {
  it('holds the spawn timer while a Scobster is on screen', () => {
    const r = tickScobsterSpawn(0.5, 1, 1, 'classic')
    expect(r.timer).toBe(0.5)
    expect(r.spawn).toBe(false)
  })

  it('counts down and spawns once the screen is clear', () => {
    expect(tickScobsterSpawn(2, 1, 0, 'classic')).toEqual({ timer: 1, spawn: false })
    expect(tickScobsterSpawn(0.5, 1, 0, 'classic').spawn).toBe(true)
  })

  it('uses gaps in the observed range on wave 1 and keeps a floor later', () => {
    const w1 = getLevelTuning(1, 'classic')
    expect(w1.spiderMin).toBeGreaterThanOrEqual(6)
    expect(w1.spiderMax).toBeGreaterThanOrEqual(15)
    expect(w1.spiderMax).toBeLessThanOrEqual(25)

    const w12 = getLevelTuning(12, 'classic')
    expect(w12.spiderMin).toBeGreaterThanOrEqual(4)
    expect(w12.spiderMax).toBeGreaterThan(w12.spiderMin)
  })
})

describe('Enhanced Scobster cadence', () => {
  it('still stacks Scobsters', () => {
    expect(tickScobsterSpawn(0.5, 1, 1, 'enhanced').spawn).toBe(true)
  })

  it('keeps its pre-calibration spawn window', () => {
    const e6 = getLevelTuning(6, 'enhanced')
    expect(e6.spiderMin).toBeCloseTo(3.8 * 0.82)
    expect(e6.spiderMax).toBeCloseTo(8.2 * 0.82)
  })
})
