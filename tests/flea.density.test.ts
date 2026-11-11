import { describe, expect, it } from 'vitest'
import { COLS, DENSITY, PLAYER_ROWS, ROWS } from '../src/game/Constants'
import { fleaWatchRows, shouldSpawnFlea } from '../src/game/GameMode'
import { Grid, Mushroom } from '../src/game/Grid'

function countMushesInPlayerRows(grid: Grid) {
  const start = ROWS - PLAYER_ROWS
  let n = 0
  for (let r = start; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid.get(c, r)) n++
    }
  }
  return n
}

describe('Flea density heuristic', () => {
  it('detects low mushroom density in player rows', () => {
    const g = new Grid(COLS, ROWS)
    // ensure fewer than threshold
    const need = Math.max(0, DENSITY.PLAYER_ROWS_MIN_MUSHES - 1)
    for (let i = 0; i < need; i++) {
      g.set(i, ROWS - 1, new Mushroom(i, ROWS - 1))
    }
    const n = countMushesInPlayerRows(g)
    expect(n).toBeLessThan(DENSITY.PLAYER_ROWS_MIN_MUSHES)
  })

  it('watches the player zone plus the band above it, where mushrooms can actually be', () => {
    const watch = fleaWatchRows()
    expect(watch.end).toBe(ROWS - 1)
    expect(watch.start).toBe(ROWS - PLAYER_ROWS * 2)
  })

  it('stays quiet while the bottom of the field is stocked and fires once it thins out', () => {
    const g = new Grid(COLS, ROWS)
    const watch = fleaWatchRows()
    // Mushrooms just above the (always empty) player zone, as a fresh wave has.
    for (let c = 0; c < DENSITY.PLAYER_ROWS_MIN_MUSHES; c++) {
      g.set(c * 3, watch.start, new Mushroom(c * 3, watch.start))
    }
    expect(shouldSpawnFlea(g.countInRows(watch.start, watch.end))).toBe(false)
    g.set(0, watch.start, null)
    expect(shouldSpawnFlea(g.countInRows(watch.start, watch.end))).toBe(true)
  })
})
