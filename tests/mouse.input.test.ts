import { describe, expect, it } from 'vitest'
import { GRID, PLAYER } from '../src/game/GameConfig'
import { clampMouseTarget, getMouseVelocity } from '../src/game/MouseInput'

describe('Mouse movement vector', () => {
  it('continues toward the cursor until the player arrives', () => {
    const velocity = getMouseVelocity(200, 500, 200, 400, 1 / 60)

    expect(velocity.arrived).toBe(false)
    expect(velocity.vx).toBe(0)
    expect(velocity.vy).toBe(-PLAYER.MOVEMENT.BASE_SPEED * PLAYER.MOVEMENT.VERTICAL_MULT)
  })

  it('stops only once the player reaches the cursor', () => {
    expect(getMouseVelocity(200, 500, 201, 501, 1 / 60)).toEqual({
      vx: 60,
      vy: 60,
      arrived: true,
    })
  })

  it('settles without oscillating after its final movement frame', () => {
    const finalStep = getMouseVelocity(200, 500, 203, 500, 1 / 60)
    const nextX = 200 + finalStep.vx / 60
    const nextY = 500 + finalStep.vy / 60

    expect(getMouseVelocity(nextX, nextY, 203, 500, 1 / 60)).toEqual({
      vx: 0,
      vy: 0,
      arrived: true,
    })
  })

  it('clamps the cursor to reachable player-center bounds', () => {
    const target = clampMouseTarget(-100, GRID.ROWS * GRID.CELL + 100)

    expect(target.x).toBe(PLAYER.SIZE.WIDTH / 2)
    expect(target.y).toBe((GRID.ROWS - 1) * GRID.CELL - PLAYER.SIZE.HEIGHT / 2 - 2)
  })
})
