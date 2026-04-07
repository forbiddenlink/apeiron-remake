import { useEffect, useRef, useCallback } from 'react';
import Sparticles from 'sparticles';
import { PARTICLE_COLOR_SCHEMES, PERFORMANCE_PRESETS, type PerformanceLevel, type ColorScheme } from '../../../lib/particles';

interface AmbientParticlesProps {
  /** Color scheme for ambient particles */
  colorScheme?: ColorScheme;
  /** Custom colors override */
  customColors?: string[];
  /** Particle density (0.1 to 2.0) */
  density?: number;
  /** Device performance level */
  performanceLevel?: PerformanceLevel;
  /** Enable ambient particles */
  enabled?: boolean;
  /** Z-index for layering */
  zIndex?: number;
}

// Theme-specific configurations
const THEME_CONFIGS: Record<ColorScheme, {
  speed: number;
  glow: number;
  drift: number;
  twinkle: boolean;
  direction: number;
}> = {
  cosmic: { speed: 0.3, glow: 15, drift: 1, twinkle: true, direction: 180 },
  neon: { speed: 0.8, glow: 25, drift: 2, twinkle: true, direction: 180 },
  classic: { speed: 0.25, glow: 8, drift: 0.5, twinkle: false, direction: 180 },
  psychedelic: { speed: 1.2, glow: 30, drift: 3, twinkle: true, direction: 0 },
  toxic: { speed: 0.5, glow: 18, drift: 2, twinkle: false, direction: 90 },
  ocean: { speed: 0.4, glow: 12, drift: 1.5, twinkle: true, direction: 180 },
  fire: { speed: 0.6, glow: 20, drift: 1, twinkle: false, direction: 0 },
  ice: { speed: 0.2, glow: 10, drift: 0.8, twinkle: true, direction: 180 },
  energy: { speed: 0.5, glow: 15, drift: 1.5, twinkle: true, direction: 180 }
};

/**
 * Background ambient particle effect
 * Creates a persistent atmospheric particle layer
 */
export function AmbientParticles({
  colorScheme = 'cosmic',
  customColors,
  density = 1.0,
  performanceLevel = 'medium',
  enabled = true,
  zIndex = 0
}: AmbientParticlesProps): JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const sparticlesRef = useRef<Sparticles | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const createSparticles = useCallback(() => {
    if (!containerRef.current) return;

    // Clean up existing
    if (sparticlesRef.current) {
      sparticlesRef.current.destroy();
      sparticlesRef.current = null;
    }
    if (canvasRef.current?.parentNode) {
      canvasRef.current.remove();
      canvasRef.current = null;
    }

    if (!enabled) return;

    const perf = PERFORMANCE_PRESETS[performanceLevel];
    const themeConfig = THEME_CONFIGS[colorScheme];
    const colors = customColors || PARTICLE_COLOR_SCHEMES[colorScheme];

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    containerRef.current.appendChild(canvas);
    canvasRef.current = canvas;

    try {
      sparticlesRef.current = new Sparticles(canvas, {
        count: Math.floor(80 * perf.countMultiplier * Math.max(0.1, Math.min(2.0, density))),
        speed: themeConfig.speed * perf.speedMultiplier,
        color: colors,
        minSize: 1,
        maxSize: 3,
        shape: 'circle',
        glow: perf.glowEnabled ? themeConfig.glow : 0,
        drift: themeConfig.drift,
        rotate: false,
        parallax: perf.parallaxEnabled ? 0.8 : 0,
        twinkle: perf.twinkleEnabled && themeConfig.twinkle,
        direction: themeConfig.direction,
        bounce: false,
        alphaSpeed: 3,
        alphaVariance: 0.4,
        style: 'fill'
      });
    } catch (e) {
      console.warn('Failed to create ambient particles:', e);
    }
  }, [colorScheme, customColors, density, performanceLevel, enabled]);

  // Initialize
  useEffect(() => {
    createSparticles();

    return () => {
      if (sparticlesRef.current) {
        sparticlesRef.current.destroy();
        sparticlesRef.current = null;
      }
      if (canvasRef.current?.parentNode) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
    };
  }, [createSparticles]);

  // Update on prop changes
  useEffect(() => {
    if (sparticlesRef.current) {
      const colors = customColors || PARTICLE_COLOR_SCHEMES[colorScheme];
      const themeConfig = THEME_CONFIGS[colorScheme];
      const perf = PERFORMANCE_PRESETS[performanceLevel];

      sparticlesRef.current.setOptions({
        color: colors,
        speed: themeConfig.speed * perf.speedMultiplier,
        glow: perf.glowEnabled ? themeConfig.glow : 0,
        drift: themeConfig.drift,
        twinkle: perf.twinkleEnabled && themeConfig.twinkle,
        direction: themeConfig.direction
      });
    }
  }, [colorScheme, customColors, performanceLevel]);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex,
        overflow: 'hidden'
      }}
    />
  );
}

export default AmbientParticles;
