import { ENEMIES, GRID } from './GameConfig';
import { aabb } from './Types';

export class UFO {
  x: number;
  y: number;
  w = GRID.CELL * 1.5;
  h = GRID.CELL;
  vx: number;
  dead = false;
  private rand: () => number;

  constructor(rand: () => number = Math.random) {
    this.rand = rand;
    // Start from either left or right edge
    this.x = this.rand() < 0.5 ? -this.w : GRID.COLS * GRID.CELL;
    // Random Y position in top third of screen
    this.y = this.rand() * (GRID.ROWS / 3) * GRID.CELL;
    // Move in direction based on start position
    this.vx = (this.x < 0 ? 1 : -1) * ENEMIES.UFO.SPEED_PX_PER_SEC_X;
  }

  update(dt: number) {
    if (this.dead) return;
    this.x += this.vx * dt;

    // Destroy mushrooms in radius
    const centerX = this.x + this.w/2;
    const centerY = this.y + this.h/2;
    const radius = ENEMIES.UFO.MUSHROOM_DESTROY_RADIUS;

    // Return cells that need to be checked for mushroom destruction
    const cellsToCheck: { c: number, r: number }[] = [];
    
    // Calculate grid cells within radius
    const minC = Math.max(0, Math.floor((centerX - radius) / GRID.CELL));
    const maxC = Math.min(GRID.COLS - 1, Math.ceil((centerX + radius) / GRID.CELL));
    const minR = Math.max(0, Math.floor((centerY - radius) / GRID.CELL));
    const maxR = Math.min(GRID.ROWS - 1, Math.ceil((centerY + radius) / GRID.CELL));

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const cellCenterX = c * GRID.CELL + GRID.CELL/2;
        const cellCenterY = r * GRID.CELL + GRID.CELL/2;
        const dx = cellCenterX - centerX;
        const dy = cellCenterY - centerY;
        if (dx * dx + dy * dy <= radius * radius) {
          cellsToCheck.push({ c, r });
        }
      }
    }

    return cellsToCheck;
  }

  rect() {
    return {
      x: this.x,
      y: this.y,
      w: this.w,
      h: this.h
    };
  }
}
