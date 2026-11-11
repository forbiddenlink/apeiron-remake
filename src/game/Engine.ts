import { sfx } from './AudioSynth'
import { BackgroundEffects } from './BackgroundEffects'
import { Centipede, type Segment } from './Centipede'
import { CHEAT_BONUS, CHEAT_POINTS, CHEATS, continuesCheat, feedCheatBuffer } from './Cheats'
import { CLASSIC_BONUS, WEAPONS } from './Constants'
import { Flea, Gecko, getScobsterDistance, getScobsterScore, Spider } from './Enemies'
import {
  COINS,
  DEBUG,
  ENEMIES,
  EXTRA_LIFE_STEP,
  GRID,
  GRID_RATIO,
  PLAYER,
  POWERUP_COLORS,
  POWERUPS,
  PSYCHEDELIC,
  REFLECTED_BULLET,
  SCORE,
  SCORING,
  TIMERS,
  VISUAL,
  YUMMIES,
} from './GameConfig'
import {
  DEFAULT_GAME_MODE,
  enemiesDropYummies,
  fleaWatchRows,
  type GameMode,
  getFallingMushroomChance,
  getLevelTuning,
  getReflectedSpeedMultiplier,
  getTouchdownRules,
  getWaveComposition,
  shouldSpawnFlea,
  spawnsCoins,
  spawnsTouchdownFriends,
  tickScobsterSpawn,
  usesModernScoring,
  usesPsychedelicMushrooms,
  usesReflectiveMushrooms,
} from './GameMode'
import { firstGamepad, type PadInput, readGamepad } from './Gamepad'
import { Grid, Mushroom } from './Grid'
import { MouseInput } from './MouseInput'
import { music } from './Music'
import { ParticleSystem } from './ParticleSystem'
import { type Bullet, Player, type PowerUpType } from './Player'
import { PowerUp } from './PowerUp'
import {
  drawBullet,
  drawFlea,
  drawGecko,
  drawMushroom,
  drawMuzzleFlash,
  drawPlayer,
  drawSegment,
  drawSpider,
  drawUFO,
  type VisualProfile,
} from './ProceduralSprites'
import { makeRng } from './RNG'
import { newRunStats, type RunStats } from './RunStats'
import { bakeBackdrops } from './render3d/BackdropBaker'
import { bakeSprites, coinAngle, drawTile, FRAMES, type SpriteAtlas } from './render3d/SpriteBaker'
import { SidebarRenderer } from './SidebarRenderer'
import { aabb } from './Types'
import { UFO } from './UFO'

const CELL = GRID.CELL
const COLS = GRID.COLS
const ROWS = GRID.ROWS
const PLAYER_ROWS = GRID.PLAYER_ROWS
const FIELD_W = COLS * CELL
const FIELD_H = ROWS * CELL
export const MAX_BONUS_SCORE = 99999

// paysScore: Enhanced credits the increase to Score immediately. Classic only
// multiplies the Bonus countdown, which is banked into Score at wave end.
export function getBonusMultiplierAward(
  bonus: number,
  scoreMultiplier = 1,
  paysScore = true
): { bonus: number; score: number } {
  const cappedBonus = Math.min(MAX_BONUS_SCORE, Math.max(0, bonus))
  const multipliedBonus = Math.min(MAX_BONUS_SCORE, cappedBonus * POWERUPS.BONUS_MULTIPLIER)
  const increase = multipliedBonus - cappedBonus
  return { bonus: multipliedBonus, score: paysScore ? increase * scoreMultiplier : 0 }
}

// Advances the Classic Bonus countdown by dt. carry holds time not yet spent
// on a whole step, so the rate is exact on the fixed 1/60 timestep.
export function tickClassicBonus(
  bonus: number,
  carry: number,
  dt: number
): { bonus: number; carry: number } {
  let nextBonus = bonus
  let nextCarry = carry + dt
  while (nextCarry >= CLASSIC_BONUS.STEP_SECONDS - 1e-9) {
    nextCarry -= CLASSIC_BONUS.STEP_SECONDS
    nextBonus = Math.max(0, nextBonus - CLASSIC_BONUS.STEP)
  }
  return { bonus: nextBonus, carry: Math.max(0, nextCarry) }
}

type EngineSettings = {
  gameMode: GameMode
  musicVolume: number
  sfxVolume: number
  particleDensity: 'low' | 'medium' | 'high'
  screenShake: boolean
  showHitboxes: boolean
  showFPS: boolean
  reduceFlashing: boolean
  reflectingMushrooms: boolean
  relativeMouse: boolean
  movingBackdrops: boolean
  sprites3d: boolean
}

type EngineMode = 'title' | 'playing' | 'pause' | 'gameover'

export interface EngineSnapshot {
  mode: EngineMode
  score: number
  highScore: number
  level: number
  seed: number
  cheated: boolean
  stats: RunStats
}

const DEATH_FREEZE_SECONDS = 1.1
const RESPAWN_INVULN_SECONDS = 2.0
const WAVE_CLEAR_SECONDS = 1.1
const WAVE_CLEAR_FLASH_SECONDS = 0.3
const TEST_SEED = 0xc0ffee
const MAX_FRAME_SECONDS = 0.1

function isTestHarness(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!(window as unknown as { __APEIRON_TEST__?: boolean }).__APEIRON_TEST__
  )
}

// A fresh seed per run in normal play. The headless harness keeps the fixed one
// so captures stay bit-identical.
function pickSeed(): number {
  if (isTestHarness()) return TEST_SEED
  try {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0]
  } catch {
    return Math.floor(Math.random() * 0x100000000) >>> 0
  }
}

export class Engine {
  private ctx: CanvasRenderingContext2D
  private raf = 0
  private running = false
  private last = 0
  private acc = 0
  private keys = new Set<string>()
  private rand = makeRng(TEST_SEED)
  mode: EngineMode = 'title'
  onStateChange?: (state: EngineSnapshot) => void
  settings: EngineSettings = {
    gameMode: DEFAULT_GAME_MODE,
    musicVolume: 70,
    sfxVolume: 80,
    particleDensity: 'low',
    screenShake: true,
    showHitboxes: DEBUG.SHOW_HITBOXES,
    showFPS: DEBUG.SHOW_FPS,
    reduceFlashing: false,
    reflectingMushrooms: true,
    relativeMouse: false,
    movingBackdrops: true,
    sprites3d: true,
  }
  seed = TEST_SEED
  cheated = false
  stats: RunStats = newRunStats()
  private waveStartScore = 0
  private shotsCarry = 0
  private deathT = 0 // seconds left of the shatter freeze after a hit
  private invulnT = 0 // seconds of post-respawn invulnerability left
  private pendingPowerUps: Array<{ type: PowerUpType; remaining: number }> = []
  private clearBankStep = 0 // Bonus points moved into Score per tick during wave clear
  private uiBlocked = false
  private pausedBy: 'key' | 'caps' | 'auto' | 'ui' = 'ui'
  private cheatBuffer = ''
  private pixelRatio = 1
  private fieldScale = 1
  private pad: PadInput = readGamepad(null)
  private padPauseHeld = false
  private padFireHeld = false
  private levelClearT = 0 // seconds remaining for level-clear flash/freeze
  private popups: { x: number; y: number; text: string; t: number }[] = []
  private shakeT = 0 // seconds
  private tGlobal = 0 // accumulative time for deterministic shake phase

  score = 0
  highScore = 0
  lives = 3
  level = 1
  nextExtraLife = EXTRA_LIFE_STEP
  grid = new Grid(GRID.COLS, GRID.ROWS)
  player = new Player()
  centipedes: Centipede[] = []
  spiders: Spider[] = []
  fleas: Flea[] = []
  geckos: Gecko[] = []
  ufos: UFO[] = []
  powerUps: PowerUp[] = []
  fallingMushrooms: {
    x: number
    y: number
    w: number
    h: number
    vy: number
    poisoned: boolean
    active: boolean
    juggleCount: number
  }[] = []
  reflectedBullets: { x: number; y: number; vy: number; active: boolean }[] = []
  coins: { x: number; y: number; vy: number; active: boolean; value: number }[] = []
  particles = new ParticleSystem()

  // Psychedelic effect state
  private psychedelicTimer = 0
  private psychedelicMultiplier = 1

  // Coin frenzy state
  private coinFrenzyActive = false
  private coinsCollected = 0
  private coinFrenzyTimer = 0 // deterministic countdown (seconds) for active frenzy

  // Scoring mechanics
  private combo = 1
  private comboTimer = 0
  private chainHits = 0
  private chainTimer = 0
  private levelElapsed = 0 // fixed-step seconds in the current wave
  private initialMushrooms = 0
  private mushroomsLost = 0
  private hitsTaken = 0
  private fleaMultiplier = 1
  private sidebarBonus = 0
  private bonusCarry = 0

  private spiderTimer = randRange(
    ENEMIES.LARRY_THE_SCOBSTER.SPAWN_MIN_TIME,
    ENEMIES.LARRY_THE_SCOBSTER.SPAWN_MAX_TIME,
    this.rand
  )
  private fleaCd: number = ENEMIES.GROUCHO_THE_FLICK.SPAWN_COOLDOWN
  private geckoTimer = randRange(
    ENEMIES.GORDON_THE_GECKO.SPAWN_MIN_TIME,
    ENEMIES.GORDON_THE_GECKO.SPAWN_MAX_TIME,
    this.rand
  )
  private ufoTimer = randRange(ENEMIES.UFO.SPAWN_MIN_TIME, ENEMIES.UFO.SPAWN_MAX_TIME, this.rand)
  private touchdownFriendCd = 0
  private backgroundEffects: BackgroundEffects
  private mouseInput: MouseInput
  private sidebar: SidebarRenderer
  // 3D-rendered sprite atlas, baked once at boot. Null where WebGL is missing.
  private atlas: SpriteAtlas | null = null

  constructor(
    private canvas: HTMLCanvasElement,
    private width: number,
    private height: number
  ) {
    const c = canvas.getContext('2d')
    if (!c) throw new Error('No 2D context')
    this.ctx = c
    // Field units to screen pixels. The backdrop is built at screen resolution.
    this.fieldScale = this.height / FIELD_H
    this.backgroundEffects = new BackgroundEffects(
      this.ctx,
      Math.round(FIELD_W * this.fieldScale),
      this.height
    )
    this.sidebar = new SidebarRenderer(this.height)
    // Software WebGL in headless Chromium takes about 25 s to bake, so the harness
    // (and CI) run on the 2D sprites. Set window.__APEIRON_3D__ to bake there anyway.
    const wants3d =
      !isTestHarness() || !!(window as unknown as { __APEIRON_3D__?: boolean }).__APEIRON_3D__
    this.atlas = wants3d ? bakeSprites() : null
    if (wants3d) {
      bakeBackdrops(this.backgroundEffects.litSources(), (key, lit) =>
        this.backgroundEffects.addLit(key, lit)
      )
    }
    this.mouseInput = new MouseInput(canvas, width, height, this.fieldScale)
    // Esc under pointer lock is swallowed by the browser: treat losing the lock as a pause.
    this.mouseInput.onLockLost = () => this.pause('auto')
    this.particles.setDensity(this.settings.particleDensity)
    this.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
    // load hi-score if present
    try {
      const hi = localStorage.getItem('apeiron_hi')
      if (hi) this.highScore = Math.max(0, parseInt(hi, 10) || 0)
    } catch {}
    this.resetGame(true)
    this.bindInput()
  }

