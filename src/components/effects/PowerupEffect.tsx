import { useEffect, useRef } from 'react';
import Sparticles from 'sparticles';
import { PARTICLE_COLOR_SCHEMES, PERFORMANCE_PRESETS, type PerformanceLevel, type ColorScheme } from '../../../lib/particles';

interface PowerupEffectProps {
  /** X position of powerup */
  x: number;
  /** Y position of powerup */
  y: number;
  /** Powerup type determines color scheme */
  type?: 'guided' | 'diamond' | 'machine_gun' | 'shield' | 'lock' | 'house_cleaning' | 'extra_man' | 'generic';
  /** Custom color scheme override */
  colorScheme?: ColorScheme;
  /** Custom colors override */
  customColors?: string[];
  /** Effect intensity */
  intensity?: number;
  /** Device performance level */
  performanceLevel?: PerformanceLevel;
  /** Whether collection burst is active */
  collected?: boolean;
  /** Callback when collection animation completes */
  onCollectionComplete?: () => void;
  /** Enable the effect */
  enabled?: boolean;
}

// Powerup type to color mapping
const POWERUP_COLORS: Record<string, string[]> = {
  guided: ['#ff1744', '#ff5252', '#ff8a80', '#ffffff'],
  diamond: ['#40c4ff', '#80d8ff', '#b3e5fc', '#ffffff'],
  machine_gun: ['#ffd700', '#ffeb3b', '#fff59d', '#ffffff'],
  shield: ['#64ffda', '#a7ffeb', '#b9f6ca', '#ffffff'],
  lock: ['#ff4081', '#ff80ab', '#fce4ec', '#ffffff'],
  house_cleaning: ['#8bc34a', '#aed581', '#c5e1a5', '#ffffff'],
  extra_man: ['#ffffff', '#e3f2fd', '#bbdefb', '#90caf9'],
  generic: ['#ffd700', '#ffeb3b', '#ffffff', '#fff59d']
};

/**
 * Powerup collection particle effect
 * Creates sparkles around powerups and burst on collection
 */
export function PowerupEffect({
  x,
  y,
  type = 'generic',
  colorScheme,
  customColors,
  intensity = 1.0,
  performanceLevel = 'medium',
  collected = false,
  onCollectionComplete,
  enabled = true
}: PowerupEffectProps): JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const sparticlesRef = useRef<Sparticles | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const burstRef = useRef<Sparticles | null>(null);
  const burstCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Get colors for this powerup type
  const getColors = (): string[] => {
    if (customColors) return customColors;
    if (colorScheme) return PARTICLE_COLOR_SCHEMES[colorScheme];
    return POWERUP_COLORS[type] || POWERUP_COLORS.generic;
  };

  // Initialize ambient sparkle effect
  useEffect(() => {
    if (!containerRef.current || !enabled || collected) return;

    const perf = PERFORMANCE_PRESETS[performanceLevel];
    const colors = getColors();

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
        count: Math.floor(15 * perf.countMultiplier * intensity),
        speed: 0.8 * perf.speedMultiplier,
        color: colors,
        minSize: 1,
        maxSize: 4,
        shape: 'star',
        glow: perf.glowEnabled ? 20 : 0,
        drift: 1.5,
        rotate: true,
        parallax: 0,
        twinkle: perf.twinkleEnabled,
        direction: 0,
        bounce: false,
        alphaSpeed: 8,
        alphaVariance: 0.6,
        style: 'fill'
      });
    } catch (e) {
      console.warn('Failed to create powerup effect:', e);
    }

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
  }, [type, colorScheme, customColors, intensity, performanceLevel, enabled, collected]);

  // Handle collection burst
  useEffect(() => {
    if (!containerRef.current || !collected || !enabled) return;

    // Destroy ambient effect
    if (sparticlesRef.current) {
      sparticlesRef.current.destroy();
      sparticlesRef.current = null;
    }
    if (canvasRef.current?.parentNode) {
      canvasRef.current.remove();
      canvasRef.current = null;
    }

    const perf = PERFORMANCE_PRESETS[performanceLevel];
    const colors = getColors();

    // Create burst canvas
    const burstCanvas = document.createElement('canvas');
    burstCanvas.style.position = 'absolute';
    burstCanvas.style.top = '0';
    burstCanvas.style.left = '0';
    burstCanvas.style.width = '100%';
    burstCanvas.style.height = '100%';
    burstCanvas.style.pointerEvents = 'none';
    containerRef.current.appendChild(burstCanvas);
    burstCanvasRef.current = burstCanvas;

    try {
      burstRef.current = new Sparticles(burstCanvas, {
        count: Math.floor(50 * perf.countMultiplier * intensity),
        speed: 4.0 * perf.speedMultiplier,
        color: colors,
        minSize: 2,
        maxSize: 6,
        shape: 'star',
        glow: perf.glowEnabled ? 35 : 0,
        drift: 0,
        rotate: true,
        parallax: 0,
        twinkle: false,
        direction: 0, // Radial burst
        bounce: false,
        alphaSpeed: 12,
        alphaVariance: 0.3,
        style: 'fill'
      });
    } catch (e) {
      console.warn('Failed to create powerup collection burst:', e);
    }

    // Auto-cleanup burst after animation
    const timer = setTimeout(() => {
      if (burstRef.current) {
        burstRef.current.destroy();
        burstRef.current = null;
      }
      if (burstCanvasRef.current?.parentNode) {
        burstCanvasRef.current.remove();
        burstCanvasRef.current = null;
      }
      onCollectionComplete?.();
    }, 600);

    return () => {
      clearTimeout(timer);
      if (burstRef.current) {
        burstRef.current.destroy();
        burstRef.current = null;
      }
      if (burstCanvasRef.current?.parentNode) {
        burstCanvasRef.current.remove();
        burstCanvasRef.current = null;
      }
    };
  }, [collected, type, colorScheme, customColors, intensity, performanceLevel, enabled, onCollectionComplete]);

  if (!enabled) return null;

  const size = collected ? 120 : 60;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        pointerEvents: 'none',
        zIndex: 80
      }}
    />
  );
}

export default PowerupEffect;
