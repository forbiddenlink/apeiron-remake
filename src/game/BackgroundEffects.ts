// Apeiron's background effects were characterized by:
// 1. A plasma-like pattern that slowly shifts and morphs
// 2. Color cycling that responds to game events
// 3. Subtle grid lines that pulse with the music
// 4. Energy field distortions around power-ups and enemies

export class BackgroundEffects {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private time = 0;
  private plasmaData: ImageData;
  private colorCycle = 0;
  private energyFields: { x: number; y: number; intensity: number; radius: number; }[] = [];
  
  // Exact Apeiron color palette
  private readonly COLORS = {
    base: ['#000022', '#000044', '#000088'], // Deeper blues for base
    energy: ['#00ffff', '#40ffff', '#80ffff'], // Brighter cyan for energy
    plasma: ['#ff00ff', '#ff40ff', '#ff80ff'], // Electric magenta for plasma
    accent: ['#ffff00', '#ffff40', '#ffff80'], // Bright yellow for accents
    grid: ['#004444', '#008888', '#00cccc']  // Cyan grid lines
  };
  
  private readonly PLASMA_COLORS = [
    { r: 255, g: 0, b: 255 },   // Magenta
    { r: 180, g: 0, b: 255 },   // Purple
    { r: 100, g: 0, b: 255 },   // Deep purple
    { r: 0, g: 255, b: 255 },   // Cyan
    { r: 0, g: 180, b: 255 },   // Light blue
    { r: 0, g: 100, b: 255 }    // Blue
  ];
  
  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.plasmaData = ctx.createImageData(width, height);
  }
  
  update(dt: number, intensity = 1) {
    this.time += dt;
    this.colorCycle = (this.colorCycle + dt * 30) % 360;
    
    // Update energy fields
    for (let i = this.energyFields.length - 1; i >= 0; i--) {
      const field = this.energyFields[i];
      field.intensity -= dt;
      field.radius += dt * 50;
      if (field.intensity <= 0) {
        this.energyFields.splice(i, 1);
      }
    }
  }
  
  draw() {
    this.drawPlasmaBackground();
    this.drawGrid();
    this.drawEnergyFields();
  }
  
  private drawPlasmaBackground() {
    const data = this.plasmaData.data;
    const w = this.width;
    const h = this.height;
    
    // Electric plasma parameters
    const t = this.time * 2;
    const frequency = 0.05;
    const amplitude = 30;
    
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4;
        
        // Enhanced plasma pattern with electric arcs
        const dx = x - w/2;
        const dy = y - h/2;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Base plasma waves
        const v1 = Math.sin((x * frequency + t) * 2);
        const v2 = Math.sin((y * frequency + t) * 2);
        const v3 = Math.sin(((x + y) * frequency + t) * 1.5);
        const v4 = Math.sin(dist * frequency * 2 + t);
        
        // Electric arcs
        const arc1 = Math.sin(Math.atan2(dy, dx) * 8 + t * 3) * 0.5;
        const arc2 = Math.cos(dist * frequency + t * 2) * 0.5;
        
        // Combine effects with electric emphasis
        let value = (
          v1 * 0.3 +
          v2 * 0.3 +
          v3 * 0.2 +
          v4 * 0.3 +
          arc1 * 0.4 +
          arc2 * 0.4
        ) * 0.5 + 0.5;
        
        // Add high-frequency noise for electric effect
        value += (Math.random() * 0.1 - 0.05);
        value = Math.max(0, Math.min(1, value));
        
        // Color interpolation
        const colorIndex = Math.floor(value * (this.PLASMA_COLORS.length - 1));
        const nextColorIndex = Math.min(this.PLASMA_COLORS.length - 1, colorIndex + 1);
        const blend = value * (this.PLASMA_COLORS.length - 1) - colorIndex;
        
        const c1 = this.PLASMA_COLORS[colorIndex];
        const c2 = this.PLASMA_COLORS[nextColorIndex];
        
        // Smooth color transition
        data[i] = Math.round(c1.r * (1 - blend) + c2.r * blend);
        data[i+1] = Math.round(c1.g * (1 - blend) + c2.g * blend);
        data[i+2] = Math.round(c1.b * (1 - blend) + c2.b * blend);
        data[i+3] = 255;
      }
    }
    
    this.ctx.putImageData(this.plasmaData, 0, 0);
    
    // Add electric glow overlay
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    const gradient = this.ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    gradient.addColorStop(0, 'rgba(255, 0, 255, 0.1)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 255, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.restore();
  }
  
  private drawGrid() {
    this.ctx.save();
    
    const cellSize = 32;
    const lineWidth = 2;
    const glowSize = 4;
    const baseAlpha = 0.3;
    const pulseAlpha = 0.2;
    const pulseSpeed = 3;
    
    // Draw glowing grid lines
    for (let pass = 0; pass < 3; pass++) {
      this.ctx.globalCompositeOperation = pass === 0 ? 'source-over' : 'screen';
      
      // Vertical lines
      for (let x = 0; x < this.width; x += cellSize) {
        const distFromCenter = Math.abs(x - this.width/2) / this.width;
        const pulse = Math.sin(this.time * pulseSpeed + x / 50);
        const alpha = baseAlpha + pulseAlpha * pulse * (1 - distFromCenter);
        
        // Outer glow
        if (pass === 0) {
          const gradient = this.ctx.createLinearGradient(x - glowSize, 0, x + glowSize, 0);
          gradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
          gradient.addColorStop(0.5, `rgba(0, 255, 255, ${alpha * 0.5})`);
          gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
          this.ctx.strokeStyle = gradient;
          this.ctx.lineWidth = glowSize * 2;
        } 
        // Inner bright line
        else if (pass === 1) {
          this.ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
          this.ctx.lineWidth = lineWidth;
        }
        // Core highlight
        else {
          this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
          this.ctx.lineWidth = lineWidth / 2;
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.height);
        this.ctx.stroke();
      }
      
      // Horizontal lines
      for (let y = 0; y < this.height; y += cellSize) {
        const distFromCenter = Math.abs(y - this.height/2) / this.height;
        const pulse = Math.sin(this.time * pulseSpeed + y / 50);
        const alpha = baseAlpha + pulseAlpha * pulse * (1 - distFromCenter);
        
        // Outer glow
        if (pass === 0) {
          const gradient = this.ctx.createLinearGradient(0, y - glowSize, 0, y + glowSize);
          gradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
          gradient.addColorStop(0.5, `rgba(0, 255, 255, ${alpha * 0.5})`);
          gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
          this.ctx.strokeStyle = gradient;
          this.ctx.lineWidth = glowSize * 2;
        }
        // Inner bright line
        else if (pass === 1) {
          this.ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
          this.ctx.lineWidth = lineWidth;
        }
        // Core highlight
        else {
          this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
          this.ctx.lineWidth = lineWidth / 2;
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
        this.ctx.stroke();
      }
    }
    
    this.ctx.restore();
  }
  
  private drawEnergyFields() {
    this.ctx.save();
    
    for (const field of this.energyFields) {
      const gradient = this.ctx.createRadialGradient(
        field.x, field.y, 0,
        field.x, field.y, field.radius
      );
      
      const alpha = field.intensity * 0.3;
      gradient.addColorStop(0, `rgba(51, 204, 255, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(51, 102, 255, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(51, 51, 255, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }
  
  addEnergyField(x: number, y: number, intensity = 1) {
    this.energyFields.push({
      x,
      y,
      intensity,
      radius: 20
    });
  }
  
  private hexToRgb(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }
}
