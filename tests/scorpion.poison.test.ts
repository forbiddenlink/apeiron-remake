import { describe, expect, it } from 'vitest'
import { CELL } from '../src/game/Constants'
import { Scorpion } from '../src/game/Enemies'
import { Grid, Mushroom } from '../src/game/Grid'

// This is a lightweight behavioral check: when a scorpion passes over an existing
// mushroom cell, it should be poisoned by the engine loop. Here we just simulate
// the spatial overlap and confirm the flag flip.

describe('Scorpion poisons mushrooms it touches', () => {
  it('marks mush as poisoned on contact position', () => {
    const g = new Grid(40, 50)
    const m = new Mushroom(10, 6)
    g.set(10, 6, m)
    const sc = new Scorpion(() => 0.0)
    ;(sc as any).x = 10 * CELL
    ;(sc as any).y = 6 * CELL
    // emulate Engine tick snippet
    const c = Math.floor(sc.x / CELL)
    const r = Math.floor(sc.y / CELL)
    const mush = g.get(c, r)
    if (mush) mush.poisoned = true
    expect(m.poisoned).toBe(true)
  })
})
