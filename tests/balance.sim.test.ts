// Balance simulation, not a pass/fail test. A simple bot plays seeded runs and
// the numbers are printed so tuning changes can be compared before and after.
//
//   pnpm balance            (skipped in the normal `pnpm test` run)
//
// The bot plays like a competent beginner: it stays low, shoots Larry when he is
// overhead, works on the lowest Pentipede segment, and steps away from anything
// about to touch it. It does not plan ahead, so treat its results as a floor for
// a human and use them to compare one tuning against another.
import { describe, expect, it, vi } from 'vitest'
import { fakeCanvas, installFakeDom } from './helpers/fakeDom'

const RUN = !!process.env.BALANCE
const STEP = 1 / 60
const SEEDS = [11, 22, 33, 44, 55, 66, 77, 88, 99, 111, 222, 333]
const MAX_SECONDS = 300

vi.setConfig({ testTimeout: 600_000 })

type Box = { x: number; y: number; w: number; h: number }
type Mover = Box & { vx?: number; vy?: number }

const LOOKAHEAD = 0.3 // seconds the bot looks ahead when judging a threat

// biome-ignore lint/suspicious/noExplicitAny: the sim reads engine internals
function threatsOf(engine: any): { box: Mover; kind: string }[] {
  const out: { box: Mover; kind: string }[] = []
  for (const s of engine.spiders) out.push({ box: s, kind: 'scobster' })
  for (const f of engine.fleas) out.push({ box: f, kind: 'flick' })
  for (const m of engine.fallingMushrooms)
    if (m.active) out.push({ box: m, kind: 'falling mushroom' })
  for (const b of engine.reflectedBullets) {
    if (b.active)
      out.push({ box: { x: b.x - 2, y: b.y - 4, w: 4, h: 8, vy: b.vy }, kind: 'reflected shot' })
  }
  for (const cent of engine.centipedes) {
    for (const s of cent.segments) {
      const pos = cent.segmentPixel(s)
      out.push({ box: { x: pos.x, y: pos.y, w: 16, h: 16 }, kind: 'pentipede' })
    }
  }
  return out
}

// How close a threat's box comes to the crystal within the lookahead, as a
// horizontal and vertical gap (negative means overlap).
function gaps(p: Box, t: Mover, dt: number): { dx: number; dy: number; side: number } {
  const tx = t.x + (t.vx ?? 0) * dt
  const ty = t.y + (t.vy ?? 0) * dt
  const dx = Math.max(tx - (p.x + p.w), p.x - (tx + t.w))
  const dy = Math.max(ty - (p.y + p.h), p.y - (ty + t.h))
  return { dx, dy, side: tx + t.w / 2 >= p.x + p.w / 2 ? 1 : -1 }
}

// A competent but not clever player: stays low, shoots Larry when he is above,
// otherwise works on the lowest Pentipede segment, and steps away from anything
// that is about to touch it, toward the side with more room.
// biome-ignore lint/suspicious/noExplicitAny: the sim reads engine internals
function steer(engine: any, fieldW: number): void {
  const keys: Set<string> = engine.keys
  keys.clear()
  keys.add('Space')
  const p = engine.player
  if (!p.alive) return
  const px = p.x + p.w / 2
  keys.add('ArrowDown')

  let push = 0
  for (const { box } of threatsOf(engine)) {
    for (const dt of [0, LOOKAHEAD / 2, LOOKAHEAD]) {
      const g = gaps(p, box, dt)
      if (g.dx < 14 && g.dy < 12) {
        push -= g.side
        break
      }
    }
  }
  if (push !== 0) {
    // Do not run into a wall: flip toward open space when cornered.
    let dir = push < 0 ? -1 : 1
    if (dir < 0 && px < 24) dir = 1
    if (dir > 0 && px > fieldW - 24) dir = -1
    keys.add(dir < 0 ? 'ArrowLeft' : 'ArrowRight')
    return
  }

  // Larry first when he is overhead and close: he is the main killer.
  let target: number | null = null
  for (const s of engine.spiders) {
    if (s.y + s.h < p.y - 2) target = s.x + s.w / 2
  }
  if (target === null) {
    let lowest = -1
    for (const cent of engine.centipedes) {
      for (const s of cent.segments) {
        if (s.r > lowest) {
          lowest = s.r
          target = cent.segmentPixel(s).x + 8
        }
      }
    }
  }
  if (target === null) return
  if (target < px - 3) keys.add('ArrowLeft')
  else if (target > px + 3) keys.add('ArrowRight')
}

