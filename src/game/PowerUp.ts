import { CELL, ROWS, POWERUPS, POWERUP_COLORS } from './Constants';
import type { Rect } from './Types';
import type { PowerUpType } from './Player';

export class PowerUp {
  w = CELL * 0.75;
  h = CELL * 0.75;
  active = true;
  private t = 0;
  private phase = Math.random() * Math.PI * 2;
  private driftX = 0;
  
  constructor(
    public x: number,
    public y: number,
    public type: PowerUpType,
    private rand: () => number = Math.random
  ) {}
  
  update(dt: number) {
    this.t += dt;
    this.y += 18 * dt;
    this.driftX += Math.sin(this.t * 2.1 + this.phase) * 2.2 * dt;
    this.x += this.driftX * dt;
    this.driftX *= 0.96;
    if (this.y > ROWS * CELL + this.h) {
      this.active = false;
    }
  }
  
  draw(g: CanvasRenderingContext2D) {
    const color = POWERUP_COLORS[this.type];
    const pulse = 0.65 + Math.sin(this.t * 6 + this.phase) * 0.15;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const r = Math.max(4, this.w * 0.48);

    g.save();
    g.translate(cx, cy);

    // Soft halo
    g.globalAlpha = 0.35 * pulse;
    g.fillStyle = color;
    g.beginPath();
    g.arc(0, 0, r + 3, 0, Math.PI * 2);
    g.fill();

    // Gem body
    g.globalAlpha = 1;
    g.fillStyle = '#05080e';
    g.beginPath();
    this.drawDiamond(g, r + 1, r + 1);
    g.fill();

    g.fillStyle = color;
    g.beginPath();
    this.drawDiamond(g, r, r);
    g.fill();

    g.fillStyle = '#ffffff';
    g.globalAlpha = 0.35;
    g.beginPath();
    this.drawDiamond(g, r * 0.45, r * 0.45);
    g.fill();

    g.globalAlpha = 1;
    this.drawTypeMark(g);
    g.restore();
  }
  
  private drawDiamond(g: CanvasRenderingContext2D, w: number, h: number) {
    g.moveTo(-w, 0);
    g.lineTo(0, -h);
    g.lineTo(w, 0);
    g.lineTo(0, h);
    g.closePath();
  }
  
  private drawTypeMark(g: CanvasRenderingContext2D) {
    const s = this.w * 0.26;
    g.strokeStyle = '#10141f';
    g.fillStyle = '#10141f';
    g.lineWidth = 1.25;

    switch (this.type) {
      case 'machine_gun':
        g.fillRect(-s * 0.65, -s * 1.15, s * 0.4, s * 2.3);
        g.fillRect(-s * 0.05, -s * 1.15, s * 0.4, s * 2.3);
        g.fillRect(s * 0.55, -s * 1.15, s * 0.4, s * 2.3);
        break;
      case 'diamond':
        g.beginPath();
        this.drawDiamond(g, s * 0.9, s * 0.9);
        g.stroke();
        break;
      case 'guided':
        g.beginPath();
        g.moveTo(-s * 0.9, -s * 1.1);
        g.lineTo(0, 0);
        g.lineTo(-s * 0.35, 0);
        g.lineTo(s, s * 1.1);
        g.stroke();
        break;
      case 'shield':
        g.beginPath();
        g.arc(0, 0, s * 1.15, 0, Math.PI * 2);
        g.stroke();
        break;
      case 'house_cleaning':
        g.beginPath();
        g.moveTo(-s, s * 0.65);
        g.lineTo(s * 0.95, s * 0.15);
        g.stroke();
        g.fillRect(-s * 0.25, -s * 0.95, s * 0.5, s * 0.6);
        break;
      case 'lock':
        g.strokeRect(-s * 0.8, -s * 0.15, s * 1.6, s * 1.25);
        g.beginPath();
        g.arc(0, -s * 0.2, s * 0.55, Math.PI, Math.PI * 2);
        g.stroke();
        break;
      case 'extra_man':
        g.fillRect(-s * 0.2, -s, s * 0.4, s * 2);
        g.fillRect(-s, -s * 0.2, s * 2, s * 0.4);
        break;
      default:
        break;
    }
  }
  
  rect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}
