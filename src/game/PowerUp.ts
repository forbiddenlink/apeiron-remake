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
    
    // Save context for rotation
    g.save();
    g.translate(this.x + this.w/2, this.y + this.h/2);
    g.rotate(Math.sin(this.t) * 0.1); // Gentle wobble
    
    // Outer glow
    g.fillStyle = `rgba(${this.hexToRgb(color)},${alpha})`;
    g.beginPath();
    this.drawCrystalShape(g, this.w/2 + 2, this.h/2 + 2);
    g.fill();
    
    // Core crystal
    g.fillStyle = color;
    g.beginPath();
    this.drawCrystalShape(g, this.w/2, this.h/2);
    g.fill();
    
    // Inner glow
    g.fillStyle = '#ffffff';
    g.globalAlpha = 0.3;
    g.beginPath();
    this.drawCrystalShape(g, this.w/3, this.h/3);
    g.fill();
    g.globalAlpha = 1;
    
    // Power-up specific visual effects
    this.drawTypeEffect(g);
    
    g.restore();
  }
  
  private drawCrystalShape(g: CanvasRenderingContext2D, w: number, h: number) {
    g.moveTo(-w, 0);
    g.lineTo(0, -h);
    g.lineTo(w, 0);
    g.lineTo(0, h);
    g.closePath();
  }
  
  private drawTypeEffect(g: CanvasRenderingContext2D) {
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1;
    const size = this.w * 0.3;
    
    switch(this.type) {
      case 'autofire':
        // Rotating bullets pattern
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + this.t * 4;
          const x = Math.cos(angle) * size;
          const y = Math.sin(angle) * size;
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.arc(x, y, 2, 0, Math.PI * 2);
          g.fill();
        }
        break;
        
      case 'spread':
        // Triple arrow pattern
        for (let i = -1; i <= 1; i++) {
          const angle = i * Math.PI / 4;
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
          g.lineTo(Math.cos(angle) * size - 3, Math.sin(angle) * size - 3);
          g.moveTo(Math.cos(angle) * size, Math.sin(angle) * size);
          g.lineTo(Math.cos(angle) * size + 3, Math.sin(angle) * size - 3);
          g.stroke();
        }
        break;
        
      case 'rapid':
        // Lightning bolt
        g.beginPath();
        g.moveTo(-size, -size);
        g.lineTo(0, 0);
        g.lineTo(-size/2, 0);
        g.lineTo(size, size);
        g.stroke();
        // Energy sparks
        for (let i = 0; i < 3; i++) {
          const angle = this.t * 5 + i * Math.PI * 2/3;
          const x = Math.cos(angle) * size * 0.5;
          const y = Math.sin(angle) * size * 0.5;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + 3, y + 3);
          g.stroke();
        }
        break;
        
      case 'shield':
        // Shield bubble with energy field
        g.beginPath();
        g.arc(0, 0, size, 0, Math.PI * 2);
        g.stroke();
        // Energy ripples
        for (let i = 0; i < 2; i++) {
          const scale = 0.6 + ((this.t * 2 + i/2) % 1) * 0.4;
          g.beginPath();
          g.arc(0, 0, size * scale, 0, Math.PI * 2);
          g.stroke();
        }
        break;
        
      case 'warp':
        // Speed lines with motion blur
        for (let i = 0; i < 3; i++) {
          const offset = (this.t * 3 + i/3) % 1;
          const scale = 0.5 + offset * 0.5;
          g.beginPath();
          g.arc(0, 0, size * scale, -Math.PI/3, Math.PI/3);
          g.stroke();
          g.beginPath();
          g.arc(0, 0, size * scale, Math.PI*2/3, Math.PI*4/3);
          g.stroke();
        }
        break;
        
      case 'phase':
        // Phase shift ripple effect
        for (let i = 0; i < 3; i++) {
          const angle = this.t * 3 + i * Math.PI * 2/3;
          g.beginPath();
          g.arc(
            Math.cos(angle) * size * 0.3,
            Math.sin(angle) * size * 0.3,
            size * 0.5,
            0, Math.PI * 2
          );
          g.stroke();
        }
        break;
        
      case 'mega':
        // Pulsing star burst
        const points = 8;
        const innerRadius = size * 0.5;
        const outerRadius = size * (1 + Math.sin(this.t * 4) * 0.2);
        g.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const angle = (i * Math.PI) / points;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.closePath();
        g.stroke();
        break;
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
