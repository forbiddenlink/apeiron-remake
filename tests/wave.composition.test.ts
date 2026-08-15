import { describe, it, expect } from 'vitest';
import { getWaveComposition } from '../src/game/GameMode';

// Canon: main body starts at 12 and shrinks per wave (floored at 6); extra
// single-segment heads enter as waves climb (capped). Wave 1 must stay a single
// 12-segment centipede so early-game behavior (and VR baselines) are unchanged.
describe('Wave composition', () => {
  it('classic wave 1 is a single 12-segment body with no lone heads', () => {
    expect(getWaveComposition(1, 'classic')).toEqual({ mainLength: 12, loneHeads: 0 });
  });

  it('classic body shrinks and lone heads grow with the wave', () => {
    expect(getWaveComposition(2, 'classic')).toEqual({ mainLength: 11, loneHeads: 1 });
    expect(getWaveComposition(7, 'classic')).toEqual({ mainLength: 6, loneHeads: 6 });
  });

  it('classic floors the body at 6 and caps lone heads at 8', () => {
    const late = getWaveComposition(20, 'classic');
    expect(late.mainLength).toBe(6);
    expect(late.loneHeads).toBe(8);
  });

  it('enhanced is at least as aggressive as classic on both axes', () => {
    for (const level of [1, 4, 10]) {
      const c = getWaveComposition(level, 'classic');
      const e = getWaveComposition(level, 'enhanced');
      expect(e.mainLength).toBeGreaterThanOrEqual(c.mainLength);
      expect(e.loneHeads).toBeGreaterThanOrEqual(c.loneHeads);
    }
  });
});
