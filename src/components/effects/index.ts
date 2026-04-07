// Particle effect components
export { ExplosionEffect } from './ExplosionEffect';
export { TrailEffect } from './TrailEffect';
export { AmbientParticles } from './AmbientParticles';
export { PowerupEffect } from './PowerupEffect';

// Re-export types and utilities from lib
export {
  PARTICLE_COLOR_SCHEMES,
  PARTICLE_PRESETS,
  PERFORMANCE_PRESETS,
  createParticleOptions,
  particleManager,
  SparticleManager,
  type ColorScheme,
  type PerformanceLevel,
  type ParticlePreset,
  type ParticleConfig
} from '../../../lib/particles';
