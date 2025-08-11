import { POWERUP_COLORS } from './Constants';

type ParticleType = 'explosion' | 'trail' | 'impact' | 'sparkle' | 'energy';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: ParticleType;
  alpha: number;
  rotation?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private densityMultiplier = 1;
  
  setDensity(density: 'low' | 'medium' | 'high') {
    switch (density) {
      case 'low':
        this.densityMultiplier = 0.5;
        break;
      case 'medium':
        this.densityMultiplier = 1;
        break;
      case 'high':
        this.densityMultiplier = 2;
        break;
    }
  }
  
  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      // Apply effects based on type
      switch (p.type) {
        case 'explosion':
          // Fade out and slow down
          p.alpha = p.life / p.maxLife;
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
          
        case 'trail':
          // Quick fade
          p.alpha = (p.life / p.maxLife) ** 2;
          p.size *= 0.98;
          break;
          
        case 'impact':
          // Bounce effect
          p.vy += 200 * dt; // gravity
          p.alpha = p.life / p.maxLife;
          break;
          
        case 'sparkle':
          // Twinkle effect
          p.alpha = 0.3 + 0.7 * Math.sin(p.life * 10);
          if (p.rotation !== undefined) {
            p.rotation += dt * 2;
          }
          break;
          
        case 'energy':
          // Pulse effect
          p.alpha = 0.5 + 0.5 * Math.sin(p.life * 15);
          p.size = p.size * (0.8 + 0.2 * Math.sin(p.life * 10));
          break;
      }
    }
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      
      switch (p.type) {
        case 'explosion':
          this.drawExplosion(ctx, p);
          break;
        case 'trail':
          this.drawTrail(ctx, p);
          break;
        case 'impact':
          this.drawImpact(ctx, p);
          break;
        case 'sparkle':
          this.drawSparkle(ctx, p);
          break;
        case 'energy':
          this.drawEnergy(ctx, p);
          break;
      }
    }
    
    ctx.restore();
  }
  
  private drawExplosion(ctx: CanvasRenderingContext2D, p: Particle) {
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  private drawTrail(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
  }
  
  private drawImpact(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.size);
    ctx.lineTo(p.x + p.size, p.y);
    ctx.lineTo(p.x, p.y + p.size);
    ctx.lineTo(p.x - p.size, p.y);
    ctx.closePath();
    ctx.fill();
  }
  
  private drawSparkle(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.rotation !== undefined) {
      ctx.rotate(p.rotation);
    }
    
    ctx.fillStyle = p.color;
    const halfSize = p.size / 2;
    
    // Draw a star shape
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const radius = i % 2 === 0 ? p.size : halfSize;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
  
  private drawEnergy(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.save();
    ctx.translate(p.x, p.y);
    
    // Inner glow
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(0.5, p.color);
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  // Particle emission methods
  emitExplosion(x: number, y: number, color: string, count = 12) {
    const adjustedCount = Math.max(1, Math.floor(count * this.densityMultiplier));
    for (let i = 0; i < adjustedCount; i++) {
      const angle = (i * Math.PI * 2) / count;
      const speed = 100 + Math.random() * 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color,
        size: 4 + Math.random() * 4,
        type: 'explosion',
        alpha: 1
      });
    }
  }
  
  emitTrail(x: number, y: number, color: string, direction: number = -Math.PI/2) {
    if (Math.random() > this.densityMultiplier) return;
    const speed = 20 + Math.random() * 10;
    this.particles.push({
      x,
      y,
      vx: Math.cos(direction) * speed + (Math.random() - 0.5) * 10,
      vy: Math.sin(direction) * speed + (Math.random() - 0.5) * 10,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      color,
      size: 2 + Math.random() * 2,
      type: 'trail',
      alpha: 1
    });
  }
  
  emitImpact(x: number, y: number, color: string, count = 6) {
    const adjustedCount = Math.max(1, Math.floor(count * this.densityMultiplier));
    for (let i = 0; i < adjustedCount; i++) {
      const angle = -Math.PI/2 + (Math.random() - 0.5) * Math.PI;
      const speed = 50 + Math.random() * 30;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        color,
        size: 2 + Math.random() * 2,
        type: 'impact',
        alpha: 1
      });
    }
  }
  
  emitSparkle(x: number, y: number, color: string) {
    if (Math.random() > this.densityMultiplier) return;
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 0.6 + Math.random() * 0.4,
      maxLife: 1.0,
      color,
      size: 3 + Math.random() * 2,
      type: 'sparkle',
      alpha: 1,
      rotation: Math.random() * Math.PI * 2
    });
  }
  
  emitEnergy(x: number, y: number, color: string) {
    if (Math.random() > this.densityMultiplier) return;
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      color,
      size: 4 + Math.random() * 3,
      type: 'energy',
      alpha: 1
    });
  }
  
  // Convenience methods for game events
  enemyExplosion(x: number, y: number) {
    this.emitExplosion(x, y, '#ff4081', 15);
    for (let i = 0; i < 5; i++) {
      this.emitSparkle(
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 20,
        '#ff80ab'
      );
    }
  }
  
  powerUpSparkle(x: number, y: number, type: keyof typeof POWERUP_COLORS) {
    const color = POWERUP_COLORS[type];
    this.emitSparkle(x, y, color);
    this.emitEnergy(x, y, color);
  }
  
  bulletImpact(x: number, y: number) {
    this.emitImpact(x, y, '#ffffff');
    this.emitEnergy(x, y, '#e1f5fe');
  }
  
  playerTrail(x: number, y: number) {
    this.emitTrail(x, y, '#84ffff');
  }
}
