// Particle effect components

// Re-export types and utilities from lib
export {
  type ColorScheme,
  createParticleOptions,
  PARTICLE_COLOR_SCHEMES,
  PARTICLE_PRESETS,
  type ParticleConfig,
  type ParticlePreset,
  PERFORMANCE_PRESETS,
  type PerformanceLevel,
  particleManager,
  SparticleManager,
} from '../../../lib/particles'
export { AmbientParticles } from './AmbientParticles'
export { ExplosionEffect } from './ExplosionEffect'
export { PowerupEffect } from './PowerupEffect'
export { TrailEffect } from './TrailEffect'
