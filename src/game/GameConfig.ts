// GameConfig.ts - Central configuration for Apeiron remake
// All values are easily adjustable for tuning to match original game

export const GRID = {
  CELL: 16,                // Size of each grid cell in pixels
  COLS: 40,               // 640/16 - Screen width in cells
  ROWS: 50,               // 800/16 - Screen height in cells
  PLAYER_ROWS: 4,         // Number of rows in player zone at bottom
} as const;

export const XQJ37_BLASTER = {
  // Base weapon mechanics
  MAX_PROJECTILES: 1,     // Only one shot on screen at a time
  FIRE_RATE: 0.18,       // Seconds between shots
  PROJECTILE_SPEED: 640,  // Pixels per second
  MUZZLE_FLASH_TIME: 0.05,// Duration of muzzle flash effect
  
  // Power-up modifications
  MACHINE_GUN_RATE: 0.05, // Faster fire rate with machine gun
  GUIDED_TURN_RATE: 180,  // Degrees per second for guided shots
  TRIPLE_SHOT_ANGLE: 30,  // Degrees between triple shot projectiles
} as const;

export const ENEMIES = {
  // Pentipede (main enemy)
  PENTIPEDE: {
    SPEED: 8,             // Cells per second
    DESCENT: 1,           // Cells to descend on turn
    SEGMENT_POINTS: 10,   // Points for regular segment
    HEAD_POINTS: 100,     // Points for head segment
    POISON_SPEED_MULT: 2, // Speed multiplier when poisoned
  },
  
  // Groucho the Flick (Flea)
  GROUCHO: {
    SPEED_Y: 220,         // Vertical speed in pixels/sec
    POINTS: 200,          // Score value
    MUSHROOM_DROP_CHANCE: 0.3, // 30% chance to drop mushroom
    SPAWN_THRESHOLD: 5,   // Spawn when fewer mushrooms in player zone
  },
  
  // Larry the Scobster (Spider)
  LARRY: {
    SPEED_X: 160,         // Horizontal speed in pixels/sec
    SPEED_Y: 120,         // Vertical speed in pixels/sec
    POINTS_NEAR: 900,     // Points when close to player
    POINTS_MED: 600,      // Points at medium distance
    POINTS_FAR: 300,      // Points when far from player
    SPAWN_MIN: 3.5,       // Minimum spawn delay
    SPAWN_MAX: 7.5,       // Maximum spawn delay
  },
  
  // Gordon the Gecko (Scorpion)
  GORDON: {
    SPEED_X: 140,         // Horizontal speed in pixels/sec
    POINTS: 1000,         // Score value
    POISON_DURATION: 5.0, // How long mushrooms stay poisoned
    SPAWN_MIN: 6.0,       // Minimum spawn delay
    SPAWN_MAX: 12.0,      // Maximum spawn delay
  },
  
  // UFO
  UFO: {
    SPEED_X: 180,         // Horizontal speed in pixels/sec
    POINTS: 1500,         // Score value
    SPAWN_MIN: 15.0,      // Minimum spawn delay
    SPAWN_MAX: 30.0,      // Maximum spawn delay
  }
} as const;

export const YUMMIES = {
  // Duration in seconds for each power-up
  DURATIONS: {
    MACHINE_GUN: 10.0,    // Rapid fire mode
    GUIDED_SHOT: 12.0,    // Shots follow enemies
    TRIPLE_SHOT: 8.0,     // Three-way spread
    SHIELD: 6.0,          // Invulnerability
    SPEED_BOOST: 15.0,    // Faster movement
    GHOST_MODE: 5.0,      // Pass through mushrooms
    NUKE: 3.0,            // Screen-clearing explosion
  },
  
  // Visual effects
  VISUALS: {
    FADE_TIME: 0.5,       // Time to fade in/out
    FLOAT_AMPLITUDE: 4,   // Pixels to float up/down
    FLOAT_SPEED: 2,       // Float cycles per second
    GLOW_INTENSITY: 0.3,  // Intensity of glow effect
    SHIELD_FLASH_RATE: 0.1, // Shield flicker rate
  },
  
  // Spawn settings
  SPAWN: {
    CHANCE: 0.2,          // 20% chance for enemies to drop
    MAX_ACTIVE: 2,        // Maximum number active at once
    MIN_SPACING: 3.0,     // Minimum seconds between spawns
  },
  
  // Colors for each type
  COLORS: {
    MACHINE_GUN: '#ffd700', // Gold
    GUIDED: '#ff1744',      // Red
    TRIPLE: '#ff4081',      // Pink
    SHIELD: '#64ffda',      // Teal
    SPEED: '#40c4ff',       // Blue
    GHOST: '#b388ff',       // Purple
    NUKE: '#ff9100'         // Orange
  }
} as const;

