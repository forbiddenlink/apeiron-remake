import { describe, expect, it } from 'vitest'
import { CLASSIC_BONUS, POWERUPS } from '../src/game/Constants'
import { getBonusMultiplierAward, tickClassicBonus } from '../src/game/Engine'

// Observed in original 1995 Apeiron footage (youtube.com/watch?v=irQzOwsLlok):
// Bonus reads 1960 at 0:01.6 of wave 1 and 1970 just after wave 2 starts, then
// falls in steps of 10 (1310 -> 1270 over 1.6s). Picking up a Multiplier at
// 0:27-0:29 took Bonus from ~1240 to 3710 while Score only moved 1056 -> 1139.

describe('Classic Bonus countdown', () => {
  it('starts each wave at 2000 and ticks down in steps of 10', () => {
    expect(CLASSIC_BONUS.START).toBe(2000)
    expect(CLASSIC_BONUS.STEP).toBe(10)

    const once = tickClassicBonus(CLASSIC_BONUS.START, 0, CLASSIC_BONUS.STEP_SECONDS)
    expect(once.bonus).toBe(1990)
    expect(once.carry).toBeCloseTo(0)
  })

  it('counts down at roughly the observed 25-30 points per second', () => {
    let state = { bonus: CLASSIC_BONUS.START, carry: 0 }
    for (let i = 0; i < 60; i++) state = tickClassicBonus(state.bonus, state.carry, 1 / 60)
    const perSecond = CLASSIC_BONUS.START - state.bonus
    expect(perSecond).toBeGreaterThanOrEqual(20)
    expect(perSecond).toBeLessThanOrEqual(30)
  })

  it('never goes below zero', () => {
    expect(tickClassicBonus(10, 0, 10).bonus).toBe(0)
    expect(tickClassicBonus(0, 0, 1).bonus).toBe(0)
  })
})

describe('Classic Multiplier Yummy', () => {
  it('triples the Bonus, as observed in the original', () => {
    expect(POWERUPS.BONUS_MULTIPLIER).toBe(3)
    expect(getBonusMultiplierAward(1240, 1, false).bonus).toBe(3720)
  })

  it('does not pay Score directly; the Bonus is banked at wave end', () => {
    expect(getBonusMultiplierAward(1240, 1, false).score).toBe(0)
    expect(getBonusMultiplierAward(1240, 10, false).score).toBe(0)
  })
})
