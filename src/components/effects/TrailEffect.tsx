import { useEffect, useRef } from 'react';
import Sparticles from 'sparticles';
import { PARTICLE_COLOR_SCHEMES, PERFORMANCE_PRESETS, type PerformanceLevel, type ColorScheme } from '../../../lib/particles';

interface TrailEffectProps {
  /** Follow target x position */
  targetX: number;
  /** Follow target y position */
  targetY: number;
  /** Trail color scheme */
  colorScheme?: ColorScheme;
  /** Custom colors override */
  customColors?: string[];
  /** Intensity multiplier */
  intensity?: number;
  /** Device performance level */
  performanceLevel?: PerformanceLevel;
  /** Trail width in pixels */
  width?: number;
  /** Trail height in pixels */
  height?: number;
  /** Enable the trail */
  enabled?: boolean;
}

/**
 * Following particle trail effect
 * Creates continuous particles that follow a target position
 */
export function TrailEffect({
  targetX,
  targetY,
  colorScheme = 'energy',
  customColors,
  intensity = 1.0,
  performanceLevel = 'medium',
  width = 60,
  height = 80,
  enabled = true
}: TrailEffectProps): JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const sparticlesRef = useRef<Sparticles | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize sparticles
  useEffect(() => {
    if (!containerRef.current || !enabled) return;

    const perf = PERFORMANCE_PRESETS[performanceLevel];
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
        count: Math.floor(25 * perf.countMultiplier * intensity),
        speed: 0.6 * perf.speedMultiplier,
        color: colors,
        minSize: 1,
        maxSize: 3,
        shape: 'circle',
        glow: perf.glowEnabled ? 12 : 0,
        drift: 1.5,
        rotate: false,
        parallax: perf.parallaxEnabled ? 0.4 : 0,
        twinkle: perf.twinkleEnabled,
        direction: 180, // Particles fall downward/backward
        bounce: false,
        alphaSpeed: 6,
        alphaVariance: 0.4,
        style: 'fill'
      });
    } catch (e) {
      console.warn('Failed to create trail effect:', e);
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
  }, [colorScheme, customColors, intensity, performanceLevel, enabled]);

  // Update colors when scheme changes
  useEffect(() => {
    if (sparticlesRef.current) {
      const colors = customColors || PARTICLE_COLOR_SCHEMES[colorScheme];
      sparticlesRef.current.setOptions({ color: colors });
    }
  }, [colorScheme, customColors]);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: targetX - width / 2,
        top: targetY - height / 2,
        width,
        height,
        pointerEvents: 'none',
        zIndex: 50
      }}
    />
  );
}

export default TrailEffect;
