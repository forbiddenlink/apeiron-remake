import { TIMERS } from './GameConfig';

export type GameMode = 'classic' | 'enhanced';

export const DEFAULT_GAME_MODE: GameMode = 'classic';

export interface LevelTuning {
  mushroomDensity: number;
  centipedeLength: number;
  spiderMin: number;
  spiderMax: number;
  scorpionMin: number;
  scorpionMax: number;
}

function getClassicTuning(level: number): LevelTuning {
  const l = Math.max(1, level);
  return {
    mushroomDensity: 0.14 + Math.min(0.13, (l - 1) * 0.018),
    centipedeLength: Math.min(16, 10 + Math.floor(l * 2)),
    spiderMin: Math.max(1.5, TIMERS.SPAWN_SPIDER_MIN - l * 0.2),
    spiderMax: Math.max(3.0, TIMERS.SPAWN_SPIDER_MAX - l * 0.3),
    scorpionMin: Math.max(3.0, TIMERS.SPAWN_SCORPION_MIN - l * 0.25),
    scorpionMax: Math.max(6.0, TIMERS.SPAWN_SCORPION_MAX - l * 0.4)
  };
}

export function getLevelTuning(level: number, mode: GameMode): LevelTuning {
  const classic = getClassicTuning(level);
  if (mode === 'classic') return classic;

  return {
    mushroomDensity: Math.min(0.34, classic.mushroomDensity + 0.03),
    centipedeLength: Math.min(20, classic.centipedeLength + 2),
    spiderMin: Math.max(1.1, classic.spiderMin * 0.82),
    spiderMax: Math.max(2.2, classic.spiderMax * 0.82),
    scorpionMin: Math.max(2.2, classic.scorpionMin * 0.82),
    scorpionMax: Math.max(4.2, classic.scorpionMax * 0.82)
  };
}

export function getFallingMushroomChance(level: number, mode: GameMode): number {
  const classicChance = Math.min(0.25, 0.04 + Math.max(1, level) * 0.01);
  if (mode === 'classic') return classicChance;
  return Math.min(0.40, classicChance * 1.45);
}

export function getTouchdownRules(mode: GameMode): { segmentCap: number; friendCooldown: number } {
  if (mode === 'classic') {
    return { segmentCap: 42, friendCooldown: 1.4 };
  }
  return { segmentCap: 56, friendCooldown: 0.9 };
}

export function usesModernScoring(mode: GameMode): boolean {
  return mode === 'enhanced';
}
