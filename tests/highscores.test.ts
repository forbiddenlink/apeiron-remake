import { describe, expect, it } from 'vitest'
import {
  dailySeed,
  dateKey,
  formatSeed,
  insertScore,
  MAX_SCORES,
  qualifies,
  type ScoreEntry,
} from '../src/game/HighScores'
import { accuracyPercent, newRunStats } from '../src/game/RunStats'
import { defaultSettings, mergeSettings } from '../src/settings'
import { installFakeDom } from './helpers/fakeDom'

const entry = (score: number): ScoreEntry => ({
  score,
  wave: 1,
  mode: 'classic',
  date: '2026-11-10',
  seed: 1,
  daily: false,
})

describe('High score table', () => {
  it('keeps the ten best, highest first', () => {
    let table: ScoreEntry[] = []
    for (let i = 1; i <= 14; i++) table = insertScore(table, entry(i * 100))
    expect(table.length).toBe(MAX_SCORES)
    expect(table[0].score).toBe(1400)
    expect(table[MAX_SCORES - 1].score).toBe(500)
  })

  it('ignores empty runs', () => {
    expect(insertScore([], entry(0))).toEqual([])
    expect(qualifies([], 0)).toBe(false)
    expect(qualifies([], 10)).toBe(true)
  })
})

describe('Daily challenge seed', () => {
  it('is the same all day and different the next day', () => {
    const morning = new Date(2026, 10, 10, 8, 0)
    const night = new Date(2026, 10, 10, 23, 59)
    const tomorrow = new Date(2026, 10, 11, 0, 1)
    expect(dateKey(morning)).toBe('2026-11-10')
    expect(dailySeed(morning)).toBe(dailySeed(night))
    expect(dailySeed(morning)).not.toBe(dailySeed(tomorrow))
    expect(formatSeed(dailySeed(morning))).toMatch(/^[0-9A-F]{8}$/)
  })
})

describe('Run stats', () => {
  it('reports accuracy as a whole percent and never divides by zero', () => {
    const stats = newRunStats()
    expect(accuracyPercent(stats)).toBe(0)
    stats.shots = 8
    stats.hits = 6
    expect(accuracyPercent(stats)).toBe(75)
  })
})

describe('Saved settings', () => {
  it('fills in new fields and rejects bad values', () => {
    installFakeDom()
    const base = defaultSettings()
    const merged = mergeSettings(base, {
      gameMode: 'enhanced',
      musicVolume: 400,
      particleDensity: 'ludicrous',
      reduceFlashing: 'yes',
    })
    expect(merged.gameMode).toBe('enhanced')
    expect(merged.musicVolume).toBe(100)
    expect(merged.particleDensity).toBe(base.particleDensity)
    expect(merged.reduceFlashing).toBe(base.reduceFlashing)
    expect(merged.reflectingMushrooms).toBe(true)
    expect(mergeSettings(base, 'garbage')).toEqual(base)
  })
})
