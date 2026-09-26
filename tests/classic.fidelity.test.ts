import { describe, it, expect } from 'vitest';
import {
  spawnsCoins,
  spawnsTouchdownFriends,
  usesPsychedelicMushrooms,
  usesReflectiveMushrooms
} from '../src/game/GameMode';
import { PSYCHEDELIC, REFLECTED_BULLET } from '../src/game/Constants';

describe('Classic mode fidelity', () => {
  it('keeps the separate bonus-coin/frenzy system Enhanced-only', () => {
    expect(spawnsCoins('classic')).toBe(false);
    expect(spawnsCoins('enhanced')).toBe(true);
  });

  it('uses Apeiron psychedelic mushrooms in both modes from their configured wave', () => {
    for (const mode of ['classic', 'enhanced'] as const) {
      expect(usesPsychedelicMushrooms(PSYCHEDELIC.START_WAVE - 1, mode)).toBe(false);
      expect(usesPsychedelicMushrooms(PSYCHEDELIC.START_WAVE, mode)).toBe(true);
      expect(usesPsychedelicMushrooms(PSYCHEDELIC.START_WAVE + 10, mode)).toBe(true);
    }
  });

  it('never uses reflective mushrooms in classic mode, at any wave', () => {
    for (const level of [1, REFLECTED_BULLET.START_WAVE, REFLECTED_BULLET.START_WAVE + 5, 40]) {
      expect(usesReflectiveMushrooms(level, 'classic')).toBe(false);
    }
  });

  it('uses reflective mushrooms in enhanced mode only from START_WAVE onward', () => {
    expect(usesReflectiveMushrooms(REFLECTED_BULLET.START_WAVE - 1, 'enhanced')).toBe(false);
    expect(usesReflectiveMushrooms(REFLECTED_BULLET.START_WAVE, 'enhanced')).toBe(true);
    expect(usesReflectiveMushrooms(REFLECTED_BULLET.START_WAVE + 10, 'enhanced')).toBe(true);
  });

  it('spawns reinforcements after a touchdown in both modes', () => {
    expect(spawnsTouchdownFriends('classic')).toBe(true);
    expect(spawnsTouchdownFriends('enhanced')).toBe(true);
  });
});
