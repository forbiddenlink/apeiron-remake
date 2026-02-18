export const CELL = 16;           // px
export const COLS = 37;           // Apeiron X-style field width: 592/16 (sidebar occupies remaining canvas width)
export const ROWS = 37;           // Apeiron X-style field height: 592/16
export const PLAYER_ROWS = 4;     // player zone rows at bottom

export const SCORE = {
  // Base scores
  SEGMENT: 10,
  HEAD: 100,
  FLEA: 200,
  SPIDER_NEAR: 900,
  SPIDER_MED: 600,
  SPIDER_FAR: 300,
  SCORPION: 1500,
  MUSHROOM_HIT: 1,
  POISON_MUSHROOM_HIT: 5,
  SPACESHIP_MIN: 500,
  SPACESHIP_MAX: 3000,
  FALLING_MUSHROOM: 3000,
  FALLING_POISON_MUSHROOM: 6000,
  MUSHROOM_CLEAR_BONUS: 4,
  PSYCHEDELIC_MUSHROOM: 500,       // Bonus for shooting psychedelic mushroom
  COIN: 100,                        // Points per coin collected
  COIN_FRENZY_BONUS: 1000,         // Bonus for collecting many coins
  JUGGLE_BASE: 3000,               // Base score for juggling falling mushroom
  JUGGLE_MULTIPLIER: 2,            // Multiplier per additional juggle
  
  // Chain bonuses
  CHAIN_MULTIPLIER: 1.5,    // Each chain hit increases score by 50%
  MAX_CHAIN: 8,             // Maximum chain multiplier
  CHAIN_TIMEOUT: 2.0,       // Seconds before chain resets
  
  // Special bonuses
  PERFECT_CLEAR: 5000,      // Clearing level without losing mushrooms
  SPEED_CLEAR: 2000,        // Clearing level under par time
  NO_HIT: 3000,             // Clearing level without taking damage
  MEGA_BLAST_MULTI: 500,    // Hitting multiple targets with mega blast
  PHASE_KILL: 1000,         // Killing enemy while phase shifted
  
  // Level bonuses
  LEVEL_COMPLETION: 1000,   // Base bonus for completing a level
  LEVEL_MULTIPLIER: 0.5,    // Each level adds 50% to scores
  MUSHROOM_FIELD_BONUS: 100 // Bonus per remaining mushroom
} as const;

// Scoring mechanics
export const SCORING = {
  COMBO_WINDOW: 0.8,        // Seconds between hits to maintain combo
  MAX_COMBO: 16,           // Maximum combo multiplier
  COMBO_DECAY: 0.2,        // Seconds before combo starts decaying
  COMBO_DECAY_RATE: 2.0,   // How fast combo decays
  
  CHAIN_REQUIREMENTS: {     // Hits needed for each chain level
    2: 3,  // 3 hits for 2x
    3: 5,  // 5 hits for 3x
    4: 8,  // 8 hits for 4x
    5: 12, // 12 hits for 5x
    6: 16, // 16 hits for 6x
    7: 20, // 20 hits for 7x
    8: 25  // 25 hits for 8x
  },
  
  // Time par scores for each level group
  PAR_TIMES: {
    EASY: 45,    // Levels 1-5
    MEDIUM: 60,  // Levels 6-10
    HARD: 75,    // Levels 11-15
    EXPERT: 90   // Levels 16+
  }
} as const;

export const EXTRA_LIFE_STEP = 20000; // classic Apeiron FAQ: every 20k

// base speeds (cells/sec or px/sec)
export const SPEED = {
  CENTIPEDE_CELLS_PER_SEC: 8,
  BULLET_PX_PER_SEC: 640,
  PLAYER_PX_PER_SEC: 360,      // Increased for snappier response
  PLAYER_ACCEL: 2400,          // Units per second^2
  PLAYER_DECEL: 1800,          // Units per second^2
  PLAYER_VERTICAL_MULT: 0.85,  // Vertical movement multiplier
  SPIDER_PX_PER_SEC_X: 130,  // Slightly slower for better gameplay
  SPIDER_PX_PER_SEC_Y: 95,
  FLEA_PX_PER_SEC_Y: 220,
  SCORPION_PX_PER_SEC_X: 140
} as const;

export const TIMERS = {
  FIXED_DT: 1/60,
  FIRE_COOLDOWN: 0.18,
  AUTOFIRE_COOLDOWN: 0.06,
  SPAWN_SPIDER_MIN: 5.0,   // Give players more time before first spider
  SPAWN_SPIDER_MAX: 10.0,
  SPAWN_FLEA_COOLDOWN: 2.0,
  SPAWN_SCORPION_MIN: 6.0,
  SPAWN_SCORPION_MAX: 12.0,
  COIN_SPAWN_MIN: 10.0,
  COIN_SPAWN_MAX: 20.0,
  PSYCHEDELIC_DURATION: 4.0,       // Duration of psychedelic effect
  COIN_FRENZY_DURATION: 5.0        // Duration of coin frenzy
} as const;

// Reflected bullet settings (high difficulty waves)
export const REFLECTED_BULLET = {
  SPEED_MULTIPLIER: 2.0,           // Reflected bullets move 2x faster
  START_WAVE: 15,                  // First wave with reflective mushrooms
  CHANCE_PER_WAVE: 0.015,          // Additional chance per wave after START_WAVE
  MAX_CHANCE: 0.12                 // Maximum 12% of mushrooms reflective
} as const;

