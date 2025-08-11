import { CELL, POWERUPS, POWERUP_COLORS } from './Constants';
import type { Rect } from './Types';
import type { PowerUpType } from './Player';

export class PowerUp {
  w = CELL * 0.75;
  h = CELL * 0.75;
  active = true;
  private t = 0; // Time accumulator for animation
  private phase = Math.random() * Math.PI * 2; // Random starting phase
  
  constructor(
    public x: number,
    public y: number,
    public type: PowerUpType,
    private rand: () => number = Math.random
  ) {}
  
  update(dt: number) {
    this.t += dt;
    // Floating motion
    this.y += Math.sin(this.t * 3 + this.phase) * 0.5;
    // Slow descent
    this.y += 15 * dt;
  }
  
  draw(g: CanvasRenderingContext2D) {
    const color = POWERUP_COLORS[this.type];
    const alpha = 0.2 + 0.3 * Math.sin(this.t * 4);
    
    // Outer glow
    g.fillStyle = `rgba(${this.hexToRgb(color)},${alpha})`;
    g.fillRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
    
    // Core
    g.fillStyle = color;
    g.fillRect(this.x, this.y, this.w, this.h);
    
    // Inner glow
    g.fillStyle = '#ffffff';
    const innerSize = this.w * 0.3;
    g.fillRect(
      this.x + (this.w - innerSize) / 2,
      this.y + (this.h - innerSize) / 2,
      innerSize,
      innerSize
    );
    
    // Power-up type indicator
    const symbol = this.getTypeSymbol();
    g.fillStyle = '#000000';
    g.fillText(symbol, this.x + this.w / 2, this.y + this.h / 2 + 4);
  }
  
  private getTypeSymbol(): string {
    switch(this.type) {
      case 'autofire': return 'A';
      case 'spread': return 'S';
      case 'rapid': return 'R';
      case 'shield': return 'D';
      case 'warp': return 'W';
      default: return '?';
    }
  }
  
  private hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  }
  
  rect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}
