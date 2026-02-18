import { GRID, ENEMIES } from './GameConfig';
import type { Rect } from './Types';

export class Spider {
  w = GRID.CELL * 1.4;   // Larger for better visibility
  h = GRID.CELL * 1.15;
  dead = false;
  x: number;
  y: number;
  vx: number;
  vy: number;
  private rand: () => number;
  private nextTurn = 0;
  private baseSpeed: number;

  constructor(level: number, rand: () => number = Math.random) {
    this.rand = rand;
    this.x = this.rand() < 0.5 ? -this.w : GRID.COLS * GRID.CELL;
    const minY = (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL;
    const maxY = (GRID.ROWS - 1) * GRID.CELL - this.h;
    this.y = minY + this.rand() * (maxY - minY);
    this.baseSpeed = ENEMIES.LARRY_THE_SCOBSTER.SPEED_PX_PER_SEC_X + Math.min(80, level * 8);  // Gentler scaling
    this.vx = (this.x < 0 ? 1 : -1) * this.baseSpeed;
    this.vy = (this.rand() < 0.5 ? -1 : 1) * ENEMIES.LARRY_THE_SCOBSTER.SPEED_PX_PER_SEC_Y * 0.65;
    this.nextTurn = 0.24 + this.rand() * 0.42;
  }

  update(dt: number, _playerY?: number) {
    this.nextTurn -= dt;
    const minY = (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL;
    const maxY = (GRID.ROWS - 1) * GRID.CELL - this.h;

    if (this.nextTurn <= 0) {
      this.vy = (this.rand() < 0.5 ? -1 : 1) * ENEMIES.LARRY_THE_SCOBSTER.SPEED_PX_PER_SEC_Y * (0.45 + this.rand() * 0.35);
      this.nextTurn = 0.18 + this.rand() * 0.45;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < minY) {
      this.y = minY;
      this.vy = Math.abs(this.vy);
    } else if (this.y > maxY) {
      this.y = maxY;
      this.vy = -Math.abs(this.vy);
    }

    if (this.x < -this.w - 10 || this.x > GRID.COLS * GRID.CELL + 10) {
      this.dead = true;
    }
  }

  rect(): Rect { 
    return { x: this.x, y: this.y, w: this.w, h: this.h }; 
  }
}

export class Flea {
  w = GRID.CELL * 1.25;  // Larger for better visibility
  h = GRID.CELL * 1.25;
  dead = false;
  x: number;
  y: number;
  vy: number;
  private rand: () => number;
  private dropMushrooms = false;
  private dropAccumulator = 0;

  constructor(rand: () => number = Math.random) {
    this.rand = rand;
    this.x = Math.floor(rand() * GRID.COLS) * GRID.CELL;
    this.y = -GRID.CELL;
    this.vy = ENEMIES.GROUCHO_THE_FLICK.SPEED_PX_PER_SEC_Y;
    this.dropMushrooms = rand() < 0.85;
  }

  update(dt: number) {
    this.y += this.vy * dt;
    this.dropAccumulator += this.vy * dt;

    if (this.y > GRID.ROWS * GRID.CELL) {
      this.dead = true;
    }
  }

  shouldDropMushroom(): boolean {
    if (!this.dropMushrooms) return false;
    if (this.dropAccumulator < GRID.CELL * 1.2) return false;
    this.dropAccumulator = 0;
    return this.rand() < ENEMIES.GROUCHO_THE_FLICK.MUSHROOM_DROP_CHANCE;
  }

  rect(): Rect { 
    return { x: this.x, y: this.y, w: this.w, h: this.h }; 
  }
}

export class Scorpion {
  w = GRID.CELL * 1.5;   // Larger for better visibility (Gordon is a gecko!)
  h = GRID.CELL * 1.1;
  dead = false;
  x: number;
  y: number;
  vx: number;
  private baseY: number;
  private baseSpeed: number;

  constructor(rand: () => number = Math.random) {
    this.x = rand() < 0.5 ? -GRID.CELL : GRID.COLS * GRID.CELL;
    this.baseY = (5 + Math.floor(rand() * 10)) * GRID.CELL;
    this.y = this.baseY;
    this.baseSpeed = ENEMIES.GORDON_THE_GECKO.SPEED_PX_PER_SEC_X;
    this.vx = (this.x < 0 ? 1 : -1) * this.baseSpeed;
  }

  update(dt: number) {
    this.y = this.baseY;
    this.x += this.vx * dt;
    if (this.x < -GRID.CELL - 4 || this.x > GRID.COLS * GRID.CELL + 4) {
      this.dead = true;
    }
  }

  rect(): Rect { 
    return { x: this.x, y: this.y, w: this.w, h: this.h }; 
  }
}