export const PLAYER = {
  // Movement
  MOVEMENT: {
    BASE_SPEED: 360,      // Base movement speed
    ACCEL: 2400,          // Acceleration rate
    DECEL: 1800,          // Deceleration rate
    VERTICAL_MULT: 0.85,  // Vertical movement multiplier
    MOMENTUM_DECAY: 0.92, // Momentum retention per frame
    MAX_VELOCITY: 600,    // Maximum velocity
  },
  
  // Crystal size
  SIZE: {
    WIDTH: GRID.CELL * 1.2,
    HEIGHT: GRID.CELL * 0.9,
  },
  
  // Special abilities
  ABILITIES: {
    MAX_ENERGY: 100,      // Maximum energy points
    ENERGY_REGEN: 10,     // Energy points per second
    DASH_SPEED: 3.0,      // Speed multiplier during dash
    DASH_DURATION: 0.15,  // Seconds
    DASH_COOLDOWN: 0.35,  // Seconds between dashes
    DASH_INVULN: 0.2,     // Invulnerability after dash
  }
} as const;

export const MUSHROOMS = {
  // Visual
  SIZE: GRID.CELL * 0.8,  // Slightly smaller than grid cell
  MAX_HP: 4,              // Hits to destroy
  
  // Scoring
  POINTS: {
    HIT: 1,               // Points per hit
    CLEAR: 4,             // Bonus for clearing
    FIELD_BONUS: 100,     // Points per mushroom at level end
  },
  
  // Effects
  POISON: {
    DURATION: 5.0,        // How long poison lasts
    SPREAD_CHANCE: 0.2,   // 20% chance to spread to adjacent
  }
} as const;

export const SCORING = {
  // Chain system
  CHAIN: {
    MULTIPLIER: 1.5,      // Each chain increases score by 50%
    MAX_CHAIN: 8,         // Maximum chain multiplier
    TIMEOUT: 2.0,         // Seconds before chain resets
    REQUIREMENTS: {       // Hits needed for each chain level
      2: 3,  // 3 hits for 2x
      3: 5,  // 5 hits for 3x
      4: 8,  // 8 hits for 4x
      5: 12, // 12 hits for 5x
      6: 16, // 16 hits for 6x
      7: 20, // 20 hits for 7x
      8: 25  // 25 hits for 8x
    }
  },
  
  // Level bonuses
  BONUSES: {
    PERFECT_CLEAR: 5000,  // No mushrooms lost
    SPEED_CLEAR: 2000,    // Under par time
    NO_HIT: 3000,         // No damage taken
    COMPLETION: 1000,     // Base level completion
    LEVEL_MULT: 0.5,      // Each level adds 50% to scores
  },
  
  // Par times for speed bonus
  PAR_TIMES: {
    EASY: 45,    // Levels 1-5
    MEDIUM: 60,  // Levels 6-10
    HARD: 75,    // Levels 11-15
    EXPERT: 90   // Levels 16+
  },
  
  // Extra lives
  EXTRA_LIFE_STEP: 12000  // Award at 12k, 24k, etc.
} as const;

// Debug settings
export const DEBUG = {
  SHOW_HITBOXES: false,   // Show collision boundaries
  SHOW_PATHS: false,      // Show enemy movement paths
  SHOW_GRID: false,       // Show grid overlay
  SHOW_FPS: false,        // Show FPS counter
  INVINCIBLE: false,      // Player can't die
  INFINITE_YUMMIES: false // Power-ups don't expire
} as const;
