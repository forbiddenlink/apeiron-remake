/**
 * Canonical shot set for the visual-regression gate.
 *
 * Each shot is a deterministic (seed, frame-count) recipe. Frame counts are
 * chosen to land on distinct game states: title screen, early play, mid play
 * (enemies spawned), and later play (more density). Add shots as coverage grows.
 */
export const SHOTS = [
  { name: 'title', seed: 0x1234abcd, play: false, frames: 4 },
  { name: 'play-early', seed: 0x1234abcd, play: true, frames: 30 },
  { name: 'play-mid', seed: 0x1234abcd, play: true, frames: 240 },
  { name: 'play-late', seed: 0x0badf00d, play: true, frames: 600 },
]
