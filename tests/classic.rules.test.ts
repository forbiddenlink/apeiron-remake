import { describe, it, expect } from 'vitest';
import { SCORE, EXTRA_LIFE_STEP, POWERUPS } from '../src/game/Constants';


describe('Classic Apeiron rule constants', () => {
  it('matches key score values from classic references', () => {
    expect(SCORE.POISON_MUSHROOM_HIT).toBe(5);
    expect(SCORE.SCORPION).toBe(1500);
    expect(SCORE.SPACESHIP_MIN).toBe(500);
    expect(SCORE.SPACESHIP_MAX).toBe(3000);
    expect(EXTRA_LIFE_STEP).toBe(20000);
  });

  it('uses the classic Yummy set', () => {
    expect(POWERUPS.TYPES).toEqual([
      'guided',
      'diamond',
      'machine_gun',
      'shield',
      'lock',
      'house_cleaning',
      'extra_man'
    ]);
  });
});
