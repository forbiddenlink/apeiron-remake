// Sparticles integration for Apeiron game
// Provides configurable particle effects with game-appropriate settings

import Sparticles from 'sparticles';

// Color schemes matching game aesthetic
export const PARTICLE_COLOR_SCHEMES: Record<string, string[]> = {
  cosmic: ['#ffffff', '#87ceeb', '#4169e1', '#9370db', '#e6e6fa'],
  neon: ['#ff00ff', '#00ffff', '#ff6600', '#00ff00', '#ff3399'],
  classic: ['#ffd700', '#ffb347', '#ff6b6b', '#daa520', '#f4a460'],
  psychedelic: ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0077ff', '#7700ff', '#ff00ff'],
  toxic: ['#39ff14', '#7fff00', '#adff2f', '#32cd32', '#00ff7f'],
  ocean: ['#00bfff', '#1e90ff', '#4169e1', '#6495ed', '#87ceeb'],
  fire: ['#ff4500', '#ff6347', '#ff7f50', '#ffa500', '#ffb347'],
  ice: ['#e0ffff', '#b0e0e6', '#add8e6', '#87ceeb', '#00bfff'],
  energy: ['#ff1744', '#40c4ff', '#ffd700', '#64ffda', '#ff4081']
};

export type ColorScheme = 'cosmic' | 'neon' | 'classic' | 'psychedelic' | 'toxic' | 'ocean' | 'fire' | 'ice' | 'energy';

// Performance presets based on device capability
export const PERFORMANCE_PRESETS = {
  low: {
    countMultiplier: 0.3,
    speedMultiplier: 0.8,
    glowEnabled: false,
    twinkleEnabled: false,
    parallaxEnabled: false
  },
  medium: {
    countMultiplier: 1.0,
    speedMultiplier: 1.0,
    glowEnabled: true,
    twinkleEnabled: true,
    parallaxEnabled: true
  },
  high: {
    countMultiplier: 2.0,
    speedMultiplier: 1.0,
    glowEnabled: true,
    twinkleEnabled: true,
    parallaxEnabled: true
  }
} as const;

export type PerformanceLevel = keyof typeof PERFORMANCE_PRESETS;

// Particle effect presets
export interface ParticlePreset {
  count: number;
  speed: number;
  color: string | string[];
  minSize: number;
  maxSize: number;
  shape: 'circle' | 'square' | 'star' | 'line' | 'triangle';
  glow: number;
  drift: number;
  rotate: boolean;
  parallax: number;
  twinkle: boolean;
  direction: number;
  bounce: boolean;
  alphaSpeed: number;
  alphaVariance: number;
}

export const PARTICLE_PRESETS: Record<string, ParticlePreset> = {
  // Explosion burst effect
  explosion: {
    count: 60,
    speed: 3.0,
    color: PARTICLE_COLOR_SCHEMES.fire,
    minSize: 2,
    maxSize: 6,
    shape: 'circle',
    glow: 20,
    drift: 0,
    rotate: false,
    parallax: 0,
    twinkle: false,
    direction: 0,
    bounce: false,
    alphaSpeed: 8,
    alphaVariance: 0.5
  },

  // Trailing particles
  trail: {
    count: 30,
    speed: 0.5,
    color: PARTICLE_COLOR_SCHEMES.energy,
    minSize: 1,
    maxSize: 3,
    shape: 'circle',
    glow: 10,
    drift: 1,
    rotate: false,
    parallax: 0.5,
    twinkle: true,
    direction: 180,
    bounce: false,
    alphaSpeed: 5,
    alphaVariance: 0.3
  },

  // Ambient background particles
  ambient: {
    count: 80,
    speed: 0.3,
    color: PARTICLE_COLOR_SCHEMES.cosmic,
    minSize: 1,
    maxSize: 3,
    shape: 'circle',
    glow: 15,
    drift: 1,
    rotate: false,
    parallax: 0.8,
    twinkle: true,
    direction: 180,
    bounce: false,
    alphaSpeed: 3,
    alphaVariance: 0.4
  },

  // Powerup collection effect
  powerup: {
    count: 40,
    speed: 2.0,
    color: PARTICLE_COLOR_SCHEMES.energy,
    minSize: 2,
    maxSize: 5,
    shape: 'star',
    glow: 25,
    drift: 2,
    rotate: true,
    parallax: 0,
    twinkle: true,
    direction: 0,
    bounce: false,
    alphaSpeed: 6,
    alphaVariance: 0.5
  },

  // Sparkle effect for collectibles
  sparkle: {
    count: 25,
    speed: 1.0,
    color: ['#ffffff', '#ffd700', '#ffff00'],
    minSize: 1,
    maxSize: 4,
    shape: 'star',
    glow: 30,
    drift: 1.5,
    rotate: true,
    parallax: 0,
    twinkle: true,
    direction: 0,
    bounce: false,
    alphaSpeed: 10,
    alphaVariance: 0.6
  },

  // Toxic/poison effect
  toxic: {
    count: 35,
    speed: 0.8,
    color: PARTICLE_COLOR_SCHEMES.toxic,
    minSize: 2,
    maxSize: 4,
    shape: 'circle',
    glow: 18,
    drift: 2,
    rotate: false,
    parallax: 0.3,
    twinkle: false,
    direction: 0,
    bounce: false,
    alphaSpeed: 4,
    alphaVariance: 0.4
  },

  // Neon glow effect
  neonGlow: {
    count: 50,
    speed: 0.6,
    color: PARTICLE_COLOR_SCHEMES.neon,
    minSize: 2,
    maxSize: 5,
    shape: 'circle',
    glow: 35,
    drift: 1.5,
    rotate: true,
    parallax: 0.6,
    twinkle: true,
    direction: 180,
    bounce: false,
    alphaSpeed: 4,
    alphaVariance: 0.5
  },

  // Psychedelic rainbow effect
  psychedelic: {
    count: 100,
    speed: 1.2,
    color: PARTICLE_COLOR_SCHEMES.psychedelic,
    minSize: 2,
    maxSize: 6,
    shape: 'star',
    glow: 30,
    drift: 3,
    rotate: true,
    parallax: 1.0,
    twinkle: true,
    direction: 0,
    bounce: false,
    alphaSpeed: 5,
    alphaVariance: 0.5
  }
};

