import { GRID, ENEMIES } from './GameConfig';
import { Grid } from './Grid';

export interface Segment { c:number; r:number; dir:1|-1; head:boolean }

export class Centipede {
  segments: Segment[] = [];
  private acc = 0; // cells to advance
  private speed: number;
  private poisonDive = false;
  private touchedDown = false;
  
  constructor(len: number, level: number) {
    const startRow = 0;
    for (let i = 0; i < len; i++) {
      this.segments.push({ 
        c: (GRID.COLS - 2) - i, 
        r: startRow, 
        dir: 1, 
        head: i === 0 
      });
    }
    const base = ENEMIES.PENTIPEDE.SPEED_CELLS_PER_SEC;
    this.speed = Math.min(base + level * 0.6, base + 4); // Speed increases with level, caps at base + 4
  }

  tick(dt: number, grid: Grid) {
    this.acc += this.speed * dt;
    while (this.acc >= 1) { 
      this.step(grid); 
      this.acc -= 1; 
    }
  }

  consumeTouchdown(): boolean {
    if (!this.touchedDown) return false;
    this.touchedDown = false;
    return true;
  }

  private step(grid: Grid) {
    const prev = this.segments.map(s => ({ c: s.c, r: s.r }));
    const head = this.segments[0];
    const maxRow = GRID.ROWS - GRID.PLAYER_ROWS - 1;

    if (this.poisonDive) {
      head.r = Math.min(maxRow, head.r + 1);
      if (head.r >= maxRow) { 
        this.poisonDive = false; 
      }
    } else {
      let nextC = head.c + head.dir;
      const edge = nextC < 0 || nextC >= GRID.COLS;
      const mush = !edge ? grid.get(nextC, head.r) : null;
      const willHitPoison = !!mush?.poisoned;

      if (willHitPoison) {
        // Enter dive mode; move down one row this step
        this.poisonDive = true;
        head.r = Math.min(maxRow, head.r + 1);
      } else if (edge || (!!mush)) {
        head.r = Math.min(maxRow, head.r + 1);
        head.dir = head.dir === 1 ? -1 : 1;
      } else {
        head.c = nextC;
      }
    }

    // Update body segments to follow the leader
    for (let i = 1; i < this.segments.length; i++) { 
      this.segments[i].c = prev[i-1].c; 
      this.segments[i].r = prev[i-1].r; 
    }

    // Classic behavior: touchdown at bottom row, then restart from top.
    if (head.r >= maxRow) { 
      this.touchedDown = true;
      head.r = 0; 
      this.poisonDive = false;
    }
  }
}