  // Fill the grid with mushrooms at the given density, avoiding the player zone
  private seedMushrooms(density: number) {
    // Clear all mushrooms first
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        this.grid.set(c, r, null)
      }
    }
    // Place mushrooms randomly, skipping player zone
    const total = Math.floor(GRID.COLS * (GRID.ROWS - GRID.PLAYER_ROWS) * density)
    let placed = 0
    while (placed < total) {
      const c = Math.floor(this.rand() * GRID.COLS)
      const r = Math.floor(this.rand() * (GRID.ROWS - GRID.PLAYER_ROWS))
      if (!this.grid.get(c, r)) {
        const mush = new Mushroom(c, r)

        // Reflecting mushrooms appear in high waves and bounce the shot back.
        // Both modes, behind the Options toggle (see GameMode.usesReflectiveMushrooms).
        if (
          usesReflectiveMushrooms(
            this.level,
            this.settings.gameMode,
            this.settings.reflectingMushrooms
          )
        ) {
          const reflectChance = Math.min(
            REFLECTED_BULLET.MAX_CHANCE,
            (this.level - REFLECTED_BULLET.START_WAVE) * REFLECTED_BULLET.CHANCE_PER_WAVE
          )
          if (this.rand() < reflectChance) {
            mush.reflective = true
          }
        }

        // Psychedelic mushrooms (rainbow - triggers the original Apeiron
        // ten-times score multiplier).
        if (usesPsychedelicMushrooms(this.level, this.settings.gameMode) && !mush.reflective) {
          if (this.rand() < PSYCHEDELIC.SPAWN_CHANCE) {
            mush.psychedelic = true
          }
        }

        this.grid.set(c, r, mush)
        placed++
      }
    }
  }

  // Backing-store scale. The game draws in 800x592 logical pixels; this keeps it
  // sharp on Retina displays and when the frame is scaled up to fit the window.
  setPixelRatio(ratio: number) {
    const next = Math.max(1, Math.min(4, Math.round(ratio * 100) / 100))
    const w = Math.round(this.width * next)
    const h = Math.round(this.height * next)
    this.pixelRatio = next
    if (this.canvas.width !== w) this.canvas.width = w
    if (this.canvas.height !== h) this.canvas.height = h
  }

  // True while a menu panel (Options, How to Play...) owns the keyboard.
  setUiBlocked(blocked: boolean) {
    this.uiBlocked = blocked
    if (blocked) this.keys.clear()
  }

  start() {
    this.running = true
    this.last = performance.now()
    this.loop(this.last)
  }
  destroy() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.unbindInput()
    this.mouseInput.unbindEvents()
    music.stop()
  }

  private loop(now: number) {
    if (!this.running) return

    // Browsers stop animation frames in a hidden tab. Without the clamp, coming
    // back would replay the whole gap in one frame.
    const dt = Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - this.last) / 1000))
    this.last = now
    this.acc += dt
    this.pollGamepad()

    // Fixed timestep (60Hz)
    const FIXED_DT = 1 / 60
    while (this.acc >= FIXED_DT) {
      if (this.mode === 'playing') {
        this.tick(FIXED_DT)
      }
      this.acc -= FIXED_DT
    }

    this.draw()
    this.raf = requestAnimationFrame((t) => this.loop(t))
  }

  // Controller state is sampled once per frame, outside the fixed step, like the
  // keyboard and pointer. Start pauses; a face button starts a run from a menu.
  private pollGamepad() {
    if (isTestHarness()) return
    this.pad = readGamepad(firstGamepad())
    if (this.uiBlocked) return
    if (this.pad.pause && !this.padPauseHeld) {
      if (this.mode === 'playing') this.pause('key')
      else if (this.mode === 'pause') this.resume()
    }
    if (this.pad.fire && !this.padFireHeld && (this.mode === 'title' || this.mode === 'gameover')) {
      this.startNewGame()
    }
    this.padPauseHeld = this.pad.pause
    this.padFireHeld = this.pad.fire
  }

  private tick(dt: number) {
    this.tGlobal += dt
    // level clear freeze: delay next level start with a brief white flash
    if (this.levelClearT > 0) {
      this.levelClearT -= dt
      this.particles.update(dt)
      if (!usesModernScoring(this.settings.gameMode) && this.sidebarBonus > 0) {
        // Count the Bonus down into Score while the wave-clear plays.
        const step = Math.min(this.sidebarBonus, this.clearBankStep)
        this.sidebarBonus -= step
        this.recordScore(step)
      }
      if (this.levelClearT <= 0) {
        if (!usesModernScoring(this.settings.gameMode)) {
          // Classic banks whatever is left of the Bonus countdown.
          this.recordScore(this.sidebarBonus)
          this.sidebarBonus = 0
        }
        this.awardLevelBonuses()
        this.stats.waveScores.push(this.score - this.waveStartScore)
        this.level++
        this.startLevel()
      }
      return
    }

    // Shatter freeze: the world holds still, then the crystal respawns or the run ends.
    if (this.deathT > 0) {
      this.deathT -= dt
      this.particles.update(dt)
      if (this.shakeT > 0) this.shakeT -= dt
      if (this.deathT <= 0) this.finishDeath()
      return
    }
    if (this.invulnT > 0) this.invulnT = Math.max(0, this.invulnT - dt)

    this.levelElapsed += dt

    if (!usesModernScoring(this.settings.gameMode)) {
      const next = tickClassicBonus(this.sidebarBonus, this.bonusCarry, dt)
      this.sidebarBonus = next.bonus
      this.bonusCarry = next.carry
    }

    // Update scoring mechanics
    this.updateScoring(dt)
    if (this.touchdownFriendCd > 0) {
      this.touchdownFriendCd = Math.max(0, this.touchdownFriendCd - dt)
    }

    // Update particle system
    this.particles.update(dt)

    // update entities (mouse-first, keyboard fallback)
    const mouseState = this.mouseInput.getInput(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2,
      dt
    )
    const keyboardShooting = this.keys.has('Space')
    const keyboardMoving =
      this.keys.has('ArrowLeft') ||
      this.keys.has('ArrowRight') ||
      this.keys.has('ArrowUp') ||
      this.keys.has('ArrowDown')
    const useMouse = mouseState.shooting || mouseState.vx !== 0 || mouseState.vy !== 0
    const usePad = this.pad.active && !useMouse && !keyboardMoving
    if (usePad) {
      this.player.update(dt, {
        vx: this.pad.x * this.player.speed,
        vy: this.pad.y * this.player.speed * PLAYER.MOVEMENT.VERTICAL_MULT,
        shooting: this.pad.fire || keyboardShooting,
      })
    } else if (useMouse) {
      this.player.update(dt, {
        vx: mouseState.vx,
        vy: mouseState.vy,
        shooting: mouseState.shooting || keyboardShooting,
      })
    } else {
      this.player.update(dt, this.keys)
    }

    // Player movement trail
    if (this.player.alive && (keyboardMoving || useMouse || usePad)) {
      this.particles.playerTrail(this.player.x + this.player.w / 2, this.player.y + this.player.h)
    }

    // Classic rule: player cannot move through mushrooms without Diamond yummy.
    if (!this.player.canPassThroughMushrooms()) {
      const pr = this.player.rect()
      const minC = Math.max(0, Math.floor(pr.x / CELL))
      const maxC = Math.min(COLS - 1, Math.floor((pr.x + pr.w) / CELL))
      const minR = Math.max(0, Math.floor(pr.y / CELL))
      const maxR = Math.min(ROWS - 1, Math.floor((pr.y + pr.h) / CELL))
      let blocked = false
      for (let r = minR; r <= maxR && !blocked; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (this.grid.get(c, r)) {
            blocked = true
            break
          }
        }
      }
      if (blocked) {
        this.player.revertPosition()
      }
    }

    // Falling mushrooms (with gravity for juggling)
    for (const fm of this.fallingMushrooms) {
      if (!fm.active) continue
      fm.vy += 400 * GRID_RATIO * dt // Gravity pulls it down
      fm.y += fm.vy * dt
      if (fm.y > FIELD_H + fm.h || fm.y < -fm.h * 2) {
        fm.active = false
      }
      if (this.player.alive && aabb(this.player.rect(), fm)) {
        fm.active = false
        this.loseLife()
        return
      }
    }

    // REFLECTED BULLETS - deadly projectiles bounced back from reflective mushrooms
    for (const rb of this.reflectedBullets) {
      if (!rb.active) continue
      rb.y += rb.vy * dt
      if (rb.y > FIELD_H + 10) {
        rb.active = false
      }
      // Check collision with player
      if (this.player.alive) {
        const pr = this.player.rect()
        const rbRect = { x: rb.x - 2, y: rb.y - 4, w: 4, h: 8 }
        if (aabb(pr, rbRect)) {
          rb.active = false
          this.loseLife()
          return
        }
      }
    }
    this.reflectedBullets = this.reflectedBullets.filter((rb) => rb.active)

    // PSYCHEDELIC effect timer
    if (this.psychedelicTimer > 0) {
      this.psychedelicTimer -= dt
      if (this.psychedelicTimer <= 0) {
        this.psychedelicMultiplier = 1
        this.addPopup(FIELD_W / 2, FIELD_H / 2, 'PSYCHEDELIC OVER')
      }
    }

    // COINS update
    this.updateCoinFrenzy(dt)
    for (const coin of this.coins) {
      if (!coin.active) continue
      coin.y += coin.vy * dt
      if (coin.y > FIELD_H + 10) {
        coin.active = false
      }
      // Check collection by player
      if (this.player.alive) {
        const pr = this.player.rect()
        const coinRect = { x: coin.x - 6, y: coin.y - 6, w: 12, h: 12 }
        if (aabb(pr, coinRect)) {
          coin.active = false
          this.addScore(SCORE.COIN)
          this.coinsCollected++
          this.particles.emitImpact(coin.x, coin.y, '#ffd700', 4)
          sfx.coin()
        }
      }
    }
    this.coins = this.coins.filter((c) => c.active)

    let touchdowns = 0
    for (const c of this.centipedes) {
      c.tick(dt, this.grid)
      if (c.consumeTouchdown()) touchdowns++
    }
    if (touchdowns > 0) this.handleTouchdowns(touchdowns)

    // Update spiders with player position for chase behavior
    for (const s of this.spiders) {
      s.update(dt, this.player.y)
    }

    // Update fleas and handle mushroom dropping
    for (const f of this.fleas) {
      f.update(dt)
      // Check if flea should drop a mushroom
      if (f.shouldDropMushroom()) {
        const c = Math.floor(f.x / CELL)
        const r = Math.floor(f.y / CELL)
        if (inBounds(c, r) && !this.grid.get(c, r) && r < ROWS - PLAYER_ROWS) {
          this.grid.set(c, r, new Mushroom(c, r))
        }
      }
    }

    // Update geckos
    for (const sc of this.geckos) {
      sc.update(dt)
    }

    // Update Yummies (power-ups)
    for (const p of this.powerUps) {
      const wasActive = p.active
      p.update(dt)

      // RASPBERRY SOUND: Power-up fell off screen without being collected!
      if (wasActive && !p.active) {
        sfx.raspberry()
        this.stats.yummiesMissed++
        this.addPopup(FIELD_W / 2, FIELD_H - 40, 'MISSED YUMMY!')
      }

      // Keep classic visuals subdued; enhanced mode gets stronger sparkle.
      const sparkleChance = this.isClassicMode() ? 0.015 : 0.06
      if (p.active && this.rand() < sparkleChance) {
        this.particles.powerUpSparkle(
          p.x + p.w / 2 + (this.rand() - 0.5) * p.w,
          p.y + p.h / 2 + (this.rand() - 0.5) * p.h,
          p.type
        )
      }

      // Check for collection
      if (p.active && aabb(this.player.rect(), p.rect())) {
        p.active = false
        this.stats.yummiesCollected++
        let popupText = `YUMMY! ${p.type.toUpperCase().replace('_', ' ')}`
        if (p.type === 'extra_man') {
          if (this.lives < 8) {
            this.lives++
          }
          popupText = 'YUMMY! EXTRA MAN'
          sfx.extra()
        } else if (p.type === 'house_cleaning') {
          const startRow = GRID.ROWS - GRID.PLAYER_ROWS
          for (let r = startRow; r < GRID.ROWS; r++) {
            for (let c = 0; c < GRID.COLS; c++) {
              this.grid.set(c, r, null)
            }
          }
          popupText = 'YUMMY! HOUSE CLEANING'
          sfx.extra()
        } else if (p.type === 'multiplier') {
          // This is a bonus award, not an enemy score: Enhanced level/combo
          // multipliers do not alter the visible Bonus multiplication.
          const award = getBonusMultiplierAward(
            this.sidebarBonus,
            this.psychedelicMultiplier,
            usesModernScoring(this.settings.gameMode)
          )
          this.sidebarBonus = award.bonus
          this.recordScore(award.score)
          popupText =
            award.bonus > 0 ? `YUMMY! BONUS ×${POWERUPS.BONUS_MULTIPLIER}` : 'YUMMY! NO BONUS YET'
          sfx.extra()
        } else {
          this.player.addPowerUp(p.type)
        }

        // Show collection popup
        this.addPopup(p.x + p.w / 2, p.y + p.h / 2, popupText)

        const sparkleBursts = this.isClassicMode() ? 4 : 12
        for (let i = 0; i < sparkleBursts; i++) {
          const angle = (i / sparkleBursts) * Math.PI * 2
          const radius = GRID.CELL * 0.75
          const sparkleX = p.x + p.w / 2 + Math.cos(angle) * radius
          const sparkleY = p.y + p.h / 2 + Math.sin(angle) * radius
          this.particles.powerUpSparkle(sparkleX, sparkleY, p.type)
        }

        if (!this.isClassicMode()) {
          this.backgroundEffects.addEnergyField(p.x + p.w / 2, p.y + p.h / 2, 1.1)
        }

        // Play collection sound
        sfx.powerup()
      }
    }

    // Enemy spawn logic
    const modeTuning = getLevelTuning(this.level, this.settings.gameMode)

    // Larry the Scobster (Spider)
    const scobster = tickScobsterSpawn(
      this.spiderTimer,
      dt,
      this.spiders.filter((s) => !s.dead).length,
      this.settings.gameMode
    )
    this.spiderTimer = scobster.timer
    if (scobster.spawn) {
      this.spiders.push(new Spider(this.level, this.rand, this.player.x + this.player.w / 2))
      this.spiderTimer = randRange(modeTuning.spiderMin, modeTuning.spiderMax, this.rand)
    }

    // Groucho the Flick (Flea)
    this.fleaCd -= dt
    if (this.fleaCd <= 0) {
      const watch = fleaWatchRows()
      if (shouldSpawnFlea(this.grid.countInRows(watch.start, watch.end))) {
        this.fleas.push(new Flea(this.rand))
      }
      this.fleaCd =
        this.settings.gameMode === 'classic'
          ? ENEMIES.GROUCHO_THE_FLICK.SPAWN_COOLDOWN
          : Math.max(1.1, ENEMIES.GROUCHO_THE_FLICK.SPAWN_COOLDOWN * 0.82)
    }

    // Gordon the Gecko
    this.geckoTimer -= dt
    if (this.geckoTimer <= 0) {
      this.geckos.push(new Gecko(this.rand))
      this.geckoTimer = randRange(modeTuning.geckoMin, modeTuning.geckoMax, this.rand)
    }

    // UFO
    this.ufoTimer -= dt
    if (this.ufoTimer <= 0) {
      if (this.rand() < ENEMIES.UFO.SPAWN_CHANCE) {
        this.ufos.push(new UFO(this.rand))
      }
      this.ufoTimer = randRange(ENEMIES.UFO.SPAWN_MIN_TIME, ENEMIES.UFO.SPAWN_MAX_TIME, this.rand)
    }

    // Update UFOs and handle mushroom destruction
    for (const ufo of this.ufos) {
      const cellsToCheck = ufo.update(dt)

      // Handle mushroom destruction
      if (cellsToCheck) {
        for (const { c, r } of cellsToCheck) {
          const mush = this.grid.get(c, r)
          if (mush) {
            // Remove mushroom
            this.grid.set(c, r, null)

            // Add destruction effects
            const x = c * GRID.CELL + GRID.CELL / 2
            const y = r * GRID.CELL + GRID.CELL / 2

            this.particles.emitExplosion(
              x,
              y,
              mush.poisoned ? '#ff6e49' : '#7ea5d3',
              this.isClassicMode() ? 4 : 12
            )
            if (!this.isClassicMode()) {
              this.backgroundEffects.addEnergyField(x, y, 0.9)
            }
          }
        }
      }

      // Remove UFO if it's off screen
      if (ufo.x < -ufo.w || ufo.x > GRID.COLS * GRID.CELL) {
        ufo.dead = true
      }
    }

    // Gordon the Gecko poisons mushrooms it touches
    for (const sc of this.geckos) {
      const c = Math.floor(sc.x / GRID.CELL)
      const r = Math.floor(sc.y / GRID.CELL)
      const m = this.grid.get(c, r)
      if (m) {
        m.poisoned = true
        if (!this.isClassicMode()) {
          this.particles.emitPoison(c * GRID.CELL + GRID.CELL / 2, r * GRID.CELL + GRID.CELL / 2)
        }
      }
    }

    // bullets collisions
    this.guideBullets(dt)
    this.handleBullets()

    // Player collisions with enemies
    if (this.player.alive) {
      const pr = this.player.rect()

      // Pentipede segments
      for (const cent of this.centipedes) {
        for (const s of cent.segments) {
          if (aabb(pr, this.segRect(cent, s))) {
            this.loseLife()
            return
          }
        }
      }

      // Larry the Scobster (Spider)
      for (const sp of this.spiders) {
        if (!sp.dead && aabb(pr, sp.rect())) {
          this.loseLife()
          return
        }
      }

      // Groucho the Flick (Flea)
      for (const f of this.fleas) {
        if (!f.dead && aabb(pr, f.rect())) {
          this.loseLife()
          return
        }
      }

      // Gordon the Gecko
      for (const sc of this.geckos) {
        if (!sc.dead && aabb(pr, sc.rect())) {
          this.loseLife()
          return
        }
      }

      // UFO
      for (const ufo of this.ufos) {
        if (!ufo.dead && aabb(pr, ufo.rect())) {
          this.loseLife()
          return
        }
      }
    }

    // cleanup
    this.spiders = this.spiders.filter((s) => !s.dead)
    this.fleas = this.fleas.filter((s) => !s.dead)
    this.geckos = this.geckos.filter((s) => !s.dead)
    this.ufos = this.ufos.filter((u) => !u.dead)
    if (this.fleas.length <= 1) this.fleaMultiplier = 1
    this.powerUps = this.powerUps.filter((p) => p.active)
    this.fallingMushrooms = this.fallingMushrooms.filter((fm) => fm.active)
    // update popups and shake timer
    if (this.shakeT > 0) this.shakeT -= dt
    for (const p of this.popups) {
      p.t -= dt
      p.y -= 22 * dt
    }
    this.popups = this.popups.filter((p) => p.t > 0)

    // level complete
    const remaining = this.centipedes.reduce((n, c) => n + c.segments.length, 0)
    if (remaining === 0 && this.levelClearT <= 0) {
      const classicClear = !usesModernScoring(this.settings.gameMode)
      this.levelClearT = classicClear ? WAVE_CLEAR_SECONDS : 0.6
      // Sized so the countdown finishes a little before the freeze ends.
      const ticks = Math.max(1, Math.floor((WAVE_CLEAR_SECONDS - 0.25) * 60))
      this.clearBankStep = Math.max(10, Math.ceil(this.sidebarBonus / ticks / 10) * 10)
      sfx.level()
    }
  }

  private handleBullets() {
    for (const b of this.player.bullets) {
      if (!b.active) continue

      if (b.isMegaBlast) {
        // Mega blast affects everything in its radius
        this.handleMegaBlast(b)
        continue
      }

      // Regular bullet collisions
      if (this.handleRegularBullet(b)) this.stats.hits++
    }
  }

  private guideBullets(dt: number): void {
    const targets: Array<{ x: number; y: number }> = []
    for (const centipede of this.centipedes) {
      for (const segment of centipede.segments) {
        const pos = centipede.segmentPixel(segment)
        targets.push({ x: pos.x + CELL / 2, y: pos.y + CELL / 2 })
      }
    }
    for (const spider of this.spiders) {
      if (!spider.dead) targets.push({ x: spider.x + spider.w / 2, y: spider.y + spider.h / 2 })
    }
    for (const flea of this.fleas) {
      if (!flea.dead) targets.push({ x: flea.x + flea.w / 2, y: flea.y + flea.h / 2 })
    }
    for (const gecko of this.geckos) {
      if (!gecko.dead) targets.push({ x: gecko.x + gecko.w / 2, y: gecko.y + gecko.h / 2 })
    }
    for (const ufo of this.ufos) {
      if (!ufo.dead) targets.push({ x: ufo.x + ufo.w / 2, y: ufo.y + ufo.h / 2 })
    }

    if (targets.length === 0) return
    for (const bullet of this.player.bullets) {
      if (!bullet.active || !bullet.isGuided) continue
      let target = targets[0]
      let nearestDistance = Infinity
      for (const candidate of targets) {
        const distance = Math.hypot(candidate.x - bullet.x, candidate.y - bullet.y)
        if (distance < nearestDistance) {
          target = candidate
          nearestDistance = distance
        }
      }
      bullet.steerToward(target.x, target.y, dt)
    }
  }

  private handleMegaBlast(b: Bullet) {
    const blastRect = b.rect()
    let hitCount = 0

    if (!this.isClassicMode()) {
      this.backgroundEffects.addEnergyField(b.x, b.y, 1.2)
    }

    // Mushrooms in blast radius
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const mush = this.grid.get(c, r)
        if (!mush) continue

        const mushRect = { x: c * CELL + 2, y: r * CELL + 2, w: CELL - 4, h: CELL - 4 }
        if (aabb(blastRect, mushRect)) {
          mush.hp = Math.max(0, mush.hp - b.damage)
          if (mush.hp <= 0) {
            this.grid.set(c, r, null)
            this.addScore(SCORE.MUSHROOM_CLEAR_BONUS)
            this.particles.emitExplosion(
              c * CELL + CELL / 2,
              r * CELL + CELL / 2,
              mush.poisoned ? '#ff6d4c' : '#7ea5d3',
              this.isClassicMode() ? 5 : 10
            )
          }
          hitCount++
        }
      }
    }

    // Centipedes in blast radius
    for (let ci = this.centipedes.length - 1; ci >= 0; ci--) {
      const cent = this.centipedes[ci]
      for (let si = cent.segments.length - 1; si >= 0; si--) {
        const s = cent.segments[si]
        const rect = this.segRect(cent, s)
        if (aabb(blastRect, rect)) {
          if (!this.grid.get(s.c, s.r)) {
            this.grid.set(s.c, s.r, new Mushroom(s.c, s.r))
          }
          const killedHead = si === 0
          const pts = killedHead ? SCORE.HEAD : SCORE.SEGMENT
          this.addScore(pts)
          this.addPopup(s.c * CELL + CELL / 2, s.r * CELL + CELL / 2, String(pts))

          // Explosion effect
          const color = killedHead ? '#ff744a' : '#6e8dbf'
          this.particles.emitExplosion(
            s.c * CELL + CELL / 2,
            s.r * CELL + CELL / 2,
            color,
            this.isClassicMode() ? 5 : 11
          )

          // Split centipede
          const left = cent.segments.slice(0, si)
          const right = cent.segments.slice(si + 1)
          this.centipedes.splice(ci, 1)
          if (left.length) {
            left[0].head = true
            this.centipedes.push(cent.split(left, this.level))
          }
          if (right.length) {
            right[0].head = true
            this.centipedes.push(cent.split(right, this.level))
          }
          hitCount++
        }
      }
    }

    // Other enemies in blast radius
    for (const sp of this.spiders) {
      if (!sp.dead && aabb(blastRect, sp.rect())) {
        sp.dead = true
        const pts = this.spiderScore(sp)
        this.addScore(pts)
        this.addPopup(sp.x + sp.w / 2, sp.y + sp.h / 2, String(pts))
        this.particles.enemyExplosion(sp.x + sp.w / 2, sp.y + sp.h / 2)
        this.maybeDropPowerUp(sp.x + sp.w / 2, sp.y + sp.h / 2)
        hitCount++
      }
    }

    for (const f of this.fleas) {
      if (!f.dead && aabb(blastRect, f.rect())) {
        f.dead = true
        this.addScore(SCORE.FLEA)
        this.addPopup(f.x + f.w / 2, f.y + f.h / 2, String(SCORE.FLEA))
        this.particles.enemyExplosion(f.x + f.w / 2, f.y + f.h / 2)
        this.maybeDropPowerUp(f.x + f.w / 2, f.y + f.h / 2)
        hitCount++
      }
    }

    for (const sc of this.geckos) {
      if (!sc.dead && aabb(blastRect, sc.rect())) {
        sc.dead = true
        this.addScore(ENEMIES.GORDON_THE_GECKO.SCORE)
        this.addPopup(sc.x + sc.w / 2, sc.y + sc.h / 2, String(ENEMIES.GORDON_THE_GECKO.SCORE))
        this.particles.enemyExplosion(sc.x + sc.w / 2, sc.y + sc.h / 2)
        this.maybeDropPowerUp(sc.x + sc.w / 2, sc.y + sc.h / 2)
        hitCount++
      }
    }

    if (hitCount > 0) {
      sfx.extra() // Mega blast hit sound
      b.active = false
      const burstCount = this.isClassicMode() ? 6 : 12
      for (let i = 0; i < burstCount; i++) {
        const angle = (i / burstCount) * Math.PI * 2
        const radius = WEAPONS.MEGA_BLAST.BLAST_RADIUS * 0.8
        const x = b.x + Math.cos(angle) * radius
        const y = b.y + Math.sin(angle) * radius
        this.particles.emitExplosion(x, y, '#ff8a42', this.isClassicMode() ? 4 : 12)
      }
    }
  }

  private handleRegularBullet(b: Bullet): boolean {
    // Yummy coins can be accidentally knocked out of play by a shot.
    for (const powerUp of this.powerUps) {
      if (!powerUp.active || !aabb(b.rect(), powerUp.rect())) continue
      b.active = false
      powerUp.deflect()
      this.addPopup(powerUp.x + powerUp.w / 2, powerUp.y + powerUp.h / 2, 'YUMMY BOUNCED!')
      sfx.hit()
      return true
    }

    // mushrooms
    const mc = Math.floor(b.x / CELL),
      mr = Math.floor(b.y / CELL)
    const mush = this.grid.get(mc, mr)
    if (mush) {
      const rect = { x: mush.x + 2, y: mush.y + 2, w: CELL - 4, h: CELL - 4 }
      if (aabb(b.rect(), rect)) {
        b.active = false

        // REFLECTIVE MUSHROOMS: Bounce bullet back at player!
        if (mush.reflective) {
          this.reflectedBullets.push({
            x: b.x,
            y: b.y,
            vy: Math.abs(b.vy) * getReflectedSpeedMultiplier(this.settings.gameMode),
            active: true,
          })
          sfx.reflect()
          this.particles.emitImpact(b.x, b.y, '#c0c0c0', 4)
          this.particles.emitImpact(b.x, b.y, '#ffffff', 2)
          return true
        }

        // PSYCHEDELIC MUSHROOMS: Trigger rainbow effect and point multiplier!
        if (mush.psychedelic) {
          this.psychedelicTimer = TIMERS.PSYCHEDELIC_DURATION
          this.psychedelicMultiplier = PSYCHEDELIC.POINT_MULTIPLIER
          this.addPopup(
            mush.x + CELL / 2,
            mush.y + CELL / 2,
            `PSYCHEDELIC! ${PSYCHEDELIC.POINT_MULTIPLIER}x POINTS!`
          )
          sfx.extra()
          // Rainbow explosion
          const colors = [
            '#ff0000',
            '#ff7700',
            '#ffff00',
            '#00ff00',
            '#0077ff',
            '#7700ff',
            '#ff00ff',
          ]
          for (let i = 0; i < 14; i++) {
            this.particles.emitExplosion(
              mush.x + CELL / 2,
              mush.y + CELL / 2,
              colors[i % colors.length],
              3
            )
          }
          this.grid.set(mc, mr, null)
          return true
        }

        mush.hp -= b.damage
        this.addScore(mush.poisoned ? SCORE.POISON_MUSHROOM_HIT : SCORE.MUSHROOM_HIT)
        sfx.hit()
        if (this.isClassicMode()) {
          this.particles.emitImpact(b.x, b.y, '#cfd7e4', 2)
        } else {
          this.particles.bulletImpact(b.x, b.y)
        }
        if (mush.hp <= 0) {
          this.grid.set(mc, mr, null)
          this.addScore(SCORE.MUSHROOM_CLEAR_BONUS)
          // Yummy coins come out of destroyed mushrooms, as in the 1995 game.
          if (this.rand() < POWERUPS.MUSHROOM_DROP_CHANCE) {
            this.spawnPowerUp(mush.x + CELL / 2, mush.y + CELL / 2)
          }
          const fallChance = getFallingMushroomChance(this.level, this.settings.gameMode)
          if (this.rand() < fallChance) {
            this.fallingMushrooms.push({
              x: mush.x + 1,
              y: mush.y + 1,
              w: CELL - 2,
              h: CELL - 2,
              vy: (150 + this.level * 8) * GRID_RATIO,
              poisoned: mush.poisoned,
              active: true,
              juggleCount: 0,
            })
          }
          // Crystal shatter effect
          const burst = this.isClassicMode() ? 3 : 8
          for (let i = 0; i < burst; i++) {
            this.particles.emitImpact(
              mush.x + CELL / 2,
              mush.y + CELL / 2,
              mush.poisoned ? '#ff6d4c' : '#7ea5d3'
            )
          }
        }
        return true
      }
    }

    // Falling mushroom JUGGLING system - hit it multiple times for bonus points!
    for (const fm of this.fallingMushrooms) {
      if (!fm.active) continue
      if (aabb(b.rect(), fm)) {
        b.active = false
        fm.juggleCount++

        // Calculate score with juggle multiplier
        const baseScore = fm.poisoned ? SCORE.FALLING_POISON_MUSHROOM : SCORE.FALLING_MUSHROOM
        const juggleMultiplier = SCORE.JUGGLE_MULTIPLIER ** (fm.juggleCount - 1)
        const pts = Math.floor(baseScore * juggleMultiplier)
        this.addScore(pts)

        // Pop the mushroom back up (juggle effect)
        fm.vy = -Math.abs(fm.vy) * 0.7 // Bounce up with some dampening

        // Show juggle combo
        const juggleText = fm.juggleCount > 1 ? `JUGGLE x${fm.juggleCount}! ${pts}` : String(pts)
        this.addPopup(fm.x + fm.w / 2, fm.y + fm.h / 2, juggleText)

        // Visual feedback - more particles with higher juggle count
        const burstSize = Math.min(this.isClassicMode() ? 8 : 16, 4 + fm.juggleCount * 2)
        this.particles.emitExplosion(
          fm.x + fm.w / 2,
          fm.y + fm.h / 2,
          fm.poisoned ? '#ff6d4c' : '#7ea5d3',
          burstSize
        )

        // Play juggle sound with increasing pitch
        sfx.juggle(fm.juggleCount)

        // Destroy mushroom after many juggles or if it goes too high
        if (fm.juggleCount >= 5) {
          fm.active = false
          this.addPopup(fm.x + fm.w / 2, fm.y + fm.h / 2, 'PERFECT JUGGLE!')
          sfx.extra()
        }

        return true
      }
    }

    // centipede segments
    for (let ci = 0; ci < this.centipedes.length; ci++) {
      const cent = this.centipedes[ci]
      for (let si = 0; si < cent.segments.length; si++) {
        const s = cent.segments[si]
        const rect = this.segRect(cent, s)
        if (aabb(b.rect(), rect)) {
          b.active = false
          if (!this.grid.get(s.c, s.r)) this.grid.set(s.c, s.r, new Mushroom(s.c, s.r))
          const killedHead = si === 0
          const pts = killedHead ? SCORE.HEAD : SCORE.SEGMENT
          this.stats.kills.pentipede++
          this.addScore(pts)
          this.addPopup(s.c * CELL + CELL / 2, s.r * CELL + CELL / 2, String(pts))
          sfx.hit()

          // Explosion effect
          const color = killedHead ? '#ff744a' : '#6e8dbf'
          this.particles.emitExplosion(
            s.c * CELL + CELL / 2,
            s.r * CELL + CELL / 2,
            color,
            this.isClassicMode() ? 5 : 12
          )

          const left = cent.segments.slice(0, si)
          const right = cent.segments.slice(si + 1)
          this.centipedes.splice(ci, 1)
          if (left.length) {
            left[0].head = true
            this.centipedes.push(cent.split(left, this.level))
          }
          if (right.length) {
            right[0].head = true
            this.centipedes.push(cent.split(right, this.level))
          }
          return true
        }
      }
    }

    // spider
    for (const sp of this.spiders) {
      if (!sp.dead && aabb(b.rect(), sp.rect())) {
        sp.dead = true
        b.active = false
        const pts = this.spiderScore(sp)
        this.addScore(pts)
        this.addPopup(sp.x + sp.w / 2, sp.y + sp.h / 2, String(pts))
        sfx.spider()
        this.stats.kills.scobster++
        this.particles.emitExplosion(
          sp.x + sp.w / 2,
          sp.y + sp.h / 2,
          '#88bf63',
          this.isClassicMode() ? 6 : 12
        )
        this.maybeDropPowerUp(sp.x + sp.w / 2, sp.y + sp.h / 2)
        return true
      }
    }

    // flea
    for (const f of this.fleas) {
      if (!f.dead && aabb(b.rect(), f.rect())) {
        f.dead = true
        b.active = false
        const concurrentFleas = this.fleas.filter((ff) => !ff.dead).length
        const pts = SCORE.FLEA * this.fleaMultiplier
        if (concurrentFleas > 1) {
          this.fleaMultiplier = Math.min(32, this.fleaMultiplier * 2)
        } else {
          this.fleaMultiplier = 1
        }
        this.addScore(pts)
        this.addPopup(f.x + f.w / 2, f.y + f.h / 2, String(pts))
        sfx.flea()
        this.stats.kills.flick++
        this.particles.emitExplosion(
          f.x + f.w / 2,
          f.y + f.h / 2,
          '#8aa4cc',
          this.isClassicMode() ? 4 : 10
        )
        this.maybeDropPowerUp(f.x + f.w / 2, f.y + f.h / 2)
        return true
      }
    }

    // gecko
    for (const sc of this.geckos) {
      if (!sc.dead && aabb(b.rect(), sc.rect())) {
        sc.dead = true
        b.active = false
        this.addScore(ENEMIES.GORDON_THE_GECKO.SCORE)
        this.addPopup(sc.x + sc.w / 2, sc.y + sc.h / 2, String(ENEMIES.GORDON_THE_GECKO.SCORE))
        sfx.gecko()
        this.stats.kills.gecko++
        this.particles.emitExplosion(
          sc.x + sc.w / 2,
          sc.y + sc.h / 2,
          '#cc705a',
          this.isClassicMode() ? 6 : 12
        )
        this.maybeDropPowerUp(sc.x + sc.w / 2, sc.y + sc.h / 2)
        return true
      }
    }

    // spaceship / UFO
    for (const ufo of this.ufos) {
      if (!ufo.dead && aabb(b.rect(), ufo.rect())) {
        ufo.dead = true
        b.active = false
        const steps = (SCORE.SPACESHIP_MAX - SCORE.SPACESHIP_MIN) / 100
        const pts = SCORE.SPACESHIP_MIN + Math.floor(this.rand() * (steps + 1)) * 100
        this.addScore(pts, 'bonus')
        this.addPopup(ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, String(pts))
        sfx.ufo()
        this.stats.kills.ufo++
        this.particles.emitExplosion(
          ufo.x + ufo.w / 2,
          ufo.y + ufo.h / 2,
          '#aac7ab',
          this.isClassicMode() ? 8 : 14
        )
        return true
      }
    }

    return false
  }

  private spiderScore(sp: Spider): number {
    // The source describes score by proximity, so use the actual distance
    // between sprite centers rather than only their vertical separation.
    return getScobsterScore(getScobsterDistance(this.player.rect(), sp.rect()))
  }

  private handleTouchdowns(count: number) {
    const modeTuning = getLevelTuning(this.level, this.settings.gameMode)
    const touchdownRules = getTouchdownRules(this.settings.gameMode)
    this.addPopup(FIELD_W / 2, (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL - 8, 'TOUCHDOWN')
    for (let i = 0; i < count; i++) {
      const totalSegments = this.centipedes.reduce((n, c) => n + c.segments.length, 0)
      if (totalSegments < touchdownRules.segmentCap) {
        const len = Math.max(4, Math.min(modeTuning.centipedeLength, 14))
        this.centipedes.push(new Centipede(len, this.level))
      }

      if (!spawnsTouchdownFriends(this.settings.gameMode)) continue
      if (this.touchdownFriendCd > 0) continue
      const roll = this.rand()
      if (roll < 0.45 && this.spiders.length < (this.settings.gameMode === 'classic' ? 1 : 2)) {
        this.spiders.push(new Spider(this.level, this.rand, this.player.x + this.player.w / 2))
      } else if (roll < 0.8 && this.fleas.length < 3) {
        this.fleas.push(new Flea(this.rand))
      } else if (this.geckos.length < 2) {
        this.geckos.push(new Gecko(this.rand))
      }
      this.touchdownFriendCd = touchdownRules.friendCooldown
    }
  }

  private segRect(cent: Centipede, s: Segment) {
    const pos = cent.segmentPixel(s)
    return { x: pos.x + 2, y: pos.y + 2, w: CELL - 4, h: CELL - 4 }
  }

  private loseLife() {
    // Don't lose life if shield is active or phase shifting
    if (this.player.isShieldActive() || this.player.phaseShiftActive) {
      this.shakeT = 0.15
      return
    }
    // One hit costs one life: nothing can hit again during the shatter freeze
    // or the short invulnerable window after respawn.
    if (this.invulnT > 0 || this.deathT > 0 || !this.player.alive) return

    this.lives--
    this.player.alive = false
    this.shakeT = 0.35
    this.hitsTaken++
    this.shotsCarry += this.player.shotsFired
    this.player.shotsFired = 0
    this.pendingPowerUps = this.player.hasPowerUp('lock') ? this.player.getPowerUpSnapshot() : []
    for (const b of this.player.bullets) b.active = false

    const cx = this.player.x + this.player.w / 2
    const cy = this.player.y + this.player.h / 2
    const shards = this.isClassicMode() ? 14 : 22
    this.particles.emitExplosion(cx, cy, '#9ff6ff', shards)
    this.particles.emitExplosion(cx, cy, '#ffffff', Math.floor(shards / 2))
    sfx.death()
    this.deathT = DEATH_FREEZE_SECONDS
  }

  private finishDeath() {
    this.deathT = 0
    if (this.lives <= 0) {
      this.stats.waveScores.push(this.score - this.waveStartScore)
      this.mode = 'gameover'
      music.stop()
      sfx.gameover()
      this.notifyStateChange()
      return
    }

    // Clear everything that could be sitting on the spawn point. The Pentipede
    // stays where it is; the invulnerable window covers it.
    this.spiders.length = 0
    this.fleas.length = 0
    this.geckos.length = 0
    this.ufos.length = 0
    this.fallingMushrooms.length = 0
    this.reflectedBullets.length = 0
    this.fleaMultiplier = 1

    this.player = new Player()
    if (this.pendingPowerUps.length) this.player.restorePowerUps(this.pendingPowerUps)
    this.pendingPowerUps = []
    this.invulnT = RESPAWN_INVULN_SECONDS
  }

  private hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `${r},${g},${b}`
  }

  private isClassicMode(): boolean {
    return this.settings.gameMode === 'classic'
  }

  private addPopup(x: number, y: number, text: string) {
    this.popups.push({ x, y, text, t: 0.7 })
    if (this.popups.length > 12) this.popups.shift()
  }

  private addScore(basePoints: number, type: 'normal' | 'chain' | 'bonus' = 'normal') {
    let finalPoints = basePoints

    // PSYCHEDELIC MULTIPLIER - rainbow mushroom effect!
    if (this.psychedelicMultiplier > 1) {
      finalPoints *= this.psychedelicMultiplier
    }

    if (usesModernScoring(this.settings.gameMode)) {
      finalPoints *= 1 + (this.level - 1) * SCORE.LEVEL_MULTIPLIER

      if (type === 'normal') {
        finalPoints *= this.combo
        this.comboTimer = SCORING.COMBO_WINDOW
        this.combo = Math.min(this.combo + 0.5, SCORING.MAX_COMBO)
        this.chainHits++
        this.chainTimer = SCORING.CHAIN_TIMEOUT

        for (const [multiplier, required] of Object.entries(SCORING.CHAIN_REQUIREMENTS)) {
          if (this.chainHits === required) {
            const bonus = basePoints * (+multiplier - 1)
            this.addScore(bonus, 'chain')
            this.addPopup(this.player.x + this.player.w / 2, this.player.y, `CHAIN x${multiplier}!`)
            break
          }
        }
      }
    }

    finalPoints = Math.round(finalPoints)
    if (type !== 'normal' && usesModernScoring(this.settings.gameMode)) {
      this.sidebarBonus = Math.min(MAX_BONUS_SCORE, this.sidebarBonus + finalPoints)
    }

    this.recordScore(finalPoints)

    return finalPoints
  }

  private recordScore(points: number) {
    if (points <= 0) return
    this.score += points
    if (!this.cheated && this.score > this.highScore) {
      this.highScore = this.score
      try {
        localStorage.setItem('apeiron_hi', String(this.highScore))
      } catch {}
    }
    while (this.score >= this.nextExtraLife) {
      if (this.lives < 8) {
        this.lives++
        sfx.extra()
      }
      this.nextExtraLife += EXTRA_LIFE_STEP
    }
  }

  private updateScoring(dt: number) {
    if (!usesModernScoring(this.settings.gameMode)) return

    if (this.comboTimer > 0) {
      this.comboTimer -= dt
    } else if (this.combo > 1) {
      this.combo = Math.max(1, this.combo - SCORING.COMBO_DECAY_RATE * dt)
    }

    if (this.chainTimer > 0) {
      this.chainTimer -= dt
      if (this.chainTimer <= 0) {
        this.chainHits = 0
      }
    }
  }

  private awardLevelBonuses() {
    if (!usesModernScoring(this.settings.gameMode)) return

    let bonusText = ''
    let totalBonus = SCORE.LEVEL_COMPLETION

    let remainingMushrooms = 0
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        if (this.grid.get(c, r)) remainingMushrooms++
      }
    }
    this.mushroomsLost = Math.max(0, this.initialMushrooms - remainingMushrooms)

    if (this.mushroomsLost === 0) {
      totalBonus += SCORE.PERFECT_CLEAR
      bonusText += 'PERFECT FIELD '
    }

    if (this.levelElapsed < this.getParTime()) {
      totalBonus += SCORE.SPEED_CLEAR
      bonusText += 'SPEED CLEAR '
    }

    if (this.hitsTaken === 0) {
      totalBonus += SCORE.NO_HIT
      bonusText += 'FLAWLESS '
    }

    totalBonus += remainingMushrooms * SCORE.MUSHROOM_FIELD_BONUS

    if (totalBonus > 0) {
      this.addScore(totalBonus, 'bonus')
      if (bonusText) {
        this.addPopup(FIELD_W / 2, FIELD_H / 2, bonusText.trim())
      }
    }
  }

  private getParTime(): number {
    if (this.level <= 5) return SCORING.PAR_TIMES.EASY
    if (this.level <= 10) return SCORING.PAR_TIMES.MEDIUM
    if (this.level <= 15) return SCORING.PAR_TIMES.HARD
    return SCORING.PAR_TIMES.EXPERT
  }

  private startLevel() {
    const tuning = getLevelTuning(this.level, this.settings.gameMode)
    this.sidebarBonus = usesModernScoring(this.settings.gameMode) ? 0 : CLASSIC_BONUS.START
    this.bonusCarry = 0
    this.waveStartScore = this.score
    music.setWave(this.level)

    // Update background theme based on wave (changes every 4 waves like original)
    this.backgroundEffects.setWave(this.level)

    // Reset level-specific scoring
    this.combo = 1
    this.comboTimer = 0
    this.chainHits = 0
    this.chainTimer = 0
    this.levelElapsed = 0
    this.hitsTaken = 0

    // Setup mushroom field
    this.seedMushrooms(tuning.mushroomDensity)

    // Count initial mushrooms for perfect field bonus
    this.initialMushrooms = 0
    this.mushroomsLost = 0
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid.get(c, r)) this.initialMushrooms++
      }
    }

    // Setup enemies. Canon composition: one shrinking main body plus independent
    // single-segment heads spread across the top, growing in number by wave.
    const comp = getWaveComposition(this.level, this.settings.gameMode)
    this.centipedes = [new Centipede(comp.mainLength, this.level)]
    for (let h = 0; h < comp.loneHeads; h++) {
      const col = Math.floor(((h + 1) * COLS) / (comp.loneHeads + 1))
      this.centipedes.push(new Centipede(1, this.level, col))
    }
    this.spiders.length = 0
    this.fleas.length = 0
    this.geckos.length = 0
    this.ufos.length = 0
    this.fallingMushrooms.length = 0
    this.reflectedBullets.length = 0
    this.coins.length = 0
    this.touchdownFriendCd = 0

    this.spiderTimer = randRange(tuning.spiderMin, tuning.spiderMax, this.rand)
    this.geckoTimer = randRange(tuning.geckoMin, tuning.geckoMax, this.rand)
    this.fleaCd =
      this.settings.gameMode === 'classic'
        ? TIMERS.SPAWN_FLEA_COOLDOWN
        : Math.max(1.1, TIMERS.SPAWN_FLEA_COOLDOWN * 0.82)
    this.ufoTimer = randRange(ENEMIES.UFO.SPAWN_MIN_TIME, ENEMIES.UFO.SPAWN_MAX_TIME, this.rand)
  }

  private spawnPowerUp(x: number, y: number) {
    // Don't spawn if we already have too many active Yummies
    if (this.powerUps.filter((p) => p.active).length >= YUMMIES.SPAWN.MAX_ACTIVE) {
      return
    }

    // Random Yummy type
    const type = YUMMIES.TYPES[Math.floor(this.rand() * YUMMIES.TYPES.length)]

    // Create new Yummy
    this.powerUps.push(new PowerUp(x - GRID.CELL / 2, y - GRID.CELL / 2, type, this.rand))

    if (!this.isClassicMode()) {
      this.backgroundEffects.addEnergyField(x, y, 1.0)
    }

    const sparkleCount = this.isClassicMode() ? 3 : 8
    for (let i = 0; i < sparkleCount; i++) {
      this.particles.powerUpSparkle(
        x + (this.rand() - 0.5) * GRID.CELL,
        y + (this.rand() - 0.5) * GRID.CELL,
        type
      )
    }
  }

  private maybeDropPowerUp(x: number, y: number) {
    if (enemiesDropYummies(this.settings.gameMode) && this.rand() < POWERUPS.SPAWN_CHANCE) {
      this.spawnPowerUp(x, y)
    }
    // Bonus score coins/frenzies are an Enhanced addition. The original
    // Yummy coins use the PowerUp path above in both modes.
    if (spawnsCoins(this.settings.gameMode)) {
      this.maybeDropCoin(x, y)
    }
  }

  // COIN SYSTEM - coins drop from enemies and can trigger frenzy
  private maybeDropCoin(x: number, y: number) {
    if (this.coins.length >= COINS.MAX_ACTIVE) return

    if (this.rand() < COINS.DROP_CHANCE) {
      this.spawnCoin(x, y)

      // Check for coin frenzy trigger
      if (this.rand() < COINS.FRENZY_CHANCE && !this.coinFrenzyActive) {
        this.triggerCoinFrenzy()
      }
    }
  }

  private spawnCoin(x: number, y: number) {
    if (this.coins.length >= COINS.MAX_ACTIVE) return
    this.coins.push({
      x: x + (this.rand() - 0.5) * GRID.CELL,
      y,
      vy: COINS.FALL_SPEED,
      active: true,
      value: SCORE.COIN,
    })
  }

  // COIN FRENZY - fill the bottom third of screen with coins!
  private triggerCoinFrenzy() {
    this.coinFrenzyActive = true
    this.coinsCollected = 0
    this.addPopup(FIELD_W / 2, FIELD_H / 3, 'COIN FRENZY!')
    sfx.coinFrenzy()

    // Spawn many coins across the top
    const fieldW = COLS * CELL
    for (let i = 0; i < COINS.FRENZY_COUNT && this.coins.length < COINS.MAX_ACTIVE; i++) {
      this.coins.push({
        x: this.rand() * fieldW,
        y: -this.rand() * 100 - 10,
        vy: COINS.FALL_SPEED * (0.8 + this.rand() * 0.4),
        active: true,
        value: SCORE.COIN,
      })
    }

    // End frenzy after duration via a deterministic countdown ticked in update(),
    // not setTimeout (wall-clock timers break the fixed-timestep engine + VR replay).
    this.coinFrenzyTimer = TIMERS.COIN_FRENZY_DURATION
  }

  // Ticks the active coin-frenzy countdown; fires the end-of-frenzy bonus once it expires.
  private updateCoinFrenzy(dt: number) {
    if (!this.coinFrenzyActive) return
    this.coinFrenzyTimer -= dt
    if (this.coinFrenzyTimer > 0) return
    this.coinFrenzyTimer = 0
    this.coinFrenzyActive = false
    if (this.coinsCollected > 10) {
      this.addScore(SCORE.COIN_FRENZY_BONUS, 'bonus')
      this.addPopup(FIELD_W / 2, FIELD_H / 2, `FRENZY BONUS! ${this.coinsCollected} COINS!`)
    }
  }

  private resetGame(keepHi = false, seed?: number) {
    // Every run gets its own seed; the whole run is still a pure function of it.
    this.seed = (seed ?? pickSeed()) >>> 0
    this.rand = makeRng(this.seed)
    this.cheated = false
    this.stats = newRunStats()
    this.shotsCarry = 0
    this.waveStartScore = 0
    this.deathT = 0
    this.invulnT = 0
    this.pendingPowerUps = []
    this.levelClearT = 0
    this.popups = []
    this.particles.clear()
    if (!keepHi) {
      try {
        const hi = localStorage.getItem('apeiron_hi')
        if (hi) this.highScore = Math.max(this.highScore, parseInt(hi, 10) || 0)
      } catch {}
    }
    this.score = 0
    this.lives = 3
    this.level = 1
    this.nextExtraLife = EXTRA_LIFE_STEP
    this.sidebarBonus = 0
    this.grid = new Grid(COLS, ROWS)
    this.player = new Player()
    this.centipedes = []
    this.spiders = []
    this.fleas = []
    this.geckos = []
    this.ufos = []
    this.powerUps = []
    this.fallingMushrooms = []
    this.reflectedBullets = []
    this.coins = []
    this.psychedelicTimer = 0
    this.psychedelicMultiplier = 1
    this.coinFrenzyActive = false
    this.coinsCollected = 0
    this.coinFrenzyTimer = 0
    this.spiderTimer = randRange(TIMERS.SPAWN_SPIDER_MIN, TIMERS.SPAWN_SPIDER_MAX, this.rand)
    this.fleaCd = TIMERS.SPAWN_FLEA_COOLDOWN
    this.geckoTimer = randRange(TIMERS.SPAWN_GECKO_MIN, TIMERS.SPAWN_GECKO_MAX, this.rand)
    this.startLevel()
  }

  private draw() {
    const g = this.ctx
    const fieldW = FIELD_W
    const panelX = Math.round(fieldW * this.fieldScale)
    const panelW = Math.max(0, this.width - panelX)
    const profile = this.getVisualProfile()
    g.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'

    // Backdrop for the whole canvas (panel + field).
    g.fillStyle = '#101010'
    g.fillRect(0, 0, this.width, this.height)

    // Update and draw background effects
    this.backgroundEffects.setProfile(profile)
    this.backgroundEffects.setMotion(this.settings.movingBackdrops)
    this.backgroundEffects.setLit(this.settings.sprites3d)
    this.backgroundEffects.update(1 / 60)
    this.backgroundEffects.draw()

    // Deterministic screen shake (sin/cos phase) without RNG
    let sx = 0,
      sy = 0
    if (this.shakeT > 0 && this.settings.screenShake) {
      const m = 3 * (this.shakeT / 0.35)
      sx = Math.sin(this.tGlobal * 80) * m
      sy = Math.cos(this.tGlobal * 60) * m
    }

    g.save()
    g.translate(sx, sy)

    // Gameplay area is clipped to the left field. Sidebar is right panel.
    g.save()
    g.beginPath()
    g.rect(0, 0, panelX, this.height)
    g.clip()
    // Everything from here to the matching restore is in field units.
    g.scale(this.fieldScale, this.fieldScale)
    this.backgroundEffects.drawEnergy()

    // mushrooms
    const atlas = this.settings.sprites3d ? this.atlas : null
    const theme = this.backgroundEffects.getTheme()
    const mushroomRim =
      theme === 'ocean' || theme === 'neon' || theme === 'cosmic'
        ? 'rgba(255, 240, 205, 0.8)'
        : null
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const m = this.grid.get(c, r)
        if (!m) continue
        const x = c * CELL,
          y = r * CELL
        if (atlas && !m.psychedelic) {
          const hp = Math.max(1, Math.min(4, m.hp))
          const key = m.reflective
            ? 'mush:reflective'
            : `mush:${profile}:${m.poisoned ? 1 : 0}:${hp}`
          if (drawTile(g, atlas, key, x + CELL / 2, y + 10)) continue
        }
        drawMushroom(
          g,
          x,
          y,
          m.poisoned,
          m.hp,
          profile,
          m.reflective,
          m.psychedelic,
          this.tGlobal,
          mushroomRim
        )
      }
    for (const fm of this.fallingMushrooms) {
      if (!fm.active) continue
      drawMushroom(g, fm.x, fm.y, fm.poisoned, 1, profile, false, false, this.tGlobal, mushroomRim)
    }

    // centipede
    for (const cent of this.centipedes) {
      const stride = cent.stepFraction
      for (let i = 0; i < cent.segments.length; i++) {
        const s = cent.segments[i]
        const pos = cent.segmentPixel(s)
        const phase = (stride + (i % 2) * 0.5) % 1
        if (atlas) {
          const frame = Math.floor(phase * FRAMES.segment) % FRAMES.segment
          const key = `seg:${profile}:${s.head ? 'h' : 'b'}:${frame}`
          if (drawTile(g, atlas, key, pos.x + CELL / 2, pos.y + 8.5)) continue
        }
        drawSegment(g, pos.x, pos.y, s.head, profile, phase)
      }
    }

    // enemies
    for (const sp of this.spiders) {
      const frame = Math.floor(this.tGlobal * 12) % FRAMES.scobster
      if (atlas && drawTile(g, atlas, `scobster:${frame}`, sp.x + sp.w / 2, sp.y + sp.h / 2))
        continue
      drawSpider(g, sp.x, sp.y, sp.w, sp.h)
    }
    for (const f of this.fleas) {
      const frame = Math.floor(this.tGlobal * 14) % FRAMES.flick
      if (atlas && drawTile(g, atlas, `flick:${frame}`, f.x + f.w / 2, f.y + f.h / 2)) continue
      drawFlea(g, f.x, f.y, f.w, f.h)
    }
    for (const sc of this.geckos) {
      const frame = Math.floor(this.tGlobal * 12) % FRAMES.gecko
      if (
        atlas &&
        drawTile(g, atlas, `gecko:${frame}`, sc.x + sc.w / 2, sc.y + sc.h / 2, 1, sc.vx < 0)
      )
        continue
      drawGecko(g, sc.x, sc.y, sc.w, sc.h)
    }
    for (const ufo of this.ufos) {
      if (ufo.dead) continue
      const frame = Math.floor(this.tGlobal * 10) % FRAMES.ufo
      const hover = Math.sin(this.tGlobal * 5) * 1.2
      if (atlas) {
        // The saucer flies above the field: its shadow is drawn on the ground below.
        g.fillStyle = 'rgba(0,0,0,0.22)'
        g.beginPath()
        g.ellipse(ufo.x + ufo.w / 2, ufo.y + ufo.h + 9, 10, 3.2, 0, 0, Math.PI * 2)
        g.fill()
        if (drawTile(g, atlas, `ufo:${frame}`, ufo.x + ufo.w / 2, ufo.y + ufo.h / 2 + hover))
          continue
      }
      drawUFO(g, ufo.x, ufo.y, ufo.w, ufo.h)
    }

    // power-ups
    g.font = '10px ui-monospace, Menlo, monospace'
    g.textAlign = 'center'
    for (const p of this.powerUps) {
      if (!p.active) continue
      if (atlas) {
        const frame = Math.floor(this.tGlobal * 9 + p.x) % FRAMES.coin
        p.draw(g, () => drawTile(g, atlas, `coin:${frame}`, 0, 0), Math.cos(coinAngle(frame)))
      } else {
        p.draw(g)
      }
    }
    g.textAlign = 'start'

    // player & bullets
    const p = this.player

    // Draw shield effect if active
    if (p.alive && p.isShieldVisible()) {
      g.fillStyle = `rgba(${this.hexToRgb(POWERUP_COLORS.shield)},0.22)`
      g.fillRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4)
    }

    if (p.alive) {
      // Blink while invulnerable after a respawn (a steady fade with Reduce Flashing).
      const blinking = this.invulnT > 0 && this.mode !== 'title'
      const hidden =
        blinking && !this.settings.reduceFlashing && Math.floor(this.invulnT * 10) % 2 === 1
      if (!hidden) {
        if (blinking) g.globalAlpha = 0.55
        const spin = Math.floor(this.tGlobal * 14) % FRAMES.crystal
        if (!atlas || !drawTile(g, atlas, `crystal:${spin}`, p.x + p.w / 2, p.y + p.h / 2 + 1)) {
          drawPlayer(g, p.x, p.y, p.w, p.h, profile, this.tGlobal)
        }
        g.globalAlpha = 1
      }
    }
    if (p.alive && p.flashT > 0) {
      drawMuzzleFlash(g, p.x, p.y, p.w, Math.min(1, p.flashT / 0.05), profile)
    }
    for (const b of p.bullets) {
      if (!b.active) continue
      if (atlas) {
        // Plasma glow under the shot.
        const glow = g.createRadialGradient(b.x + 1, b.y + 3, 0, b.x + 1, b.y + 3, 9)
        glow.addColorStop(0, 'rgba(255, 214, 140, 0.55)')
        glow.addColorStop(1, 'rgba(255, 150, 60, 0)')
        g.save()
        g.globalCompositeOperation = 'lighter'
        g.fillStyle = glow
        g.fillRect(b.x - 8, b.y - 6, 18, 18)
        g.restore()
      }
      drawBullet(g, b.x, b.y, profile)
    }

    // REFLECTED BULLETS - dangerous red bullets coming at player
    for (const rb of this.reflectedBullets) {
      if (!rb.active) continue
      g.fillStyle = '#ff3030'
      g.beginPath()
      g.roundRect(rb.x - 2, rb.y - 5, 4, 10, 2)
      g.fill()
      g.fillStyle = '#ffaaaa'
      g.beginPath()
      g.ellipse(rb.x, rb.y - 3, 1.5, 1, 0, 0, Math.PI * 2)
      g.fill()
    }

    // COINS - golden collectibles
    for (const coin of this.coins) {
      if (!coin.active) continue
      const pulse = 0.8 + Math.sin(this.tGlobal * 8 + coin.x) * 0.2
      // Gold coin with shine
      g.fillStyle = '#ffd700'
      g.beginPath()
      g.arc(coin.x, coin.y, 5 * pulse, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#b8860b'
      g.lineWidth = 1
      g.stroke()
      // Shine highlight
      g.fillStyle = '#fff8dc'
      g.beginPath()
      g.arc(coin.x - 1.5, coin.y - 1.5, 1.5, 0, Math.PI * 2)
      g.fill()
    }

    this.particles.draw(g)

    // Player zone line
    if (VISUAL.PLAYER_ZONE_LINE) {
      const yLine = (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL + 0.5
      g.strokeStyle = 'rgba(255,255,255,0.15)'
      g.lineWidth = 1
      g.beginPath()
      g.moveTo(0, yLine)
      g.lineTo(fieldW, yLine)
      g.stroke()
    }

    // Floating score popups
    if (this.popups.length) {
      g.font = '12px ui-monospace, Menlo, monospace'
      g.textAlign = 'center'

      for (const p of this.popups) {
        const a = Math.max(0, Math.min(1, p.t / 0.7))
        g.fillStyle = this.isClassicMode() ? `rgba(118,208,232,${a})` : `rgba(235,255,255,${a})`
        g.fillText(p.text, p.x, p.y)
      }

      g.textAlign = 'start'
    }

    // Level clear flash overlay
    if (this.levelClearT > 0) {
      const total = usesModernScoring(this.settings.gameMode) ? 0.6 : WAVE_CLEAR_SECONDS
      const sinceClear = total - this.levelClearT
      const peak = this.settings.reduceFlashing ? 0.2 : 0.8
      const a = peak * Math.max(0, 1 - sinceClear / WAVE_CLEAR_FLASH_SECONDS)
      if (a > 0) {
        g.fillStyle = `rgba(255,255,255,${a})`
        g.fillRect(0, 0, fieldW, FIELD_H)
      }
      g.font = '700 22px "Times New Roman", Georgia, serif'
      g.textAlign = 'center'
      g.lineWidth = 3
      g.strokeStyle = 'rgba(10,10,14,0.85)'
      g.strokeText(`WAVE ${this.displayWave()} CLEAR`, fieldW / 2, FIELD_H / 2 - 8)
      g.fillStyle = '#ffe9a8'
      g.fillText(`WAVE ${this.displayWave()} CLEAR`, fieldW / 2, FIELD_H / 2 - 8)
      g.textAlign = 'start'
    }

    // PSYCHEDELIC EFFECT - rainbow screen flash!
    if (this.psychedelicTimer > 0) {
      // Reduce Flashing: a steady, faint tint instead of the moving pulse.
      const calm = this.settings.reduceFlashing
      const phase = calm ? 0 : this.tGlobal * 4
      const intensity = calm
        ? 0.12
        : Math.min(0.35, (this.psychedelicTimer / TIMERS.PSYCHEDELIC_DURATION) * 0.5)

      // Rainbow gradient overlay
      const rainbowGrad = g.createLinearGradient(0, 0, fieldW, FIELD_H)
      rainbowGrad.addColorStop(0, `rgba(255,0,0,${intensity})`)
      rainbowGrad.addColorStop(0.17, `rgba(255,127,0,${intensity})`)
      rainbowGrad.addColorStop(0.33, `rgba(255,255,0,${intensity})`)
      rainbowGrad.addColorStop(0.5, `rgba(0,255,0,${intensity})`)
      rainbowGrad.addColorStop(0.67, `rgba(0,127,255,${intensity})`)
      rainbowGrad.addColorStop(0.83, `rgba(127,0,255,${intensity})`)
      rainbowGrad.addColorStop(1, `rgba(255,0,127,${intensity})`)

      g.save()
      g.globalCompositeOperation = 'overlay'
      g.fillStyle = rainbowGrad
      g.fillRect(0, 0, fieldW, FIELD_H)

      // Pulsing radial effect
      const pulseRad = g.createRadialGradient(
        fieldW / 2 + Math.sin(phase) * 50,
        FIELD_H / 2 + Math.cos(phase) * 50,
        0,
        fieldW / 2,
        FIELD_H / 2,
        fieldW
      )
      pulseRad.addColorStop(0, `rgba(255,255,255,${intensity * 0.5})`)
      pulseRad.addColorStop(0.5, `rgba(255,200,255,${intensity * 0.3})`)
      pulseRad.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = pulseRad
      g.fillRect(0, 0, fieldW, FIELD_H)
      g.restore()

      // Show multiplier text
      g.font = 'bold 16px ui-monospace, Menlo, monospace'
      g.textAlign = 'center'
      g.fillStyle = calm
        ? 'rgba(255,255,255,0.9)'
        : `rgba(255,255,255,${0.6 + Math.sin(this.tGlobal * 10) * 0.4})`
      g.fillText(`${PSYCHEDELIC.POINT_MULTIPLIER}x POINTS!`, fieldW / 2, 30)
      g.textAlign = 'start'
    }

    // Debug overlays
    if (this.settings.showFPS || this.settings.showHitboxes) {
      g.save()
      g.globalAlpha = 0.8

      // FPS counter
      if (this.settings.showFPS) {
        const fps = Math.round(1000 / (performance.now() - this.last))
        g.fillStyle = '#fff'
        g.font = '12px ui-monospace, Menlo, monospace'
        g.fillText(`FPS: ${fps}`, fieldW - 60, 15)
      }

      // Hitboxes
      if (this.settings.showHitboxes) {
        g.strokeStyle = 'rgba(255, 0, 0, 0.5)'
        g.lineWidth = 1

        // Player hitbox
        const pr = this.player.rect()
        g.strokeRect(pr.x, pr.y, pr.w, pr.h)

        // Bullet hitboxes
        for (const b of this.player.bullets) {
          if (!b.active) continue
          const br = b.rect()
          g.strokeRect(br.x, br.y, br.w, br.h)
        }

        // Enemy hitboxes
        for (const sp of this.spiders) {
          if (sp.dead) continue
          const r = sp.rect()
          g.strokeRect(r.x, r.y, r.w, r.h)
        }

        for (const f of this.fleas) {
          if (f.dead) continue
          const r = f.rect()
          g.strokeRect(r.x, r.y, r.w, r.h)
        }

        for (const sc of this.geckos) {
          if (sc.dead) continue
          const r = sc.rect()
          g.strokeRect(r.x, r.y, r.w, r.h)
        }

        for (const ufo of this.ufos) {
          if (ufo.dead) continue
          const r = ufo.rect()
          g.strokeRect(r.x, r.y, r.w, r.h)

          // Show destruction radius
          g.strokeStyle = 'rgba(0, 255, 255, 0.2)'
          g.beginPath()
          g.arc(r.x + r.w / 2, r.y + r.h / 2, ENEMIES.UFO.MUSHROOM_DESTROY_RADIUS, 0, Math.PI * 2)
          g.stroke()
        }

        // Centipede segment hitboxes
        for (const cent of this.centipedes) {
          for (const s of cent.segments) {
            const r = this.segRect(cent, s)
            g.strokeRect(r.x, r.y, r.w, r.h)
          }
        }
      }
      g.restore()
    }

    g.restore()
    this.sidebar.draw(g, panelX, panelW, {
      profile,
      score: this.score,
      bonus: this.sidebarBonus,
      lives: this.lives,
      wave: this.displayWave(),
      hasLock: this.player.hasPowerUp('lock'),
      hasDiamond: this.player.hasPowerUp('diamond'),
      hasGun: this.player.hasPowerUp('machine_gun'),
      autofireTime: this.player.autofireTime,
    })
    g.restore()
  }

  private getVisualProfile(): VisualProfile {
    return this.settings.gameMode === 'classic' ? 'classic' : 'x'
  }

  // The 1995 wave counter has two digits and wraps after 99.
  private displayWave(): number {
    return ((Math.max(1, this.level) - 1) % 99) + 1
  }

  pause(by: 'key' | 'caps' | 'auto' | 'ui' = 'ui') {
    if (this.mode === 'playing') {
      this.mode = 'pause'
      this.pausedBy = by
      this.cheatBuffer = ''
      this.keys.clear()
      music.pause()
      this.notifyStateChange()
    }
  }

  // seed: pass one to replay a specific field (daily challenge). Omit for a random run.
  startNewGame(seed?: number) {
    this.mode = 'playing'
    this.resetGame(false, seed)
    sfx.start()
    music.start()
    this.notifyStateChange()
  }

  resume() {
    if (this.mode === 'pause') {
      this.mode = 'playing'
      this.cheatBuffer = ''
      music.resume()
      this.notifyStateChange()
    }
  }

  abortToTitle() {
    if (this.mode === 'title') return
    this.mode = 'title'
    music.stop()
    // The field behind the title menu is a fresh backdrop, not the abandoned run.
    this.resetGame(true)
    this.notifyStateChange()
  }

  updateSettings(newSettings: EngineSettings) {
    const fieldRulesChanged =
      newSettings.gameMode !== this.settings.gameMode ||
      newSettings.reflectingMushrooms !== this.settings.reflectingMushrooms
    this.settings = { ...newSettings }

    // Apply volume settings
    sfx.setVolume(this.settings.sfxVolume / 100)
    this.mouseInput.setRelative(this.settings.relativeMouse)
    music.setVolume(this.settings.musicVolume / 100)

    // Update particle density
    this.particles.setDensity(this.settings.particleDensity)

    if (!usesModernScoring(this.settings.gameMode)) {
      this.combo = 1
      this.comboTimer = 0
      this.chainHits = 0
      this.chainTimer = 0
    }

    // On the title screen the field behind the menu is only a backdrop: rebuild
    // it so the new rules and palette show immediately.
    if (fieldRulesChanged && this.mode === 'title') this.resetGame(true)
  }

  private applyCheat(word: keyof typeof CHEATS) {
    this.cheated = true
    const effect = CHEATS[word]
    if (effect === 'points') {
      this.recordScore(CHEAT_POINTS)
    } else if (effect === 'bonus') {
      this.sidebarBonus = Math.min(MAX_BONUS_SCORE, this.sidebarBonus + CHEAT_BONUS)
    } else if (effect === 'lives') {
      this.lives = 8
    } else {
      this.player.addPowerUp(effect)
    }
    sfx.extra()
    this.addPopup(FIELD_W / 2, FIELD_H / 2 + 40, `CHEAT: ${word}`)
    this.notifyStateChange()
  }

  private notifyStateChange() {
    this.stats.shots = this.shotsCarry + this.player.shotsFired
    // Menus need the real cursor back.
    if (this.mode !== 'playing') this.mouseInput.releaseLock()
    this.onStateChange?.({
      mode: this.mode,
      score: this.score,
      highScore: this.highScore,
      level: this.level,
      seed: this.seed,
      cheated: this.cheated,
      stats: {
        ...this.stats,
        kills: { ...this.stats.kills },
        waveScores: [...this.stats.waveScores],
      },
    })
  }

  private bindInput() {
    const onDown = (e: KeyboardEvent) => {
      // A menu panel owns the keyboard while it is open.
      if (this.uiBlocked) return

      // Paused: letters spell cheat words, as in the 1995 game.
      if (this.mode === 'pause' && /^Key[A-Z]$/.test(e.code) && !e.metaKey && !e.ctrlKey) {
        const letter = e.code.slice(3)
        const typingCheat =
          letter !== 'P' ||
          this.pausedBy === 'caps' ||
          (this.cheatBuffer.length > 0 && continuesCheat(this.cheatBuffer, 'P'))
        if (typingCheat) {
          const fed = feedCheatBuffer(this.cheatBuffer, letter)
          this.cheatBuffer = fed.buffer
          if (fed.word) this.applyCheat(fed.word)
          return
        }
      }

      this.keys.add(e.code)
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code))
        e.preventDefault()

      if (e.code === 'KeyP') {
        if (this.mode === 'playing') this.pause('key')
        else if (this.mode === 'pause') this.resume()
      } else if (e.code === 'CapsLock') {
        if (this.mode === 'playing') this.pause('caps')
        else if (this.mode === 'pause') this.resume()
      } else if (e.code === 'Escape' && this.mode === 'playing') {
        this.abortToTitle()
      } else if (this.mode === 'title' && e.code === 'Space') {
        this.startNewGame()
      } else if (this.mode === 'gameover' && e.code === 'Space') {
        this.startNewGame()
      }
    }

    const onUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code)
    }

    // Leaving the tab or window pauses the run. Skipped under the headless
    // harness, which never has focus.
    const onHide = () => {
      this.keys.clear()
      if (isTestHarness()) return
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') return
      this.pause('auto')
    }
    const onBlur = () => {
      this.keys.clear()
      if (isTestHarness()) return
      this.pause('auto')
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onHide)
    this.unbindHandlers = () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onHide)
    }
  }

  private unbindHandlers: (() => void) | null = null

  private unbindInput() {
    this.unbindHandlers?.()
    this.unbindHandlers = null
  }
}

function randRange(a: number, b: number, rng: () => number = Math.random) {
  return a + rng() * (b - a)
}
function inBounds(c: number, r: number) {
  return c >= 0 && c < COLS && r >= 0 && r < ROWS
}
