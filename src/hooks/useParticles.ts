import { useCallback, useEffect, useRef, useState } from 'react';
import Sparticles from 'sparticles';
import {
  PARTICLE_COLOR_SCHEMES,
  PARTICLE_PRESETS,
  PERFORMANCE_PRESETS,
  createParticleOptions,
  type ColorScheme,
  type PerformanceLevel,
  type ParticleConfig
} from '../../lib/particles';

// Particle pool entry
interface PooledParticle {
  id: string;
  instance: Sparticles;
  canvas: HTMLCanvasElement;
  inUse: boolean;
  preset: string;
  createdAt: number;
}

// Active effect tracking
interface ActiveEffect {
  id: string;
  x: number;
  y: number;
  preset: string;
  startTime: number;
  duration: number;
}

// Hook configuration
interface UseParticlesConfig {
  /** Container element for particles */
  containerRef: React.RefObject<HTMLElement>;
  /** Performance level */
  performanceLevel?: PerformanceLevel;
  /** Global intensity multiplier */
  intensity?: number;
  /** Maximum pooled particles */
  maxPoolSize?: number;
  /** Effect duration in ms */
  defaultDuration?: number;
  /** Enable particle effects */
  enabled?: boolean;
}

// Hook return type
interface UseParticlesReturn {
  /** Trigger explosion at position */
  triggerExplosion: (x: number, y: number, color?: string | string[], size?: 'small' | 'medium' | 'large') => void;
  /** Trigger trail effect */
  triggerTrail: (x: number, y: number, color?: string | string[]) => void;
  /** Trigger powerup collection effect */
  triggerPowerup: (x: number, y: number, type?: string) => void;
  /** Trigger custom preset */
  triggerPreset: (x: number, y: number, preset: keyof typeof PARTICLE_PRESETS, colors?: string[]) => void;
  /** Set color scheme for all new effects */
  setColorScheme: (scheme: ColorScheme) => void;
  /** Set performance level */
  setPerformanceLevel: (level: PerformanceLevel) => void;
  /** Set global intensity */
  setIntensity: (intensity: number) => void;
  /** Clear all active effects */
  clearAll: () => void;
  /** Get active effect count */
  activeCount: number;
  /** Get pool stats */
  poolStats: { active: number; pooled: number; total: number };
}

// Powerup type to color mapping
const POWERUP_COLORS: Record<string, string[]> = {
  guided: ['#ff1744', '#ff5252', '#ff8a80'],
  diamond: ['#40c4ff', '#80d8ff', '#b3e5fc'],
  machine_gun: ['#ffd700', '#ffeb3b', '#fff59d'],
  shield: ['#64ffda', '#a7ffeb', '#b9f6ca'],
  lock: ['#ff4081', '#ff80ab', '#fce4ec'],
  house_cleaning: ['#8bc34a', '#aed581', '#c5e1a5'],
  extra_man: ['#ffffff', '#e3f2fd', '#bbdefb']
};

/**
 * Hook for managing particle effects with object pooling
 */