// biome-ignore lint/suspicious/noExplicitAny: the sim reads engine internals
function killer(engine: any, before: { kind: string; box: Mover }[], p: Box): string {
  let best = 'unknown'
  let bestGap = Infinity
  for (const t of before) {
    const g = gaps(p, t.box, 0)
    const gap = Math.max(g.dx, g.dy)
    if (gap < bestGap) {
      bestGap = gap
      best = t.kind
    }
  }
  return best
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

describe.skipIf(!RUN)('Balance simulation', () => {
  for (const mode of ['classic', 'enhanced'] as const) {
    it(`bot results, ${mode}`, async () => {
      installFakeDom()
      const { Engine } = await import('../src/game/Engine')
      // biome-ignore lint/suspicious/noExplicitAny: the sim drives the private fixed step
      const engine = new Engine(fakeCanvas(), 800, 592) as any
      engine.updateSettings({ ...engine.settings, gameMode: mode })

      const { COLS, CELL } = await import('../src/game/Constants')
      const fieldW = COLS * CELL
      const rows: { seed: number; seconds: number; wave: number; score: number }[] = []
      const spawns = { flick: 0, scobster: 0, gecko: 0, ufo: 0, yummies: 0 }
      const deaths: Record<string, number> = {}
      const waveSeconds: number[][] = []
      let totalSeconds = 0
      for (const seed of SEEDS) {
        engine.startNewGame(seed)
        let frames = 0
        let waveStart = 0
        let wave = engine.level
        let lives = engine.lives
        let prev = { f: 0, s: 0, g: 0, u: 0, y: 0 }
        while (engine.mode === 'playing' && frames < MAX_SECONDS * 60) {
          steer(engine, fieldW)
          const before = threatsOf(engine)
          const pBox = {
            x: engine.player.x,
            y: engine.player.y,
            w: engine.player.w,
            h: engine.player.h,
          }
          engine.tick(STEP)
          frames++
          if (engine.lives < lives) {
            const kind = killer(engine, before, pBox)
            deaths[kind] = (deaths[kind] ?? 0) + 1
          }
          lives = engine.lives
          if (engine.level !== wave) {
            const i = wave - 1
            waveSeconds[i] ??= []
            waveSeconds[i].push((frames - waveStart) / 60)
            waveStart = frames
            wave = engine.level
          }
          const now = {
            f: engine.fleas.length,
            s: engine.spiders.length,
            g: engine.geckos.length,
            u: engine.ufos.length,
            y: engine.powerUps.length,
          }
          if (now.f > prev.f) spawns.flick += now.f - prev.f
          if (now.s > prev.s) spawns.scobster += now.s - prev.s
          if (now.g > prev.g) spawns.gecko += now.g - prev.g
          if (now.u > prev.u) spawns.ufo += now.u - prev.u
          if (now.y > prev.y) spawns.yummies += now.y - prev.y
          prev = now
        }
        totalSeconds += frames / 60
        rows.push({
          seed,
          seconds: Math.round(frames / 60),
          wave: engine.level,
          score: engine.score,
        })
      }

      const perMinute = (n: number) => (n / (totalSeconds / 60)).toFixed(1)
      const waves = waveSeconds
        .slice(0, 8)
        .map((t, i) => `w${i + 1} ${Math.round(median(t))}s (n=${t.length})`)
        .join(', ')
      console.log(
        `\n[balance ${mode}] median survival ${median(rows.map((r) => r.seconds))}s, ` +
          `median wave ${median(rows.map((r) => r.wave))}, median score ${median(rows.map((r) => r.score))}\n` +
          `  per minute: flick ${perMinute(spawns.flick)}, scobster ${perMinute(spawns.scobster)}, ` +
          `gecko ${perMinute(spawns.gecko)}, ship ${perMinute(spawns.ufo)}, yummies ${perMinute(spawns.yummies)}\n` +
          `  deaths: ${Object.entries(deaths)
            .map(([k, v]) => `${k} ${v}`)
            .join(', ')}\n` +
          `  median seconds to clear: ${waves || 'no wave cleared'}\n` +
          `  runs: ${rows.map((r) => `${r.seconds}s/w${r.wave}/${r.score}`).join('  ')}`
      )
      expect(rows.length).toBe(SEEDS.length)
    })
  }
})
