import { describe, it, expect } from 'vitest';
import { getScobsterDistance, getScobsterScore } from '../src/game/Enemies';
import { CELL, SCORE } from '../src/game/Constants';

// Note: we only verify score selection mapping; we don't simulate bullets here

describe('Spider proximity score tier', () => {
  it('gives higher score when closer to player', () => {
    expect(getScobsterScore(CELL)).toBe(SCORE.SPIDER_NEAR);
    expect(getScobsterScore(CELL * 3)).toBe(SCORE.SPIDER_MED);
    expect(getScobsterScore(CELL * 6)).toBe(SCORE.SPIDER_FAR);
    expect(getScobsterScore(CELL * 2)).toBe(SCORE.SPIDER_MED);
    expect(getScobsterScore(CELL * 4)).toBe(SCORE.SPIDER_FAR);
  });

  it('uses center-to-center distance, so horizontal separation lowers the score too', () => {
    const player = { x: 100, y: 100, w: CELL, h: CELL };
    const horizontal = { x: 100 + CELL * 2, y: 100, w: CELL, h: CELL };
    const diagonal = { x: 100 + CELL * 2, y: 100 + CELL * 2, w: CELL, h: CELL };

    expect(getScobsterScore(getScobsterDistance(player, horizontal))).toBe(SCORE.SPIDER_MED);
    expect(getScobsterScore(getScobsterDistance(player, diagonal))).toBe(SCORE.SPIDER_MED);
  });
});
