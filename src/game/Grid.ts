import { GRID, MUSHROOMS } from './GameConfig';

export class Mushroom {
  hp = MUSHROOMS.HP;
  poisoned = false;
  constructor(public c: number, public r: number) {}
  get x() { return this.c * GRID.CELL }
  get y() { return this.r * GRID.CELL }
}

export class Grid {
  cells: (Mushroom | null)[];
  
  constructor(public cols = GRID.COLS, public rows = GRID.ROWS) {
    this.cells = new Array(cols * rows).fill(null);
  }

  idx(c: number, r: number): number { 
    return r * this.cols + c;
  }

  in(c: number, r: number): boolean { 
    return c >= 0 && c < this.cols && r >= 0 && r < this.rows;
  }

  get(c: number, r: number): Mushroom | null { 
    return this.in(c, r) ? this.cells[this.idx(c, r)] : null;
  }

  set(c: number, r: number, v: Mushroom | null): void { 
    if (this.in(c, r)) {
      this.cells[this.idx(c, r)] = v;
    }
  }

  clear(): void { 
    this.cells.fill(null);
  }

  countInRows(r0: number, r1: number): number {
    let count = 0;
    for (let r = r0; r <= r1; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.get(c, r)) {
          count++;
        }
      }
    }
    return count;
  }
}
