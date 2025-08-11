import { CELL, COLS, ROWS, PLAYER_ROWS, SPEED } from './Constants';
import type { Rect } from './Types';

// Helper for sinusoidal movement
function sinMove(t: number, amplitude: number, frequency = 1): number {
  return Math.sin(t * frequency * Math.PI * 2) * amplitude;
}

export class Spider {
  w = CELL*1.1; h = CELL*0.9; dead = false;
  x: number; y: number; vx: number; vy: number;
  private rand: () => number;
  private t = 0; // Time accumulator for movement patterns
  private pattern: 'zigzag' | 'chase' | 'ambush';
  private targetY: number; // For ambush pattern
  private baseSpeed: number;

  constructor(level: number, rand: () => number = Math.random) {
    this.rand = rand;
    this.x = this.rand()<0.5 ? -this.w : COLS*CELL;
  const minY = (ROWS-PLAYER_ROWS)*CELL;
  const maxY = (ROWS-1)*CELL - this.h;
    this.y = minY + this.rand()*(maxY - minY);
    this.baseSpeed = SPEED.SPIDER_PX_PER_SEC_X + Math.min(120, level*12);
    this.vx = (this.x < 0 ? 1 : -1) * this.baseSpeed;
    this.vy = 0;
    
    // Random movement pattern
    this.pattern = this.rand() < 0.4 ? 'zigzag' : this.rand() < 0.7 ? 'chase' : 'ambush';
    this.targetY = this.y;
  }

  update(dt: number, playerY?: number) {
    this.t += dt;
  const minY = (ROWS-PLAYER_ROWS)*CELL, maxY = (ROWS-1)*CELL - this.h;

    switch(this.pattern) {
      case 'zigzag':
        // Complex zigzag pattern with varying amplitude
        this.vy = sinMove(this.t, SPEED.SPIDER_PX_PER_SEC_Y, 2) * 
                 (1 + 0.5 * Math.sin(this.t * 0.5));
        break;
      
      case 'chase':
        // Try to match player's Y position if available
        if (playerY !== undefined) {
          const targetY = Math.max(minY, Math.min(maxY, playerY));
          this.vy = (targetY - this.y) * 3;
          // Add slight oscillation
          this.vy += sinMove(this.t, SPEED.SPIDER_PX_PER_SEC_Y * 0.3);
        }
        break;
      
      case 'ambush':
        // Move to random Y positions and wait briefly
        if (Math.abs(this.y - this.targetY) < 5) {
          if (this.rand() < 0.02) {
            this.targetY = minY + this.rand() * (maxY - minY);
          }
        } else {
          this.vy = (this.targetY - this.y) * 2;
        }
        // Occasionally charge horizontally
        if (this.rand() < 0.005) {
          this.vx *= 2;
          setTimeout(() => this.vx = (this.vx > 0 ? 1 : -1) * this.baseSpeed, 500);
        }
        break;
    }

    // Update position with bounds checking
    this.x += this.vx * dt;
    this.y = Math.max(minY, Math.min(maxY, this.y + this.vy * dt));
    
    // Check for death condition
    if (this.x < -this.w-10 || this.x > COLS*CELL+10) this.dead = true;
  }

  rect(): Rect { return { x:this.x, y:this.y, w:this.w, h:this.h }; }
}

export class Flea {
  w = CELL; h = CELL; dead = false;
  x: number; y: number; vy: number;
  private t = 0;
  private phase = 0;
  private dropMushrooms = false;

  constructor(rand: () => number = Math.random) {
    this.x = Math.floor(rand()*COLS)*CELL;
    this.y = -CELL;
    this.vy = SPEED.FLEA_PX_PER_SEC_Y;
    this.dropMushrooms = rand() < 0.7; // 70% chance to drop mushrooms
    this.phase = rand() * Math.PI * 2; // Random starting phase
  }

  update(dt: number) {
    this.t += dt;
    
    // Sinusoidal horizontal movement while falling
    const oldX = this.x;
    this.x = oldX + sinMove(this.t + this.phase, CELL * 0.5);
    
    // Ensure we stay within bounds
    if (this.x < 0 || this.x > (COLS-1)*CELL) {
      this.x = oldX;
    }
    
    // Vertical movement with occasional speed bursts
    this.y += this.vy * dt;
    
    // Random speed changes
    if (Math.random() < 0.02) {
      this.vy = SPEED.FLEA_PX_PER_SEC_Y * (1 + Math.random());
      setTimeout(() => this.vy = SPEED.FLEA_PX_PER_SEC_Y, 300);
    }
    
    if (this.y > ROWS*CELL) this.dead = true;
  }

  shouldDropMushroom(): boolean {
    return this.dropMushrooms && Math.random() < 0.08;
  }

  rect(): Rect { return { x:this.x, y:this.y, w:this.w, h:this.h }; }
}

export class Scorpion {
  w = CELL; h = CELL; dead = false;
  x: number; y: number; vx: number;
  private t = 0;
  private pattern: 'wave' | 'dash';
  private baseY: number;
  private baseSpeed: number;

  constructor(rand: () => number = Math.random) {
    this.x = rand()<0.5 ? -CELL : COLS*CELL;
    this.baseY = (5 + Math.floor(rand()*10))*CELL;
    this.y = this.baseY;
    this.baseSpeed = SPEED.SCORPION_PX_PER_SEC_X;
    this.vx = (this.x < 0 ? 1 : -1) * this.baseSpeed;
    this.pattern = rand() < 0.6 ? 'wave' : 'dash';
  }

  update(dt: number) {
    this.t += dt;
    
    switch(this.pattern) {
      case 'wave':
        // Sinusoidal vertical movement
        this.y = this.baseY + sinMove(this.t, CELL * 1.5);
        break;
      
      case 'dash':
        // Occasional speed bursts with slight vertical movement
        if (Math.random() < 0.01) {
          this.vx *= 2;
          setTimeout(() => this.vx = (this.vx > 0 ? 1 : -1) * this.baseSpeed, 400);
        }
        this.y = this.baseY + sinMove(this.t, CELL * 0.5, 0.5);
        break;
    }
    
    this.x += this.vx * dt;
    if (this.x < -CELL-4 || this.x > COLS*CELL+4) this.dead = true;
  }

  rect(): Rect { return { x:this.x, y:this.y, w:this.w, h:this.h }; }
}
