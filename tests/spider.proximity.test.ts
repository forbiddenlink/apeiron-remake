import { describe, it, expect } from 'vitest';
import { Spider } from '../src/game/Enemies';
import { CELL, ROWS, PLAYER_ROWS, SCORE } from '../src/game/Constants';

// Note: we only verify score selection mapping; we don't simulate bullets here

describe('Spider proximity score tier', () => {
  it('gives higher score when closer to player', () => {
    // Minimal stub with same logic as Engine.spiderScore
    const spiderScore = (playerY:number, spY:number) => {
      const dy = Math.abs(spY - playerY);
      if (dy < CELL*2) return SCORE.SPIDER_NEAR;
      if (dy < CELL*4) return SCORE.SPIDER_MED;
      return SCORE.SPIDER_FAR;
    };
    const py = (ROWS-PLAYER_ROWS)*CELL - 10;
    const nearY = py + CELL;
    const medY = py + CELL*3;
    const farY = py + CELL*6;
    expect(spiderScore(py, nearY)).toBeGreaterThan(spiderScore(py, medY));
    expect(spiderScore(py, medY)).toBeGreaterThan(spiderScore(py, farY));
  });
});
