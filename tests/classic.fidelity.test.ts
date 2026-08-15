import { describe, it, expect } from 'vitest';
import {
  spawnsCoins,
  usesPsychedelicMushrooms,
  usesReflectiveMushrooms
} from '../src/game/GameMode';
import { PSYCHEDELIC, REFLECTED_BULLET } from '../src/game/Constants';

// Classic Apeiron has no coins, no point-multiplier "psychedelic" mushrooms, and no
// bullet-reflecting mushrooms. These are modern-enhancement systems and must be gated
// entirely behind Enhanced mode so the Classic profile stays faithful (no gameplay drift).
describe('Classic mode fidelity: modern systems are Enhanced-only', () => {
  it('never spawns coins in classic mode, always allows them in enhanced', () => {
    expect(spawnsCoins('classic')).toBe(false);
    expect(spawnsCoins('enhanced')).toBe(true);
  });

  it('never uses psychedelic mushrooms in classic mode, at any wave', () => {
    for (const level of [1, PSYCHEDELIC.START_WAVE, PSYCHEDELIC.START_WAVE + 5, 30]) {
      expect(usesPsychedelicMushrooms(level, 'classic')).toBe(false);
    }
  });

  it('uses psychedelic mushrooms in enhanced mode only from START_WAVE onward', () => {
    expect(usesPsychedelicMushrooms(PSYCHEDELIC.START_WAVE - 1, 'enhanced')).toBe(false);
    expect(usesPsychedelicMushrooms(PSYCHEDELIC.START_WAVE, 'enhanced')).toBe(true);
    expect(usesPsychedelicMushrooms(PSYCHEDELIC.START_WAVE + 10, 'enhanced')).toBe(true);
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
});
