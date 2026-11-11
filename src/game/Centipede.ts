import { ENEMIES, GRID, GRID_RATIO } from './GameConfig'
import type { Grid } from './Grid'

export interface Segment {
  c: number
  r: number
  dir: 1 | -1
  head: boolean
  // Cell occupied before the last step. Render and hit-test interpolation only.
  pc?: number
  pr?: number
}

export class Centipede {
  segments: Segment[] = []
  private acc = 0 // cells to advance
  private speed: number
  private poisonDive = false
  private touchedDown = false
  private vdir: 1 | -1 = 1 // vertical travel: 1 = descending, -1 = climbing back up

  constructor(len: number, level: number, startCol: number = GRID.COLS - 2, startRow = 0) {
    for (let i = 0; i < len; i++) {
      this.segments.push({
        c: startCol - i,
        r: startRow,
        dir: 1,
        head: i === 0,
      })
    }
    const base = ENEMIES.PENTIPEDE.SPEED_CELLS_PER_SEC
    // Speed increases with level, capped. Scaled with the grid like every other speed.
    this.speed = Math.min(base + level * 0.6 * GRID_RATIO, base + 4 * GRID_RATIO)
  }

  tick(dt: number, grid: Grid) {
    this.acc += this.speed * dt
    while (this.acc >= 1) {
      this.step(grid)
      this.acc -= 1
    }
  }

  // Where a segment is drawn and hit-tested: eased from the cell it left to the
  // cell it occupies, by the fraction of the next step already accumulated.
  segmentPixel(s: Segment): { x: number; y: number } {
    const f = Math.max(0, Math.min(1, this.acc))
    const pc = s.pc ?? s.c
    const pr = s.pr ?? s.r
    return {
      x: (pc + (s.c - pc) * f) * GRID.CELL,
      y: (pr + (s.r - pr) * f) * GRID.CELL,
    }
  }

  // Fraction of the way through the current step, for leg animation.
  get stepFraction(): number {
    return Math.max(0, Math.min(1, this.acc))
  }

  // A chain cut off by a shot keeps this chain's step phase so it does not snap.
  split(segments: Segment[], level: number): Centipede {
    const next = new Centipede(0, level)
    next.segments = segments
    next.acc = this.acc
    return next
  }

  consumeTouchdown(): boolean {
    if (!this.touchedDown) return false
    this.touchedDown = false
    return true
  }

  private step(grid: Grid) {
    const prev = this.segments.map((s) => ({ c: s.c, r: s.r }))
    for (const s of this.segments) {
      s.pc = s.c
      s.pr = s.r
    }
    const head = this.segments[0]
    const bottomRow = GRID.ROWS - 1
    // Once it touches down it weaves between the bottom row and the top of the
    // player zone rather than teleporting back up to the top of the field.
    const ascendFloor = GRID.ROWS - GRID.PLAYER_ROWS - 1

    if (this.poisonDive) {
      head.r = Math.min(bottomRow, head.r + 1)
      if (head.r >= bottomRow) {
        this.poisonDive = false
        this.vdir = -1
        this.touchedDown = true
      }
    } else {
      const nextC = head.c + head.dir
      const edge = nextC < 0 || nextC >= GRID.COLS
      const mush = !edge ? grid.get(nextC, head.r) : null
      const willHitPoison = !!mush?.poisoned

      if (willHitPoison) {
        // Poisoned mushroom sends the head diving straight down.
        this.poisonDive = true
        head.r = Math.min(bottomRow, head.r + 1)
        if (head.r >= bottomRow) {
          this.poisonDive = false
          this.vdir = -1
          this.touchedDown = true
        }
      } else if (edge || mush) {
        // Reverse horizontally and step one row in the current vertical direction.
        head.r += this.vdir
        head.dir = head.dir === 1 ? -1 : 1
        if (this.vdir === 1 && head.r >= bottomRow) {
          head.r = bottomRow
          this.vdir = -1
          this.touchedDown = true
        } else if (this.vdir === -1 && head.r <= ascendFloor) {
          head.r = ascendFloor
          this.vdir = 1
        }
      } else {
        head.c = nextC
      }
    }

    // Update body segments to follow the leader
    for (let i = 1; i < this.segments.length; i++) {
      this.segments[i].c = prev[i - 1].c
      this.segments[i].r = prev[i - 1].r
    }
  }
}
