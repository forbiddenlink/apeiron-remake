import { describe, expect, it } from 'vitest'
import { POWERUPS } from '../src/game/Constants'
import { getBonusMultiplierAward, MAX_BONUS_SCORE } from '../src/game/Engine'

describe('Multiplier Yummy', () => {
  it('adds enough score to multiply the tracked Bonus total', () => {
    const bonus = 640
    const award = getBonusMultiplierAward(bonus)

    expect(award.score).toBe(bonus * (POWERUPS.BONUS_MULTIPLIER - 1))
    expect(award.bonus).toBe(bonus * POWERUPS.BONUS_MULTIPLIER)
  })

  it('does not deduct score when no Bonus has been earned', () => {
    expect(getBonusMultiplierAward(0)).toEqual({ bonus: 0, score: 0 })
  })

  it('does not let repeated multipliers exceed the Bonus cap', () => {
    expect(getBonusMultiplierAward(MAX_BONUS_SCORE)).toEqual({
      bonus: MAX_BONUS_SCORE,
      score: 0,
    })
    expect(getBonusMultiplierAward(60_000)).toEqual({
      bonus: MAX_BONUS_SCORE,
      score: MAX_BONUS_SCORE - 60_000,
    })
  })

  it('credits a psychedelic multiplier award at ten times the score value', () => {
    const award = getBonusMultiplierAward(640, 10)

    expect(award.bonus).toBe(640 * POWERUPS.BONUS_MULTIPLIER)
    expect(award.score).toBe(640 * (POWERUPS.BONUS_MULTIPLIER - 1) * 10)
  })
})
