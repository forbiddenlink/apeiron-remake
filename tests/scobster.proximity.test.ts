import { describe, expect, it } from 'vitest'
import { CELL, SCORE } from '../src/game/Constants'
import { getScobsterDistance, getScobsterScore } from '../src/game/Enemies'

// The 1995 Apeiron FAQ scores table lists "Scorpion 1500" with the note that
// 1500 is the most it is worth and closer kills score more; its tips section
// gives the same rule for "the Scobster". They are one enemy: Larry the
// Scobster, Apeiron's take on Centipede's spider.

describe('Larry the Scobster proximity score', () => {
  it('is worth at most 1500, per the 1995 FAQ', () => {
    expect(getScobsterScore(0)).toBe(1500)
    expect(Math.max(SCORE.SCOBSTER_NEAR, SCORE.SCOBSTER_MED, SCORE.SCOBSTER_FAR)).toBe(1500)
  })

  it('gives higher score when closer to player', () => {
    expect(getScobsterScore(CELL)).toBe(SCORE.SCOBSTER_NEAR)
    expect(getScobsterScore(CELL * 3)).toBe(SCORE.SCOBSTER_MED)
    expect(getScobsterScore(CELL * 6)).toBe(SCORE.SCOBSTER_FAR)
    expect(getScobsterScore(CELL * 2)).toBe(SCORE.SCOBSTER_MED)
    expect(getScobsterScore(CELL * 4)).toBe(SCORE.SCOBSTER_FAR)
    expect(SCORE.SCOBSTER_NEAR).toBeGreaterThan(SCORE.SCOBSTER_MED)
    expect(SCORE.SCOBSTER_MED).toBeGreaterThan(SCORE.SCOBSTER_FAR)
  })

  it('uses center-to-center distance, so horizontal separation lowers the score too', () => {
    const player = { x: 100, y: 100, w: CELL, h: CELL }
    const horizontal = { x: 100 + CELL * 2, y: 100, w: CELL, h: CELL }
    const diagonal = { x: 100 + CELL * 2, y: 100 + CELL * 2, w: CELL, h: CELL }

    expect(getScobsterScore(getScobsterDistance(player, horizontal))).toBe(SCORE.SCOBSTER_MED)
    expect(getScobsterScore(getScobsterDistance(player, diagonal))).toBe(SCORE.SCOBSTER_MED)
  })
})
