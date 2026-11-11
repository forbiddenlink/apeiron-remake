import type { GameMode } from './game/GameMode'

export interface GameSettings {
  gameMode: GameMode
  musicVolume: number
  sfxVolume: number
  particleDensity: 'low' | 'medium' | 'high'
  screenShake: boolean
  showHitboxes: boolean
  showFPS: boolean
  reduceFlashing: boolean
  reflectingMushrooms: boolean
  relativeMouse: boolean
  movingBackdrops: boolean
  sprites3d: boolean
}

const STORAGE_KEY = 'apeiron_settings'

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function defaultSettings(): GameSettings {
  return {
    gameMode: 'classic', // Classic is the documented default (see README / design doc)
    musicVolume: 50,
    sfxVolume: 80,
    particleDensity: 'low',
    screenShake: false,
    showHitboxes: false,
    showFPS: false,
    reduceFlashing: prefersReducedMotion(),
    reflectingMushrooms: true,
    relativeMouse: false,
    movingBackdrops: !prefersReducedMotion(),
    sprites3d: true,
  }
}

function isTestHarness(): boolean {
  return !!(window as unknown as { __APEIRON_TEST__?: boolean }).__APEIRON_TEST__
}

function clampVolume(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : fallback
}

// Merges whatever was saved over the defaults, field by field, so a setting
// added later (or a hand-edited value) can never produce an invalid object.
export function mergeSettings(base: GameSettings, saved: unknown): GameSettings {
  if (!saved || typeof saved !== 'object') return base
  const s = saved as Record<string, unknown>
  const bool = (key: keyof GameSettings) =>
    typeof s[key] === 'boolean' ? (s[key] as boolean) : (base[key] as boolean)
  return {
    gameMode: s.gameMode === 'classic' || s.gameMode === 'enhanced' ? s.gameMode : base.gameMode,
    musicVolume: clampVolume(s.musicVolume, base.musicVolume),
    sfxVolume: clampVolume(s.sfxVolume, base.sfxVolume),
    particleDensity:
      s.particleDensity === 'low' || s.particleDensity === 'medium' || s.particleDensity === 'high'
        ? s.particleDensity
        : base.particleDensity,
    screenShake: bool('screenShake'),
    showHitboxes: bool('showHitboxes'),
    showFPS: bool('showFPS'),
    reduceFlashing: bool('reduceFlashing'),
    reflectingMushrooms: bool('reflectingMushrooms'),
    relativeMouse: bool('relativeMouse'),
    movingBackdrops: bool('movingBackdrops'),
    sprites3d: bool('sprites3d'),
  }
}

export function loadSettings(): GameSettings {
  const base = defaultSettings()
  // The headless harness must always boot from the same settings.
  if (isTestHarness()) return base
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? mergeSettings(base, JSON.parse(raw)) : base
  } catch {
    return base
  }
}

export function saveSettings(settings: GameSettings): void {
  if (isTestHarness()) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {}
}
