// Local top-10 table and the daily challenge seed. Pure helpers plus a thin
// localStorage wrapper; nothing here runs inside Engine.tick.
import type { GameMode } from './GameMode'

export interface ScoreEntry {
  score: number
  wave: number
  mode: GameMode
  date: string // YYYY-MM-DD, local
  seed: number
  daily: boolean
}

export const MAX_SCORES = 10
const STORAGE_KEY = 'apeiron_scores'

export function insertScore(table: ScoreEntry[], entry: ScoreEntry): ScoreEntry[] {
  if (!Number.isFinite(entry.score) || entry.score <= 0) return table.slice(0, MAX_SCORES)
  return [...table, entry].sort((a, b) => b.score - a.score).slice(0, MAX_SCORES)
}

export function qualifies(table: ScoreEntry[], score: number): boolean {
  if (score <= 0) return false
  return table.length < MAX_SCORES || score > table[table.length - 1].score
}

function isEntry(v: unknown): v is ScoreEntry {
  if (!v || typeof v !== 'object') return false
  const e = v as Record<string, unknown>
  return (
    typeof e.score === 'number' &&
    typeof e.wave === 'number' &&
    (e.mode === 'classic' || e.mode === 'enhanced') &&
    typeof e.date === 'string' &&
    typeof e.seed === 'number'
  )
}

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(isEntry)
      .map((e) => ({ ...e, daily: !!e.daily }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SCORES)
  } catch {
    return []
  }
}

export function saveScores(table: ScoreEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(table.slice(0, MAX_SCORES)))
  } catch {}
}

export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Same calendar day gives everyone the same field. FNV-1a over the date key.
export function dailySeed(d: Date): number {
  const key = `apeiron-daily-${dateKey(d)}`
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function formatSeed(seed: number): string {
  return (seed >>> 0).toString(16).toUpperCase().padStart(8, '0')
}
