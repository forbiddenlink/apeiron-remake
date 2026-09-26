import { describe, expect, it } from 'vitest'
import { Player } from '../src/game/Player'

describe('Player lock carry-over snapshot', () => {
  it('restores active powerups and autofire timer', () => {
    const p = new Player()
    p.addPowerUp('machine_gun')
    p.addPowerUp('lock')

    const snap = p.getPowerUpSnapshot()
    expect(snap.length).toBeGreaterThan(0)

    const revived = new Player()
    revived.restorePowerUps(snap)

    expect(revived.hasPowerUp('machine_gun')).toBe(true)
    expect(revived.hasPowerUp('lock')).toBe(true)
    expect(revived.autofireTime).toBeGreaterThan(0)
  })

  it('keeps the shield protective throughout its visual flicker', () => {
    const p = new Player()
    p.addPowerUp('shield')
    p.update(0.075, new Set())

    expect(p.isShieldVisible()).toBe(false)
    expect(p.isShieldActive()).toBe(true)
  })
})
