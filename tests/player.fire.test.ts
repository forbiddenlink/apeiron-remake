import { describe, expect, it } from 'vitest'
import { CELL, ROWS, TIMERS } from '../src/game/Constants'
import { Bullet, Player } from '../src/game/Player'

function activeCount(p: Player) {
  return p.bullets.filter((b) => b.active).length
}

describe('Player firing rules', () => {
  it('limits to one bullet when not in autofire', () => {
    const p = new Player()
    const keys = new Set<string>(['Space'])
    // initial fire
    p.update(0, keys)
    expect(activeCount(p)).toBe(1)
    // after normal cooldown, still one because single-shot rule while first is active
    p.update(TIMERS.FIRE_COOLDOWN, keys)
    expect(activeCount(p)).toBe(1)
    // deactivate current bullet and allow another shot
    const b = p.bullets.find((bb) => bb.active)!
    b.y = -9 // will be culled next update
    p.update(0.016, new Set())
    expect(activeCount(p)).toBe(0)
    p.update(TIMERS.FIRE_COOLDOWN, keys)
    expect(activeCount(p)).toBe(1)
  })

  it('allows multiple bullets with autofire active', () => {
    const p = new Player()
    const keys = new Set<string>(['Space'])
    p.autofireTime = 0.5
    // fire a few times across autofire cooldowns
    p.update(0, keys) // first shot
    p.update(TIMERS.AUTOFIRE_COOLDOWN, keys) // second shot
    p.update(TIMERS.AUTOFIRE_COOLDOWN, keys) // third shot
    expect(activeCount(p)).toBeGreaterThanOrEqual(2)
  })

  it('turns guided shots toward a target without changing their speed', () => {
    const bullet = new Bullet()
    bullet.active = true
    bullet.isGuided = true
    bullet.vx = 0
    bullet.vy = -640

    bullet.steerToward(100, 0, 0.1)

    expect(bullet.vx).toBeGreaterThan(0)
    expect(bullet.vy).toBeLessThan(0)
    expect(Math.hypot(bullet.vx, bullet.vy)).toBeCloseTo(640)
  })

  it('retires guided shots that have turned below the field', () => {
    const bullet = new Bullet()
    bullet.active = true
    bullet.y = ROWS * CELL + 9

    bullet.update(0)

    expect(bullet.active).toBe(false)
  })
})
