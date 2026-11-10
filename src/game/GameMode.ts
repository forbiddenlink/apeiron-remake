import { DENSITY, PLAYER_ROWS, PSYCHEDELIC, REFLECTED_BULLET, ROWS } from './Constants'
import { TIMERS } from './GameConfig'

export type GameMode = 'classic' | 'enhanced'

export const DEFAULT_GAME_MODE: GameMode = 'classic'

export interface LevelTuning {
  mushroomDensity: number
  centipedeLength: number
  spiderMin: number
  spiderMax: number
  geckoMin: number
  geckoMax: number
}

// Classic Scobster gap, counted only while no Scobster is on screen. Footage shows
// one at a time, 8-28s between appearances in a wave; a Scobster lives ~2-5s.
const CLASSIC_SCOBSTER_GAP = { MIN: 8, MAX: 20, MIN_FLOOR: 4, MAX_FLOOR: 10 } as const

const CLASSIC_GECKO_GAP = { MIN: 14, MAX: 26, MIN_FLOOR: 8, MAX_FLOOR: 14 } as const

function getClassicTuning(level: number): LevelTuning {
  const l = Math.max(1, level)
  return {
    mushroomDensity: 0.14 + Math.min(0.13, (l - 1) * 0.018),
    centipedeLength: Math.min(16, 10 + Math.floor(l * 2)),
    spiderMin: Math.max(CLASSIC_SCOBSTER_GAP.MIN_FLOOR, CLASSIC_SCOBSTER_GAP.MIN - (l - 1) * 0.3),
    spiderMax: Math.max(CLASSIC_SCOBSTER_GAP.MAX_FLOOR, CLASSIC_SCOBSTER_GAP.MAX - (l - 1) * 0.8),
    // Gordon was arriving 5 to 6 times a minute on wave 1 (bot simulation), which
    // made a 1,000-point enemy the main source of score. Roughly halved here. No
    // source gives the original's rate, so this is remake tuning.
    geckoMin: Math.max(CLASSIC_GECKO_GAP.MIN_FLOOR, CLASSIC_GECKO_GAP.MIN - (l - 1) * 0.4),
    geckoMax: Math.max(CLASSIC_GECKO_GAP.MAX_FLOOR, CLASSIC_GECKO_GAP.MAX - (l - 1) * 0.8),
  }
}

export function getLevelTuning(level: number, mode: GameMode): LevelTuning {
  const classic = getClassicTuning(level)
  if (mode === 'classic') return classic

  const l = Math.max(1, level)
  return {
    mushroomDensity: Math.min(0.34, classic.mushroomDensity + 0.03),
    centipedeLength: Math.min(20, classic.centipedeLength + 2),
    spiderMin: Math.max(1.1, Math.max(1.5, TIMERS.SPAWN_SPIDER_MIN - l * 0.2) * 0.82),
    spiderMax: Math.max(2.2, Math.max(3.0, TIMERS.SPAWN_SPIDER_MAX - l * 0.3) * 0.82),
    // Enhanced keeps its original, busier gecko cadence.
    geckoMin: Math.max(2.2, Math.max(3.0, TIMERS.SPAWN_GECKO_MIN - l * 0.25) * 0.82),
    geckoMax: Math.max(4.2, Math.max(6.0, TIMERS.SPAWN_GECKO_MAX - l * 0.4) * 0.82),
  }
}

export function getFallingMushroomChance(level: number, mode: GameMode): number {
  const classicChance = Math.min(0.25, 0.04 + Math.max(1, level) * 0.01)
  if (mode === 'classic') return classicChance
  return Math.min(0.4, classicChance * 1.45)
}

export function getTouchdownRules(mode: GameMode): { segmentCap: number; friendCooldown: number } {
  if (mode === 'classic') {
    return { segmentCap: 42, friendCooldown: 1.4 }
  }
  return { segmentCap: 56, friendCooldown: 0.9 }
}