export function useParticles({
  containerRef,
  performanceLevel = 'medium',
  intensity = 1.0,
  maxPoolSize = 20,
  defaultDuration = 800,
  enabled = true
}: UseParticlesConfig): UseParticlesReturn {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('fire');
  const [perfLevel, setPerfLevel] = useState<PerformanceLevel>(performanceLevel);
  const [globalIntensity, setGlobalIntensity] = useState(intensity);

  const poolRef = useRef<PooledParticle[]>([]);
  const activeEffectsRef = useRef<ActiveEffect[]>([]);
  const idCounterRef = useRef(0);

  // Generate unique ID
  const generateId = useCallback(() => {
    idCounterRef.current += 1;
    return `particle-${idCounterRef.current}-${Date.now()}`;
  }, []);

  // Get or create particle from pool
  const acquireParticle = useCallback((
    preset: string,
    x: number,
    y: number,
    colors: string[],
    duration: number
  ): PooledParticle | null => {
    if (!containerRef.current || !enabled) return null;

    const perf = PERFORMANCE_PRESETS[perfLevel];
    const presetConfig = PARTICLE_PRESETS[preset];
    if (!presetConfig) return null;

    // Try to reuse from pool
    let particle = poolRef.current.find(p => !p.inUse && p.preset === preset);

    if (!particle) {
      // Check pool size limit
      if (poolRef.current.length >= maxPoolSize) {
        // Recycle oldest inactive particle
        const inactive = poolRef.current
          .filter(p => !p.inUse)
          .sort((a, b) => a.createdAt - b.createdAt)[0];

        if (inactive) {
          inactive.instance.destroy();
          inactive.canvas.remove();
          poolRef.current = poolRef.current.filter(p => p.id !== inactive.id);
        } else {
          // All particles in use, skip
          return null;
        }
      }

      // Create new particle
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '100';
      containerRef.current.appendChild(canvas);

      const options = createParticleOptions({
        preset: preset as keyof typeof PARTICLE_PRESETS,
        performanceLevel: perfLevel,
        intensity: globalIntensity,
        customColors: colors
      });

      try {
        const instance = new Sparticles(canvas, options);
        particle = {
          id: generateId(),
          instance,
          canvas,
          inUse: false,
          preset,
          createdAt: Date.now()
        };
        poolRef.current.push(particle);
      } catch (e) {
        console.warn('Failed to create particle:', e);
        canvas.remove();
        return null;
      }
    }

    // Position and activate
    particle.inUse = true;
    particle.canvas.style.left = `${x - 60}px`;
    particle.canvas.style.top = `${y - 60}px`;
    particle.canvas.style.width = '120px';
    particle.canvas.style.height = '120px';

    // Update colors if needed
    particle.instance.setOptions({ color: colors });

    // Track active effect
    const effect: ActiveEffect = {
      id: particle.id,
      x,
      y,
      preset,
      startTime: Date.now(),
      duration
    };
    activeEffectsRef.current.push(effect);

    // Schedule release
    setTimeout(() => {
      particle!.inUse = false;
      activeEffectsRef.current = activeEffectsRef.current.filter(e => e.id !== effect.id);
    }, duration);

    return particle;
  }, [containerRef, enabled, perfLevel, globalIntensity, maxPoolSize, generateId]);

  // Trigger explosion effect
  const triggerExplosion = useCallback((
    x: number,
    y: number,
    color?: string | string[],
    size: 'small' | 'medium' | 'large' = 'medium'
  ) => {
    const sizeConfig = {
      small: { duration: 400, intensity: 0.5 },
      medium: { duration: 600, intensity: 1.0 },
      large: { duration: 800, intensity: 1.5 }
    };
    const config = sizeConfig[size];
    const colors = Array.isArray(color) ? color :
      (color ? [color] : PARTICLE_COLOR_SCHEMES[colorScheme]);

    acquireParticle('explosion', x, y, colors, config.duration);
  }, [acquireParticle, colorScheme]);

  // Trigger trail effect
  const triggerTrail = useCallback((
    x: number,
    y: number,
    color?: string | string[]
  ) => {
    const colors = Array.isArray(color) ? color :
      (color ? [color] : PARTICLE_COLOR_SCHEMES.energy);
    acquireParticle('trail', x, y, colors, 300);
  }, [acquireParticle]);

  // Trigger powerup effect
  const triggerPowerup = useCallback((
    x: number,
    y: number,
    type?: string
  ) => {
    const colors = (type && POWERUP_COLORS[type]) || PARTICLE_COLOR_SCHEMES.energy;
    acquireParticle('powerup', x, y, colors, 600);
  }, [acquireParticle]);

  // Trigger custom preset
  const triggerPreset = useCallback((
    x: number,
    y: number,
    preset: keyof typeof PARTICLE_PRESETS,
    colors?: string[]
  ) => {
    const finalColors = colors || PARTICLE_COLOR_SCHEMES[colorScheme];
    acquireParticle(preset, x, y, finalColors, defaultDuration);
  }, [acquireParticle, colorScheme, defaultDuration]);

  // Clear all effects
  const clearAll = useCallback(() => {
    for (const particle of poolRef.current) {
      particle.instance.destroy();
      particle.canvas.remove();
    }
    poolRef.current = [];
    activeEffectsRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);

  // Update performance level
  const handleSetPerformanceLevel = useCallback((level: PerformanceLevel) => {
    setPerfLevel(level);
  }, []);

  // Update intensity
  const handleSetIntensity = useCallback((newIntensity: number) => {
    setGlobalIntensity(Math.max(0, Math.min(2, newIntensity)));
  }, []);

  return {
    triggerExplosion,
    triggerTrail,
    triggerPowerup,
    triggerPreset,
    setColorScheme,
    setPerformanceLevel: handleSetPerformanceLevel,
    setIntensity: handleSetIntensity,
    clearAll,
    activeCount: activeEffectsRef.current.length,
    poolStats: {
      active: poolRef.current.filter(p => p.inUse).length,
      pooled: poolRef.current.filter(p => !p.inUse).length,
      total: poolRef.current.length
    }
  };
}

export default useParticles;
