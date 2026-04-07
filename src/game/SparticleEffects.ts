// Enhanced particle effects using Sparticles library
// Provides beautiful, performant particle effects for background ambiance

import Sparticles from 'sparticles';
import {
  PARTICLE_COLOR_SCHEMES,
  PERFORMANCE_PRESETS,
  type PerformanceLevel
} from '../../lib/particles';

export interface SparticleConfig {
  count: number;
  speed: number;
  color: string | string[];
  size: number | { min: number; max: number };
  direction: number;
  shape: 'circle' | 'square' | 'star' | 'line' | 'triangle';
  glow: number;
  drift: number;
  rotate: boolean;
  parallax: number;
  bounce: boolean;
  twinkle: boolean;
}

// Extended theme type including background themes
export type SparticleTheme = 'cosmic' | 'neon' | 'classic' | 'psychedelic' | 'toxic' | 'ocean' | 'fire' | 'ice';

export class SparticleEffects {
  private container: HTMLElement | null = null;
  private sparticles: Sparticles | null = null;
  private currentTheme: SparticleTheme = 'cosmic';
  private enabled = true;
  private intensity: PerformanceLevel = 'medium';
  private canvas: HTMLCanvasElement | null = null;

  // Theme configurations for different visual moods - matching game backgrounds
  private static readonly THEMES: Record<SparticleTheme, Partial<SparticleConfig>> = {
    cosmic: {
      count: 120,
      speed: 0.5,
      color: PARTICLE_COLOR_SCHEMES.cosmic,
      size: { min: 1, max: 3 },
      shape: 'circle',
      glow: 15,
      drift: 1,
      rotate: false,
      parallax: 0.8,
      twinkle: true,
      direction: 180
    },
    neon: {
      count: 80,
      speed: 0.8,
      color: PARTICLE_COLOR_SCHEMES.neon,
      size: { min: 2, max: 4 },
      shape: 'circle',
      glow: 25,
      drift: 2,
      rotate: true,
      parallax: 0.6,
      twinkle: true,
      direction: 180
    },
    classic: {
      count: 60,
      speed: 0.3,
      color: PARTICLE_COLOR_SCHEMES.classic,
      size: { min: 1, max: 2 },
      shape: 'circle',
      glow: 8,
      drift: 0.5,
      rotate: false,
      parallax: 0.4,
      twinkle: false,
      direction: 180
    },
    psychedelic: {
      count: 150,
      speed: 1.2,
      color: PARTICLE_COLOR_SCHEMES.psychedelic,
      size: { min: 2, max: 5 },
      shape: 'star',
      glow: 30,
      drift: 3,
      rotate: true,
      parallax: 1.0,
      twinkle: true,
      direction: 0
    },
    toxic: {
      count: 90,
      speed: 0.6,
      color: PARTICLE_COLOR_SCHEMES.toxic,
      size: { min: 1, max: 4 },
      shape: 'circle',
      glow: 20,
      drift: 2,
      rotate: false,
      parallax: 0.5,
      twinkle: false,
      direction: 90
    },
    ocean: {
      count: 100,
      speed: 0.4,
      color: PARTICLE_COLOR_SCHEMES.ocean,
      size: { min: 1, max: 3 },
      shape: 'circle',
      glow: 12,
      drift: 1.5,
      rotate: false,
      parallax: 0.7,
      twinkle: true,
      direction: 180
    },
    fire: {
      count: 70,
      speed: 1.0,
      color: PARTICLE_COLOR_SCHEMES.fire,
      size: { min: 2, max: 5 },
      shape: 'circle',
      glow: 22,
      drift: 1,
      rotate: false,
      parallax: 0.3,
      twinkle: false,
      direction: 0
    },
    ice: {
      count: 80,
      speed: 0.2,
      color: PARTICLE_COLOR_SCHEMES.ice,
      size: { min: 1, max: 3 },
      shape: 'circle',
      glow: 10,
      drift: 0.8,
      rotate: false,
      parallax: 0.9,
      twinkle: true,
      direction: 180
    }
  };

  // Use performance presets from lib/particles
  private static readonly INTENSITY_MULTIPLIERS = {
    low: PERFORMANCE_PRESETS.low.countMultiplier,
    medium: PERFORMANCE_PRESETS.medium.countMultiplier,
    high: PERFORMANCE_PRESETS.high.countMultiplier
  };

  constructor() {
    // Will be initialized when attached to a container
  }

