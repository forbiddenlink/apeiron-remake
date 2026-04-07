import { useEffect, useRef } from 'react';
import Sparticles from 'sparticles';
import { PARTICLE_COLOR_SCHEMES, PERFORMANCE_PRESETS, type PerformanceLevel } from '../../../lib/particles';

interface ExplosionEffectProps {
  x: number;
  y: number;
  color?: string | string[];
  size?: 'small' | 'medium' | 'large';
  performanceLevel?: PerformanceLevel;
  onComplete?: () => void;
}

const SIZE_CONFIG = {
  small: { count: 20, maxSize: 4, duration: 400 },
  medium: { count: 40, maxSize: 6, duration: 600 },
  large: { count: 80, maxSize: 10, duration: 800 }
};

/**
 * Burst particle effect for impacts and explosions
 * Creates a one-shot particle burst at the specified position
 */
export function ExplosionEffect({
  x,
  y,
  color = PARTICLE_COLOR_SCHEMES.fire,
  size = 'medium',
  performanceLevel = 'medium',
  onComplete
}: ExplosionEffectProps): JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const sparticlesRef = useRef<Sparticles | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config = SIZE_CONFIG[size];
    const perf = PERFORMANCE_PRESETS[performanceLevel];

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    containerRef.current.appendChild(canvas);

    try {
      sparticlesRef.current = new Sparticles(canvas, {
        count: Math.floor(config.count * perf.countMultiplier),
        speed: 3.5 * perf.speedMultiplier,
        color: color,
        minSize: 2,
        maxSize: config.maxSize,
        shape: 'circle',
        glow: perf.glowEnabled ? 25 : 0,
        drift: 0,
        rotate: false,
        parallax: 0,
        twinkle: false,
        direction: 0, // Radial burst
        bounce: false,
        alphaSpeed: 10,
        alphaVariance: 0.5,
        style: 'fill'
      });
    } catch (e) {
      console.warn('Failed to create explosion effect:', e);
    }

    // Auto-destroy after duration
    const timer = setTimeout(() => {
      if (sparticlesRef.current) {
        sparticlesRef.current.destroy();
        sparticlesRef.current = null;
      }
      if (canvas.parentNode) {
        canvas.remove();
      }
      onComplete?.();
    }, config.duration);

    return () => {
      clearTimeout(timer);
      if (sparticlesRef.current) {
        sparticlesRef.current.destroy();
        sparticlesRef.current = null;
      }
      if (canvas.parentNode) {
        canvas.remove();
      }
    };
  }, [x, y, color, size, performanceLevel, onComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: x - 50,
        top: y - 50,
        width: 100,
        height: 100,
        pointerEvents: 'none',
        zIndex: 100
      }}
    />
  );
}

export default ExplosionEffect;
