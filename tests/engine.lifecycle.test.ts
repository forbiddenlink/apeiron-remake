import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeCanvas, installFakeDom } from './helpers/fakeDom'

// Engine reads `window`/`document` at construction, so the fake DOM goes in
// first and the module is imported after it.
async function makeEngine(options: { testHarness?: boolean } = {}) {
  installFakeDom(options)
  const { Engine } = await import('../src/game/Engine')
  const engine = new Engine(fakeCanvas(), 800, 592)
  // any: tests drive the private fixed step directly
  return engine as any
}

function fieldSignature(engine: { grid: { cells: unknown[] } }): string {
  return engine.grid.cells.map((cell) => (cell ? '1' : '0')).join('')
}

const STEP = 1 / 60

// Building an Engine pre-renders every backdrop, which takes a moment in node.
vi.setConfig({ testTimeout: 30_000 })

describe('Engine: losing a life', () => {
  beforeEach(() => installFakeDom())

  it('costs exactly one life per hit, however long the enemy sits on the spawn point', async () => {
    const engine = await makeEngine()
    engine.startNewGame(0xc0ffee)

    // Nobody touches the controls: the Pentipede walks down onto the player.
    const losses: number[] = []
    let lives = engine.lives
    for (let frame = 1; frame <= 60 * 240 && engine.mode === 'playing'; frame++) {
      engine.tick(STEP)
      if (engine.lives !== lives) {
        expect(engine.lives).toBe(lives - 1)
        losses.push(frame)
        lives = engine.lives
      }
    }

    expect(losses.length).toBe(3)
    expect(engine.mode).toBe('gameover')
    // Shatter freeze plus the invulnerable window: well over two seconds apart.
    expect(losses[1] - losses[0]).toBeGreaterThan(120)
    expect(losses[2] - losses[1]).toBeGreaterThan(120)
  })

  it('cannot be hit again during the freeze or while invulnerable', async () => {
    const engine = await makeEngine()
    engine.startNewGame(1)
    engine.loseLife()
    expect(engine.lives).toBe(2)
    engine.loseLife()
    engine.loseLife()
    expect(engine.lives).toBe(2)

    // Ride out the freeze, then try again inside the invulnerable window.
    for (let i = 0; i < 70; i++) engine.tick(STEP)
    expect(engine.player.alive).toBe(true)
    engine.loseLife()
    expect(engine.lives).toBe(2)

    // Once the window has passed, a hit counts again.
    engine.invulnT = 0
    engine.loseLife()
    expect(engine.lives).toBe(1)
  })
})

describe('Engine: frame loop', () => {
  it('does not replay a long gap when the tab comes back', async () => {
    const engine = await makeEngine()
    engine.startNewGame(0xc0ffee)
    engine.running = true
    engine.last = 1000
    engine.loop(1000 + 30_000) // thirty seconds hidden
    engine.running = false

    expect(engine.mode).toBe('playing')
    expect(engine.lives).toBe(3)
    expect(engine.tGlobal).toBeLessThanOrEqual(0.1 + 1e-6)
  })
})

describe('Engine: seeds', () => {
  it('gives each run its own field in normal play', async () => {
    const engine = await makeEngine()
    const seeds = new Set<number>()
    const fields = new Set<string>()
    for (let i = 0; i < 4; i++) {
      engine.startNewGame()
      seeds.add(engine.seed)
      fields.add(fieldSignature(engine))
    }
    expect(seeds.size).toBe(4)
    expect(fields.size).toBe(4)
  })

  it('replays the same field and the same run from the same seed', async () => {
    const a = await makeEngine()
    const b = await makeEngine()
    a.startNewGame(20261110)
    b.startNewGame(20261110)
    expect(fieldSignature(a)).toBe(fieldSignature(b))
    for (let i = 0; i < 600; i++) {
      a.tick(STEP)
      b.tick(STEP)
    }
    expect(fieldSignature(a)).toBe(fieldSignature(b))
    expect(a.score).toBe(b.score)
    expect(a.lives).toBe(b.lives)
  })

  it('keeps the fixed seed under the headless harness', async () => {
    const engine = await makeEngine({ testHarness: true })
    engine.startNewGame()
    const first = fieldSignature(engine)
    engine.startNewGame()
    expect(engine.seed).toBe(0xc0ffee)
    expect(fieldSignature(engine)).toBe(first)
  })
})

describe('Engine: cheat words', () => {
  it('marks the run and keeps it off the high score', async () => {
    const engine = await makeEngine()
    engine.startNewGame(7)
    const best = engine.highScore
    engine.applyCheat('HECTOR')
    expect(engine.lives).toBe(8)
    expect(engine.cheated).toBe(true)
    engine.applyCheat('PERNTS')
    expect(engine.score).toBeGreaterThan(0)
    expect(engine.highScore).toBe(best)
  })
})

describe('Engine: Groucho the Flick', () => {
  it('does not rain fleas on an untouched first wave', async () => {
    const engine = await makeEngine()
    engine.startNewGame(3)
    let spawned = 0
    let previous = 0
    for (let frame = 0; frame < 60 * 30; frame++) {
      engine.invulnT = 1 // keep the idle player alive so the wave runs its course
      engine.tick(STEP)
      if (engine.fleas.length > previous) spawned += engine.fleas.length - previous
      previous = engine.fleas.length
    }
    // Before the fix this was one every two seconds: 14 in half a minute.
    expect(spawned).toBeLessThanOrEqual(3)
  })
})
