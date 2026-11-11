import { describe, expect, it } from 'vitest'
import { POWERUPS, PSYCHEDELIC, REFLECTED_BULLET } from '../src/game/Constants'
import {
  enemiesDropYummies,
  getReflectedSpeedMultiplier,
  spawnsCoins,
  spawnsTouchdownFriends,
  usesPsychedelicMushrooms,
  usesReflectiveMushrooms,
} from '../src/game/GameMode'

describe('Classic mode fidelity', () => {
  it('keeps the separate bonus-coin/frenzy system Enhanced-only', () => {
    expect(spawnsCoins('classic')).toBe(false)
    expect(spawnsCoins('enhanced')).toBe(true)
  })

  it('uses Apeiron psychedelic mushrooms in both modes from their configured wave', () => {
    for (const mode of ['classic', 'enhanced'] as const) {
      expect(usesPsychedelicMushrooms(PSYCHEDELIC.START_WAVE - 1, mode)).toBe(false)
      expect(usesPsychedelicMushrooms(PSYCHEDELIC.START_WAVE, mode)).toBe(true)
      expect(usesPsychedelicMushrooms(PSYCHEDELIC.START_WAVE + 10, mode)).toBe(true)
    }
  })

  // Two independent reviews of the original describe late-game mushrooms that
  // bounce the shot back, so reflecting mushrooms are not Enhanced-only.
  it('uses reflective mushrooms in both modes from START_WAVE onward', () => {
    for (const mode of ['classic', 'enhanced'] as const) {
      expect(usesReflectiveMushrooms(REFLECTED_BULLET.START_WAVE - 1, mode)).toBe(false)
      expect(usesReflectiveMushrooms(REFLECTED_BULLET.START_WAVE, mode)).toBe(true)
      expect(usesReflectiveMushrooms(REFLECTED_BULLET.START_WAVE + 10, mode)).toBe(true)
    }
  })

  it('never uses reflective mushrooms when the player turns them off', () => {
    for (const mode of ['classic', 'enhanced'] as const) {
      for (const level of [1, REFLECTED_BULLET.START_WAVE, 40]) {
        expect(usesReflectiveMushrooms(level, mode, false)).toBe(false)
      }
    }
  })

  it('returns a reflected shot at its own speed in classic and faster in enhanced', () => {
    expect(getReflectedSpeedMultiplier('classic')).toBe(1)
    expect(getReflectedSpeedMultiplier('enhanced')).toBeGreaterThan(1)
  })

  it('drops Yummies from enemies only in enhanced; classic gets them from mushrooms', () => {
    expect(enemiesDropYummies('classic')).toBe(false)
    expect(enemiesDropYummies('enhanced')).toBe(true)
    expect(POWERUPS.MUSHROOM_DROP_CHANCE).toBeGreaterThan(0)
  })

  it('spawns reinforcements after a touchdown in both modes', () => {
    expect(spawnsTouchdownFriends('classic')).toBe(true)
    expect(spawnsTouchdownFriends('enhanced')).toBe(true)
  })
})
