import type { VisualProfile } from './ProceduralSprites';

// Background themes that change every few waves (like original Apeiron)
export type BackgroundTheme = 'field' | 'desert' | 'ocean' | 'neon' | 'cosmic' | 'toxic';

export class BackgroundEffects {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private time = 0;
  private energyFields: { x: number; y: number; intensity: number; radius: number }[] = [];
  private xCanvas: HTMLCanvasElement;
  private classicCanvas: HTMLCanvasElement;
  private profile: VisualProfile = 'x';
  private currentWave = 1;
  private currentTheme: BackgroundTheme = 'field';
  private themeCanvases: Map<BackgroundTheme, HTMLCanvasElement> = new Map();
  private classicThemeCanvases: Map<BackgroundTheme, HTMLCanvasElement> = new Map();

  // Themes cycle every 4 waves
  private static readonly THEMES: BackgroundTheme[] = ['field', 'desert', 'ocean', 'neon', 'cosmic', 'toxic'];
  private static readonly WAVES_PER_THEME = 4;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.xCanvas = this.buildFieldCanvas(width, height, 'x');
    this.classicCanvas = this.buildFieldCanvas(width, height, 'classic');

    // Pre-build theme canvases
    for (const theme of BackgroundEffects.THEMES) {
      this.themeCanvases.set(theme, this.buildThemedCanvas(width, height, 'x', theme));
      this.classicThemeCanvases.set(theme, this.buildThemedCanvas(width, height, 'classic', theme));
    }
  }

  setWave(wave: number) {
    this.currentWave = wave;
    const themeIndex = Math.floor((wave - 1) / BackgroundEffects.WAVES_PER_THEME) % BackgroundEffects.THEMES.length;
    this.currentTheme = BackgroundEffects.THEMES[themeIndex];
  }

  getTheme(): BackgroundTheme {
    return this.currentTheme;
  }

  update(dt: number, intensity = 1) {
    this.time += dt * Math.max(0.2, intensity * 0.2);

    for (let i = this.energyFields.length - 1; i >= 0; i--) {
      const field = this.energyFields[i];
      field.intensity -= dt * 1.6;
      field.radius += dt * 48;
      if (field.intensity <= 0) this.energyFields.splice(i, 1);
    }
  }

  draw() {
    this.drawFieldBackground();
    this.drawEnergyFields();
  }

  setProfile(profile: VisualProfile) {
    this.profile = profile;
  }

  addEnergyField(x: number, y: number, intensity = 1) {
    this.energyFields.push({
      x,
      y,
      intensity,
      radius: 14
    });
  }

  private drawFieldBackground() {
    // Use themed background based on current wave
    const themeCanvas = this.profile === 'classic'
      ? this.classicThemeCanvases.get(this.currentTheme)
      : this.themeCanvases.get(this.currentTheme);

    if (themeCanvas) {
      this.ctx.drawImage(themeCanvas, 0, 0);
    } else {
      this.ctx.drawImage(this.profile === 'classic' ? this.classicCanvas : this.xCanvas, 0, 0);
    }

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'soft-light';
    const sweep = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    if (this.profile === 'classic') {
      sweep.addColorStop(0, 'rgba(255, 221, 128, 0.14)');
      sweep.addColorStop(0.5, 'rgba(255, 206, 98, 0.05)');
      sweep.addColorStop(1, 'rgba(130, 84, 20, 0.1)');
    } else {
      sweep.addColorStop(0, 'rgba(210, 236, 156, 0.12)');
      sweep.addColorStop(0.5, 'rgba(143, 184, 96, 0.04)');
      sweep.addColorStop(1, 'rgba(52, 83, 36, 0.11)');
    }
    this.ctx.fillStyle = sweep;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();

    this.ctx.save();
    const vignette = this.ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.5,
      this.width * 0.22,
      this.width * 0.5,
      this.height * 0.5,
      this.width * 0.86
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, this.profile === 'classic' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.12)');
    this.ctx.fillStyle = vignette;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  private drawEnergyFields() {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    for (const field of this.energyFields) {
      const alpha = Math.max(0, field.intensity * 0.2);
      const gradient = this.ctx.createRadialGradient(
        field.x,
        field.y,
        0,
        field.x,
        field.y,
        field.radius
      );
      if (this.profile === 'classic') {
        gradient.addColorStop(0, `rgba(195, 255, 170, ${alpha})`);
        gradient.addColorStop(0.45, `rgba(80, 178, 105, ${alpha * 0.45})`);
        gradient.addColorStop(1, 'rgba(45, 134, 76, 0)');
      } else {
        gradient.addColorStop(0, `rgba(255, 220, 160, ${alpha})`);
        gradient.addColorStop(0.45, `rgba(255, 140, 80, ${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 120, 60, 0)');
      }

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private buildFieldCanvas(w: number, h: number, profile: VisualProfile): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const tctx = canvas.getContext('2d');
    if (!tctx) return canvas;

    const img = tctx.createImageData(w, h);
    const data = img.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const nx = x / w;
        const ny = y / h;
        const broad = this.fbm(nx * 4.0 + 12.1, ny * 4.2 + 2.8, 5);
        const medium = this.fbm(nx * 14.0 + 9.4, ny * 13.5 + 5.6, 4);
        const fine = this.fbm(nx * 38.0 + 19.6, ny * 35.0 + 7.4, 3);
        const blades = Math.sin((x * 0.11 + y * 0.46) + medium * 5.2) * 0.5 + 0.5;
        const grain = this.hash(x * 0.41 + 1.7, y * 0.53 + 9.2);
        const mix = broad * 0.45 + medium * 0.28 + fine * 0.17 + blades * 0.07 + grain * 0.03;

        let r = 0;
        let g = 0;
        let b = 0;
        if (profile === 'classic') {
          const warm = Math.sin((x * 0.12 + y * 0.1) * 0.11 + medium * 2.6) * 0.5 + 0.5;
          r = 184 + Math.floor(mix * 70 + warm * 22);
          g = 140 + Math.floor(mix * 56 + warm * 14);
          b = 26 + Math.floor(mix * 20 + warm * 6);
        } else {
          const lush = Math.sin((x * 0.09 + y * 0.15) * 0.12 + medium * 2.7) * 0.5 + 0.5;
          r = 115 + Math.floor(mix * 38 + lush * 9);
          g = 151 + Math.floor(mix * 52 + lush * 15);
          b = 83 + Math.floor(mix * 24 + lush * 8);
        }

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
        data[i + 3] = 255;
      }
    }

    tctx.putImageData(img, 0, 0);

    tctx.strokeStyle = profile === 'classic' ? 'rgba(165, 114, 23, 0.17)' : 'rgba(57, 97, 51, 0.17)';
    tctx.lineWidth = 1;
    const bladeCount = profile === 'classic' ? Math.floor((w * h) / 9) : Math.floor((w * h) / 6);
    for (let i = 0; i < bladeCount; i++) {
      const rx = this.hash(i * 0.73 + 6, i * 1.97 + 8);
      const ry = this.hash(i * 1.29 + 3, i * 0.41 + 17);
      const rr = this.hash(i * 2.43 + 9, i * 0.19 + 11);
      const x = rx * w;
      const y = ry * h;
      const len = 2.6 + rr * (profile === 'classic' ? 6.2 : 6.9);
      tctx.beginPath();
      tctx.moveTo(x, y);
      tctx.lineTo(x + (rr - 0.5) * (profile === 'classic' ? 2.2 : 2.8), y - len);
      tctx.stroke();
    }

    tctx.fillStyle = profile === 'classic' ? 'rgba(187, 131, 22, 0.09)' : 'rgba(74, 111, 48, 0.07)';
    for (let i = 0; i < (profile === 'classic' ? 520 : 360); i++) {
      const cx = this.hash(i * 0.43, i * 1.87) * w;
      const cy = this.hash(i * 1.61, i * 0.57) * h;
      const rw = 5 + this.hash(i * 2.71, i * 1.03) * (profile === 'classic' ? 16 : 12);
      const rh = 3 + this.hash(i * 0.97, i * 2.31) * (profile === 'classic' ? 9 : 7);
      tctx.beginPath();
      tctx.ellipse(cx, cy, rw, rh, this.hash(i * 1.4, i * 0.8) * 0.5 - 0.25, 0, Math.PI * 2);
      tctx.fill();
    }

    tctx.fillStyle = profile === 'classic' ? 'rgba(236, 191, 77, 0.1)' : 'rgba(183, 214, 132, 0.08)';
    for (let i = 0; i < (profile === 'classic' ? 400 : 280); i++) {
      const cx = this.hash(i * 0.97, i * 1.13) * w;
      const cy = this.hash(i * 1.61, i * 0.77) * h;
      const r = 3 + this.hash(i * 0.57, i * 2.11) * (profile === 'classic' ? 8 : 6);
      tctx.beginPath();
      tctx.ellipse(cx, cy, r * 1.25, r * 0.65, this.hash(i * 0.31, i * 1.91) * 0.5 - 0.25, 0, Math.PI * 2);
      tctx.fill();
    }

    tctx.fillStyle = profile === 'classic' ? 'rgba(134, 86, 13, 0.07)' : 'rgba(47, 75, 33, 0.06)';
    for (let i = 0; i < (profile === 'classic' ? 320 : 240); i++) {
      const cx = this.hash(i * 1.19, i * 0.83) * w;
      const cy = this.hash(i * 0.61, i * 1.77) * h;
      const rw = 7 + this.hash(i * 0.31, i * 2.47) * (profile === 'classic' ? 18 : 14);
      const rh = 4 + this.hash(i * 1.57, i * 0.49) * (profile === 'classic' ? 10 : 8);
      tctx.beginPath();
      tctx.ellipse(cx, cy, rw, rh, this.hash(i * 0.87, i * 0.67) * 0.45 - 0.22, 0, Math.PI * 2);
      tctx.fill();
    }

    tctx.save();
    tctx.globalCompositeOperation = 'multiply';
    tctx.strokeStyle = profile === 'classic' ? 'rgba(114, 74, 10, 0.09)' : 'rgba(34, 63, 30, 0.09)';
    for (let i = 0; i < 2000; i++) {
      const x = this.hash(i * 0.63, i * 1.97) * w;
      const y = this.hash(i * 1.17, i * 0.41) * h;
      const len = 2.5 + this.hash(i * 2.31, i * 1.03) * 7;
      const angle = profile === 'classic'
        ? -1.42 + this.hash(i * 0.17, i * 2.91) * 0.86
        : -1.28 + this.hash(i * 0.17, i * 2.91) * 0.82;
      tctx.beginPath();
      tctx.moveTo(x, y);
      tctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      tctx.stroke();
    }
    tctx.restore();

    tctx.save();
    tctx.globalCompositeOperation = 'soft-light';
    for (let i = 0; i < 7; i++) {
      const px = this.hash(i * 1.2 + 17, i * 0.7 + 3) * w;
      const py = this.hash(i * 0.3 + 29, i * 1.8 + 5) * h;
      const radius = Math.max(w, h) * (0.12 + this.hash(i * 0.9 + 4, i * 1.5 + 8) * 0.18);
      const glow = tctx.createRadialGradient(px, py, 8, px, py, radius);
      if (profile === 'classic') {
        glow.addColorStop(0, 'rgba(255, 224, 118, 0.12)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
      } else {
        glow.addColorStop(0, 'rgba(198, 234, 146, 0.1)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
      }
      tctx.fillStyle = glow;
      tctx.fillRect(0, 0, w, h);
    }
    tctx.restore();

    return canvas;
  }

  private hash(x: number, y: number): number {
    const n = Math.sin((x * 127.1 + y * 311.7) * 0.07) * 43758.5453;
    return n - Math.floor(n);
  }

  private smooth(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private valueNoise(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const sx = this.smooth(x - x0);
    const sy = this.smooth(y - y0);

    const n00 = this.hash(x0, y0);
    const n10 = this.hash(x1, y0);
    const n01 = this.hash(x0, y1);
    const n11 = this.hash(x1, y1);

    const nx0 = this.lerp(n00, n10, sx);
    const nx1 = this.lerp(n01, n11, sx);
    return this.lerp(nx0, nx1, sy);
  }

  private fbm(x: number, y: number, octaves: number): number {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.valueNoise(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return norm > 0 ? sum / norm : 0;
  }

  private buildThemedCanvas(w: number, h: number, profile: VisualProfile, theme: BackgroundTheme): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const tctx = canvas.getContext('2d');
    if (!tctx) return canvas;

    const img = tctx.createImageData(w, h);
    const data = img.data;

    // Theme color palettes
    const palettes: Record<BackgroundTheme, { base: [number, number, number]; accent: [number, number, number]; dark: [number, number, number] }> = {
      field: {
        base: profile === 'classic' ? [184, 140, 26] : [115, 151, 83],
        accent: profile === 'classic' ? [236, 191, 77] : [183, 214, 132],
        dark: profile === 'classic' ? [134, 86, 13] : [47, 75, 33]
      },
      desert: {
        base: [210, 170, 110],
        accent: [240, 200, 140],
        dark: [160, 120, 70]
      },
      ocean: {
        base: [40, 100, 140],
        accent: [80, 160, 200],
        dark: [20, 60, 100]
      },
      neon: {
        base: [40, 20, 60],
        accent: [200, 80, 200],
        dark: [20, 10, 40]
      },
      cosmic: {
        base: [20, 15, 40],
        accent: [100, 80, 180],
        dark: [10, 5, 25]
      },
      toxic: {
        base: [60, 80, 40],
        accent: [150, 220, 80],
        dark: [30, 50, 20]
      }
    };

    const pal = palettes[theme];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const nx = x / w;
        const ny = y / h;
        const broad = this.fbm(nx * 4.0 + 12.1, ny * 4.2 + 2.8, 5);
        const medium = this.fbm(nx * 14.0 + 9.4, ny * 13.5 + 5.6, 4);
        const fine = this.fbm(nx * 38.0 + 19.6, ny * 35.0 + 7.4, 3);
        const blades = Math.sin((x * 0.11 + y * 0.46) + medium * 5.2) * 0.5 + 0.5;
        const grain = this.hash(x * 0.41 + 1.7, y * 0.53 + 9.2);
        const mix = broad * 0.45 + medium * 0.28 + fine * 0.17 + blades * 0.07 + grain * 0.03;

        const r = pal.base[0] + Math.floor(mix * (pal.accent[0] - pal.base[0]) * 0.7);
        const g = pal.base[1] + Math.floor(mix * (pal.accent[1] - pal.base[1]) * 0.7);
        const b = pal.base[2] + Math.floor(mix * (pal.accent[2] - pal.base[2]) * 0.7);

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
        data[i + 3] = 255;
      }
    }

    tctx.putImageData(img, 0, 0);

    // Add theme-specific details
    const detailColor = `rgba(${pal.dark[0]}, ${pal.dark[1]}, ${pal.dark[2]}, 0.15)`;
    const accentColor = `rgba(${pal.accent[0]}, ${pal.accent[1]}, ${pal.accent[2]}, 0.1)`;

    tctx.strokeStyle = detailColor;
    tctx.lineWidth = 1;
    const detailCount = Math.floor((w * h) / 8);
    for (let i = 0; i < detailCount; i++) {
      const rx = this.hash(i * 0.73 + 6, i * 1.97 + 8);
      const ry = this.hash(i * 1.29 + 3, i * 0.41 + 17);
      const rr = this.hash(i * 2.43 + 9, i * 0.19 + 11);
      const px = rx * w;
      const py = ry * h;
      const len = 2 + rr * 6;
      tctx.beginPath();
      tctx.moveTo(px, py);
      tctx.lineTo(px + (rr - 0.5) * 2.5, py - len);
      tctx.stroke();
    }

    // Accent patches
    tctx.fillStyle = accentColor;
    for (let i = 0; i < 400; i++) {
      const cx = this.hash(i * 0.43, i * 1.87) * w;
      const cy = this.hash(i * 1.61, i * 0.57) * h;
      const rw = 5 + this.hash(i * 2.71, i * 1.03) * 14;
      const rh = 3 + this.hash(i * 0.97, i * 2.31) * 8;
      tctx.beginPath();
      tctx.ellipse(cx, cy, rw, rh, this.hash(i * 1.4, i * 0.8) * 0.5 - 0.25, 0, Math.PI * 2);
      tctx.fill();
    }

    // Theme-specific effects
    if (theme === 'neon') {
      // Neon glow lines
      tctx.strokeStyle = 'rgba(255, 0, 255, 0.1)';
      tctx.lineWidth = 2;
      for (let i = 0; i < 20; i++) {
        const sx = this.hash(i * 0.7, i * 1.3) * w;
        const sy = this.hash(i * 1.1, i * 0.9) * h;
        tctx.beginPath();
        tctx.moveTo(sx, sy);
        tctx.lineTo(sx + this.hash(i * 0.3, i * 2.1) * 100 - 50, sy + this.hash(i * 1.7, i * 0.5) * 100 - 50);
        tctx.stroke();
      }
    } else if (theme === 'cosmic') {
      // Stars
      tctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (let i = 0; i < 100; i++) {
        const sx = this.hash(i * 0.37, i * 1.93) * w;
        const sy = this.hash(i * 1.67, i * 0.43) * h;
        const sr = 0.5 + this.hash(i * 0.9, i * 1.7) * 1.5;
        tctx.beginPath();
        tctx.arc(sx, sy, sr, 0, Math.PI * 2);
        tctx.fill();
      }
    } else if (theme === 'ocean') {
      // Wave patterns
      tctx.strokeStyle = 'rgba(100, 200, 255, 0.15)';
      tctx.lineWidth = 1.5;
      for (let i = 0; i < 15; i++) {
        const baseY = (i / 15) * h;
        tctx.beginPath();
        for (let px = 0; px < w; px += 5) {
          const py = baseY + Math.sin(px * 0.03 + i) * 8;
          if (px === 0) tctx.moveTo(px, py);
          else tctx.lineTo(px, py);
        }
        tctx.stroke();
      }
    }

    // Vignette
    tctx.save();
    const vignette = tctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.2, w * 0.5, h * 0.5, w * 0.85);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.15)');
    tctx.fillStyle = vignette;
    tctx.fillRect(0, 0, w, h);
    tctx.restore();

    return canvas;
  }
}