  attach(container: HTMLElement): void {
    this.container = container;
    if (this.enabled) {
      this.initSparticles();
    }
  }

  detach(): void {
    this.destroy();
    this.container = null;
  }

  private initSparticles(): void {
    if (!this.container || !this.enabled) return;

    // Clean up existing instance
    this.destroy();

    const theme = SparticleEffects.THEMES[this.currentTheme];
    const intensityMult = SparticleEffects.INTENSITY_MULTIPLIERS[this.intensity];
    const perf = PERFORMANCE_PRESETS[this.intensity];

    // Create canvas element for sparticles
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '0';
    this.container.insertBefore(this.canvas, this.container.firstChild);

    try {
      this.sparticles = new Sparticles(this.canvas, {
        count: Math.floor((theme.count || 100) * intensityMult),
        speed: (theme.speed || 0.5) * perf.speedMultiplier,
        color: theme.color || '#ffffff',
        minSize: typeof theme.size === 'object' ? theme.size.min : 1,
        maxSize: typeof theme.size === 'object' ? theme.size.max : 3,
        shape: theme.shape || 'circle',
        glow: perf.glowEnabled ? (theme.glow || 0) : 0,
        drift: theme.drift || 0,
        rotate: theme.rotate || false,
        parallax: perf.parallaxEnabled ? (theme.parallax || 0) : 0,
        twinkle: perf.twinkleEnabled && (theme.twinkle || false),
        direction: theme.direction || 180,
        bounce: theme.bounce || false,
        alphaSpeed: 5,
        alphaVariance: 0.5,
        style: 'fill'
      });
    } catch (e) {
      console.warn('Failed to initialize Sparticles:', e);
    }
  }

  setTheme(theme: SparticleTheme): void {
    if (theme !== this.currentTheme) {
      this.currentTheme = theme;
      this.initSparticles();
    }
  }

  setThemeFromWave(wave: number): void {
    // Cycle through themes every 4 waves - extended with new themes
    const themeIndex = Math.floor((wave - 1) / 4) % 8;
    const themes: SparticleTheme[] = [
      'cosmic', 'neon', 'classic', 'psychedelic', 'toxic', 'ocean', 'fire', 'ice'
    ];
    this.setTheme(themes[themeIndex]);
  }

  /**
   * Set theme from background theme name
   */
  setThemeFromBackground(backgroundTheme: string): void {
    const themeMap: Record<string, SparticleTheme> = {
      field: 'classic',
      desert: 'fire',
      ocean: 'ocean',
      neon: 'neon',
      cosmic: 'cosmic',
      toxic: 'toxic'
    };
    const theme = themeMap[backgroundTheme] || 'cosmic';
    this.setTheme(theme);
  }

  setIntensity(intensity: PerformanceLevel): void {
    if (intensity !== this.intensity) {
      this.intensity = intensity;
      this.initSparticles();
    }
  }

  /**
   * Get current theme
   */
  getTheme(): SparticleTheme {
    return this.currentTheme;
  }

  /**
   * Get current intensity level
   */
  getIntensity(): PerformanceLevel {
    return this.intensity;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled && this.container) {
      this.initSparticles();
    } else {
      this.destroy();
    }
  }

  destroy(): void {
    if (this.sparticles) {
      this.sparticles.destroy();
      this.sparticles = null;
    }
    if (this.canvas?.parentNode) {
      this.canvas.remove();
      this.canvas = null;
    }
  }

  /**
   * Update sparticles options dynamically
   */
  updateOptions(options: Partial<{
    count: number;
    speed: number;
    color: string | string[];
    glow: number;
    drift: number;
    twinkle: boolean;
  }>): void {
    if (this.sparticles) {
      this.sparticles.setOptions(options);
    }
  }

  /**
   * Set custom colors for current theme
   */
  setColors(colors: string[]): void {
    if (this.sparticles) {
      this.sparticles.setOptions({ color: colors });
    }
  }

  /**
   * Check if sparticles is active
   */
  isActive(): boolean {
    return this.enabled && this.sparticles !== null;
  }

  // Trigger a burst effect at a specific location
  burst(x: number, y: number, color: string, count: number = 20): void {
    // Sparticles doesn't support per-instance burst, so we use canvas particles
    // This is handled by the main ParticleSystem for gameplay effects
  }
}

// Create singleton instance
export const sparticleEffects = new SparticleEffects();

// Re-export types for convenience
export type { PerformanceLevel };