// Psychedelic mushroom settings
export const PSYCHEDELIC = {
  SPAWN_CHANCE: 0.02,              // 2% chance per mushroom
  POINT_MULTIPLIER: 3,             // 3x points during effect
  START_WAVE: 3                    // First wave with psychedelic mushrooms
} as const;

// Coin system settings
export const COINS = {
  DROP_CHANCE: 0.15,               // 15% chance on enemy kill
  FRENZY_CHANCE: 0.08,             // 8% chance to trigger frenzy
  FRENZY_COUNT: 30,                // Coins in a frenzy
  FALL_SPEED: 180,                 // Pixels per second
  MAX_ACTIVE: 50                   // Maximum coins on screen
} as const;

export const DENSITY = {
  PLAYER_ROWS_MIN_MUSHES: 5 // if fewer than this across last PLAYER_ROWS, spawn Flea
} as const;

export const VISUAL = {
  SCANLINES: true,
  FRAME: false,
  PLAYER_ZONE_LINE: false,
} as const;

export const POWERUPS = {
  // Classic Apeiron Yummies (manual names)
  MACHINE_GUN_DURATION: 10.0,
  GUIDED_SHOT_DURATION: 12.0,
  DIAMOND_DURATION: 10.0,      // pass through mushrooms
  SHIELD_DURATION: 6.0,
  LOCK_DURATION: 12.0,
  HOUSE_CLEANING_DURATION: 0.0, // instant effect
  EXTRA_MAN_DURATION: 0.0,      // instant effect
  
  // Power-up effects
  MACHINE_GUN_RATE: 0.05,        // seconds between shots
  GUIDED_SHOT_TURN_RATE: 180,    // degrees per second
  SHIELD_FLASH_RATE: 0.1,        // shield flicker rate
  DIAMOND_FADE_ALPHA: 0.5,
  
  // Spawn settings ("Yummies")
  SPAWN_CHANCE: 0.2,            // 20% chance for enemies to drop Yummies
  MAX_ACTIVE: 2,                // Maximum number of Yummies active at once
  FADE_TIME: 0.5,              // Time for Yummies to fade in/out
  FLOAT_AMPLITUDE: 4,          // Pixels to float up/down
  FLOAT_SPEED: 2,             // Float cycles per second
  
  // Yummy types
  TYPES: ['guided', 'diamond', 'machine_gun', 'shield', 'lock', 'house_cleaning', 'extra_man'] as const,

  // Legacy aliases retained while old code paths are removed.
  TRIPLE_SHOT_DURATION: 0.0,
  SPEED_BOOST_DURATION: 0.0,
  GHOST_MODE_DURATION: 0.0,
  NUKE_DURATION: 0.0,
  TRIPLE_SHOT_ANGLE: 30,
  SPEED_BOOST_MULT: 1.0,
  GHOST_FADE_ALPHA: 0.0,
  NUKE_RADIUS: 0
} as const;

// Special weapon mechanics
export const WEAPONS = {
  WARP: {
    RANGE: CELL * 7,     // Increased warp distance
    COOLDOWN: 0.4,       // Reduced cooldown for better flow
    ENERGY_COST: 15,     // Reduced cost to encourage use
    INVULN_TIME: 0.15    // Brief invulnerability after warp
  },
  PHASE_SHIFT: {
    DURATION: 0.5,       // Duration of phase shift invulnerability
    TRAIL_RATE: 0.05,    // Rate of trail particle emission
    MOMENTUM_MULT: 1.2   // Momentum multiplier during phase shift
  },
  MEGA_BLAST: {
    CHARGE_TIME: 0.8,    // Time to charge mega blast
    BLAST_RADIUS: 100,   // Blast radius in pixels
    DAMAGE_FALLOFF: 0.5  // Damage reduction per distance unit
  }
} as const;

// Player mechanics
export const PLAYER_MECHANICS = {
  MAX_ENERGY: 100,
  ENERGY_REGEN: 10,      // Energy points per second
  DASH_SPEED: 3.0,       // Increased multiplier for dash speed
  DASH_DURATION: 0.15,   // Shorter duration for snappier dashes
  DASH_COOLDOWN: 0.35,   // Reduced cooldown for better responsiveness
  DASH_INVULN: 0.2,      // Brief invulnerability after dash
  CHARGE_RATE: 50,       // Charge points per second
  MAX_CHARGE: 100,       // Maximum charge level
  MOMENTUM_DECAY: 0.92,  // Momentum retention per frame
  MAX_VELOCITY: 600      // Maximum velocity from momentum
} as const;

// Yummy colors for visual effects
export const POWERUP_COLORS = {
  guided: '#ff1744',          // Squiggly line
  diamond: '#40c4ff',         // Diamond
  machine_gun: '#ffd700',     // Vertical dashes
  shield: '#64ffda',          // Sprinkly shield
  lock: '#ff4081',            // Lock
  house_cleaning: '#8bc34a',  // House-cleaning
  extra_man: '#ffffff',       // Extra life
  // Legacy aliases kept for compatibility references.
  triple: '#ff4081',
  speed: '#40c4ff',
  ghost: '#b388ff',
  nuke: '#ff9100'
} as const;
