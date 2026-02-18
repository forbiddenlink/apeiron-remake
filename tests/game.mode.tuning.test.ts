import { describe, it, expect } from 'vitest';
import {
  DEFAULT_GAME_MODE,
  getFallingMushroomChance,
  getLevelTuning,
  getTouchdownRules,
  usesModernScoring
} from '../src/game/GameMode';

describe('Game mode tuning', () => {
  it('defaults to classic mode', () => {
    expect(DEFAULT_GAME_MODE).toBe('classic');
    expect(usesModernScoring('classic')).toBe(false);
    expect(usesModernScoring('enhanced')).toBe(true);
  });

  it('preserves classic level tuning and makes enhanced more aggressive', () => {
    const classic = getLevelTuning(6, 'classic');
    const enhanced = getLevelTuning(6, 'enhanced');

    expect(enhanced.mushroomDensity).toBeGreaterThan(classic.mushroomDensity);
    expect(enhanced.centipedeLength).toBeGreaterThanOrEqual(classic.centipedeLength);
    expect(enhanced.spiderMin).toBeLessThanOrEqual(classic.spiderMin);
    expect(enhanced.spiderMax).toBeLessThanOrEqual(classic.spiderMax);
    expect(enhanced.scorpionMin).toBeLessThanOrEqual(classic.scorpionMin);
    expect(enhanced.scorpionMax).toBeLessThanOrEqual(classic.scorpionMax);
  });

  it('uses stricter touchdown and falling mushroom rules in enhanced mode', () => {
    const classicTouchdown = getTouchdownRules('classic');
    const enhancedTouchdown = getTouchdownRules('enhanced');

    expect(classicTouchdown.segmentCap).toBe(42);
    expect(classicTouchdown.friendCooldown).toBe(1.4);
    expect(enhancedTouchdown.segmentCap).toBeGreaterThan(classicTouchdown.segmentCap);
    expect(enhancedTouchdown.friendCooldown).toBeLessThan(classicTouchdown.friendCooldown);

    const cChance = getFallingMushroomChance(10, 'classic');
    const eChance = getFallingMushroomChance(10, 'enhanced');
    expect(eChance).toBeGreaterThan(cChance);
  });
});