export interface ParticleConfig {
  preset: keyof typeof PARTICLE_PRESETS;
  colorScheme?: ColorScheme;
  performanceLevel?: PerformanceLevel;
  intensity?: number;
  customColors?: string[];
}

/**
 * Creates sparticles options from a preset and configuration
 */
export function createParticleOptions(config: ParticleConfig): Partial<ParticlePreset> {
  const preset = PARTICLE_PRESETS[config.preset];
  const performance = PERFORMANCE_PRESETS[config.performanceLevel || 'medium'];
  const intensity = config.intensity ?? 1.0;

  const colors = config.customColors
    || (config.colorScheme ? PARTICLE_COLOR_SCHEMES[config.colorScheme] : preset.color);

  return {
    ...preset,
    count: Math.floor(preset.count * performance.countMultiplier * intensity),
    speed: preset.speed * performance.speedMultiplier,
    color: colors,
    glow: performance.glowEnabled ? preset.glow : 0,
    twinkle: performance.twinkleEnabled && preset.twinkle,
    parallax: performance.parallaxEnabled ? preset.parallax : 0
  };
}

/**
 * Particle manager for creating and managing multiple sparticle instances
 */
export class SparticleManager {
  private instances: Map<string, Sparticles> = new Map();
  private containers: Map<string, HTMLCanvasElement> = new Map();
  private performanceLevel: PerformanceLevel = 'medium';
  private globalIntensity: number = 1.0;

  constructor(performanceLevel: PerformanceLevel = 'medium') {
    this.performanceLevel = performanceLevel;
  }

  /**
   * Set global performance level
   */
  setPerformanceLevel(level: PerformanceLevel): void {
    this.performanceLevel = level;
    // Recreate all instances with new performance level
    for (const [id] of this.instances) {
      const container = this.containers.get(id);
      if (container?.parentElement) {
        const config = (this.instances.get(id) as any)?._config;
        if (config) {
          this.destroy(id);
          this.create(id, container.parentElement as HTMLElement, config);
        }
      }
    }
  }

  /**
   * Set global intensity multiplier
   */
  setIntensity(intensity: number): void {
    this.globalIntensity = Math.max(0, Math.min(2, intensity));
  }

  /**
   * Create a new sparticle instance
   */
  create(id: string, container: HTMLElement, config: ParticleConfig): Sparticles | null {
    // Clean up existing instance
    this.destroy(id);

    // Create canvas for this instance
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';
    container.appendChild(canvas);

    const options = createParticleOptions({
      ...config,
      performanceLevel: this.performanceLevel,
      intensity: (config.intensity ?? 1.0) * this.globalIntensity
    });

    try {
      const sparticles = new Sparticles(canvas, options);
      this.instances.set(id, sparticles);
      this.containers.set(id, canvas);
      // Store config for recreation
      (sparticles as any)._config = config;
      return sparticles;
    } catch (e) {
      console.warn(`Failed to create sparticles instance ${id}:`, e);
      canvas.remove();
      return null;
    }
  }

  /**
   * Get an existing instance
   */
  get(id: string): Sparticles | undefined {
    return this.instances.get(id);
  }

  /**
   * Update options for an existing instance
   */
  updateOptions(id: string, options: Partial<ParticlePreset>): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.setOptions(options);
    }
  }

  /**
   * Change color scheme for an instance
   */
  setColorScheme(id: string, scheme: ColorScheme): void {
    this.updateOptions(id, { color: PARTICLE_COLOR_SCHEMES[scheme] });
  }

  /**
   * Destroy a sparticle instance
   */
  destroy(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.destroy();
      this.instances.delete(id);
    }

    const canvas = this.containers.get(id);
    if (canvas) {
      canvas.remove();
      this.containers.delete(id);
    }
  }

  /**
   * Destroy all instances
   */
  destroyAll(): void {
    for (const [id] of this.instances) {
      this.destroy(id);
    }
  }

  /**
   * Get all active instance IDs
   */
  getActiveIds(): string[] {
    return Array.from(this.instances.keys());
  }
}

// Export singleton manager
export const particleManager = new SparticleManager();