export function usesModernScoring(mode: GameMode): boolean {
  return mode === 'enhanced'
}

// The separate score-coin/frenzy system is an Enhanced addition. It is distinct
// from Apeiron's Yummy coins, which are represented by PowerUp in both modes.
export function spawnsCoins(mode: GameMode): boolean {
  return mode === 'enhanced'
}

export function usesPsychedelicMushrooms(level: number, mode: GameMode): boolean {
  void mode
  return level >= PSYCHEDELIC.START_WAVE
}

// Reflecting mushrooms are an original Apeiron mechanic (two independent reviews
// describe late-game mushrooms that bounce the shot back), so both modes use
// them. `enabled` is the player's Options toggle. The start wave is calibration.
export function usesReflectiveMushrooms(level: number, mode: GameMode, enabled = true): boolean {
  void mode
  return enabled && level >= REFLECTED_BULLET.START_WAVE
}

export function getReflectedSpeedMultiplier(mode: GameMode): number {
  return mode === 'classic'
    ? REFLECTED_BULLET.CLASSIC_SPEED_MULTIPLIER
    : REFLECTED_BULLET.SPEED_MULTIPLIER
}

// Reviews of the 1995 game say Yummy coins come out of destroyed mushrooms.
// Classic follows that. Enhanced also keeps its older enemy-kill drops.
export function enemiesDropYummies(mode: GameMode): boolean {
  return mode === 'enhanced'
}

export const ENHANCED_MAX_SCOBSTERS = 2

// The original guide says a Pentipede touchdown "invites his friends in to
// help celebrate", so reinforcements apply to both profiles.
// Classic holds the Scobster timer while one is alive, so they never stack.
export function tickScobsterSpawn(
  timer: number,
  dt: number,
  alive: number,
  mode: GameMode
): { timer: number; spawn: boolean } {
  if (mode === 'classic' && alive > 0) return { timer, spawn: false }
  // Enhanced stacks them, but never more than two at once, matching the cap the
  // touchdown reinforcements already use. This bounds the worst case; it does not
  // change the average rate, which is set by the Enhanced spawn window.
  if (mode === 'enhanced' && alive >= ENHANCED_MAX_SCOBSTERS) return { timer, spawn: false }
  const next = timer - dt
  return { timer: next, spawn: next <= 0 }
}

export function spawnsTouchdownFriends(_mode: GameMode): boolean {
  return true
}

export interface WaveComposition {
  mainLength: number
  loneHeads: number
}

// Canon Apeiron/Centipede: the main body starts at 12 segments and shrinks each
// wave (floored), while extra single-segment "heads" enter independently as waves
// climb. Higher waves get harder through more simultaneous heads + faster motion,
// not a longer body.
export function getWaveComposition(level: number, mode: GameMode): WaveComposition {
  const l = Math.max(1, level)
  const mainLength = Math.max(6, 12 - (l - 1))
  const loneHeads = Math.min(l - 1, 8)
  if (mode === 'classic') return { mainLength, loneHeads }
  // Enhanced: a longer main body and more heads for extra pressure.
  return {
    mainLength: Math.min(14, mainLength + 2),
    loneHeads: Math.min(loneHeads + 2, 12),
  }
}

// Groucho drops in when the bottom of the field runs low on mushrooms. The
// player zone itself is kept clear (nothing is seeded or planted there), so
// counting only the zone made the check true forever: a flea every cooldown for
// the whole game. The watched band is the zone plus the same number of rows
// above it, which is where the field actually thins out as you shoot.
export function fleaWatchRows(): { start: number; end: number } {
  return { start: ROWS - PLAYER_ROWS * 2, end: ROWS - 1 }
}

export function shouldSpawnFlea(mushroomsInWatchRows: number): boolean {
  return mushroomsInWatchRows < DENSITY.PLAYER_ROWS_MIN_MUSHES
}
