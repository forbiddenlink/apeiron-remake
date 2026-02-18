import { GRID, SCORE, SCORING, EXTRA_LIFE_STEP, VISUAL, YUMMIES, ENEMIES, DEBUG, POWERUPS, POWERUP_COLORS, TIMERS, REFLECTED_BULLET, PSYCHEDELIC, COINS } from './GameConfig';
import { Grid, Mushroom } from './Grid';
import { Player, type PowerUpType, type Bullet } from './Player';
import { Centipede } from './Centipede';
import { Spider, Flea, Scorpion } from './Enemies';
import { UFO } from './UFO';
import { PowerUp } from './PowerUp';
import { ParticleSystem } from './ParticleSystem';
import { BackgroundEffects } from './BackgroundEffects';
import { MouseInput } from './MouseInput';
import { aabb } from './Types';
import {
  drawMushroom,
  drawSegment,
  drawSpider,
  drawFlea,
  drawScorpion,
  drawUFO,
  drawPlayer,
  drawBullet,
  drawMuzzleFlash,
  type VisualProfile
} from './ProceduralSprites';
import { sfx } from './AudioSynth';
import { makeRng } from './RNG';
import { DEFAULT_GAME_MODE, getFallingMushroomChance, getLevelTuning, getTouchdownRules, usesModernScoring, type GameMode } from './GameMode';
import { WEAPONS } from './Constants';

const CELL = GRID.CELL;
const COLS = GRID.COLS;
const ROWS = GRID.ROWS;
const PLAYER_ROWS = GRID.PLAYER_ROWS;
const FIELD_W = COLS * CELL;

type EngineSettings = {
  gameMode: GameMode;
  musicVolume: number;
  sfxVolume: number;
  particleDensity: 'low' | 'medium' | 'high';
  screenShake: boolean;
  showHitboxes: boolean;
  showFPS: boolean;
};

type EngineMode = 'title' | 'playing' | 'pause' | 'gameover';

export class Engine{
  private ctx:CanvasRenderingContext2D;
  private raf=0; private running=false; private last=0; private acc=0;
  private keys = new Set<string>();
  private rand = makeRng(0xC0FFEE);
  mode: EngineMode = 'title';
  onStateChange?: (state: { mode: EngineMode; score: number; highScore: number; level: number }) => void;
  settings: EngineSettings = {
    gameMode: DEFAULT_GAME_MODE,
    musicVolume: 70,
    sfxVolume: 80,
    particleDensity: 'low',
    screenShake: true,
    showHitboxes: DEBUG.SHOW_HITBOXES,
    showFPS: DEBUG.SHOW_FPS
  };
  private levelClearT = 0; // seconds remaining for level-clear flash/freeze
  private popups: {x:number,y:number,text:string,t:number}[] = [];
  private shakeT = 0; // seconds
  private tGlobal = 0; // accumulative time for deterministic shake phase

  score = 0;
  highScore = 0;
  lives = 3;
  level = 1;
  nextExtraLife = EXTRA_LIFE_STEP;
  grid = new Grid(GRID.COLS, GRID.ROWS);
  player = new Player();
  centipedes: Centipede[] = [];
  spiders: Spider[] = [];
  fleas: Flea[] = [];
  scorpions: Scorpion[] = [];
  ufos: UFO[] = [];
  powerUps: PowerUp[] = [];
  fallingMushrooms: {x:number,y:number,w:number,h:number,vy:number,poisoned:boolean,active:boolean,juggleCount:number}[] = [];
  reflectedBullets: {x:number,y:number,vy:number,active:boolean}[] = [];
  coins: {x:number,y:number,vy:number,active:boolean,value:number}[] = [];
  particles = new ParticleSystem();

  // Psychedelic effect state
  private psychedelicTimer = 0;
  private psychedelicMultiplier = 1;

  // Coin frenzy state
  private coinFrenzyActive = false;
  private coinsCollected = 0;
  
  // Scoring mechanics
  private combo = 1;
  private comboTimer = 0;
  private chainHits = 0;
  private chainTimer = 0;
  private levelStartTime = 0;
  private initialMushrooms = 0;
  private mushroomsLost = 0;
  private hitsTaken = 0;
  private fleaMultiplier = 1;
  private sidebarBonus = 0;

  private spiderTimer = randRange(
    ENEMIES.LARRY_THE_SCOBSTER.SPAWN_MIN_TIME,
    ENEMIES.LARRY_THE_SCOBSTER.SPAWN_MAX_TIME,
    this.rand
  );
  private fleaCd: number = ENEMIES.GROUCHO_THE_FLICK.SPAWN_COOLDOWN;
  private scorpionTimer = randRange(
    ENEMIES.GORDON_THE_GECKO.SPAWN_MIN_TIME,
    ENEMIES.GORDON_THE_GECKO.SPAWN_MAX_TIME,
    this.rand
  );
  private ufoTimer = randRange(
    ENEMIES.UFO.SPAWN_MIN_TIME,
    ENEMIES.UFO.SPAWN_MAX_TIME,
    this.rand
  );
  private touchdownFriendCd = 0;
  private backgroundEffects: BackgroundEffects;
  private mouseInput: MouseInput;
  private sidebarTexture: HTMLCanvasElement | null = null;
  private sidebarTextureWidth = 0;
  private sidebarLogo: HTMLImageElement | null = null;
  private sidebarLogoReady = false;

  constructor(private canvas:HTMLCanvasElement, private width:number, private height:number){
    const c = canvas.getContext('2d'); if (!c) throw new Error('No 2D context'); this.ctx = c;
    this.backgroundEffects = new BackgroundEffects(this.ctx, FIELD_W, this.height);
    this.mouseInput = new MouseInput(canvas);
    this.particles.setDensity(this.settings.particleDensity);
    this.sidebarLogo = new Image();
    this.sidebarLogo.onload = () => { this.sidebarLogoReady = true; };
    this.sidebarLogo.src = '/apeironx-logo.png';
  // load hi-score if present
  try{ const hi = localStorage.getItem('apeiron_hi'); if (hi) this.highScore = Math.max(0, parseInt(hi,10)||0); }catch{}
  this.resetGame(true);
    this.bindInput();
  }

  // Fill the grid with mushrooms at the given density, avoiding the player zone
  private seedMushrooms(density: number) {
    // Clear all mushrooms first
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        this.grid.set(c, r, null);
      }
    }
    // Place mushrooms randomly, skipping player zone
    const total = Math.floor(GRID.COLS * (GRID.ROWS - GRID.PLAYER_ROWS) * density);
    let placed = 0;
    while (placed < total) {
      const c = Math.floor(this.rand() * GRID.COLS);
      const r = Math.floor(this.rand() * (GRID.ROWS - GRID.PLAYER_ROWS));
      if (!this.grid.get(c, r)) {
        const mush = new Mushroom(c, r);

        // Reflective mushrooms appear in high waves (reflects bullets back)
        if (this.level >= REFLECTED_BULLET.START_WAVE) {
          const reflectChance = Math.min(
            REFLECTED_BULLET.MAX_CHANCE,
            (this.level - REFLECTED_BULLET.START_WAVE) * REFLECTED_BULLET.CHANCE_PER_WAVE
          );
          if (this.rand() < reflectChance) {
            mush.reflective = true;
          }
        }

        // Psychedelic mushrooms (rainbow - triggers point multiplier)
        if (this.level >= PSYCHEDELIC.START_WAVE && !mush.reflective) {
          if (this.rand() < PSYCHEDELIC.SPAWN_CHANCE) {
            mush.psychedelic = true;
          }
        }

        this.grid.set(c, r, mush);
        placed++;
      }
    }
  }

  start(){ this.running = true; this.last = performance.now(); this.loop(this.last); }
  destroy(){
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.unbindInput();
    this.mouseInput.unbindEvents();
  }

  private loop(now: number) {
    if (!this.running) return;
    
    const dt = (now - this.last) / 1000;
    this.last = now;
    this.acc += dt;
    
    // Fixed timestep (60Hz)
    const FIXED_DT = 1/60;
    while (this.acc >= FIXED_DT) {
      if (this.mode === 'playing') {
        this.tick(FIXED_DT);
      }
      this.acc -= FIXED_DT;
    }
    
    this.draw();
    this.raf = requestAnimationFrame(t => this.loop(t));
  }

  private tick(dt:number){
  this.tGlobal += dt;
    // level clear freeze: delay next level start with a brief white flash
    if (this.levelClearT > 0){
      this.levelClearT -= dt;
      if (this.levelClearT <= 0){
        this.awardLevelBonuses();
        this.level++;
        this.startLevel();
      }
      return;
    }
    
    // Update scoring mechanics
    this.updateScoring(dt);
    if (usesModernScoring(this.settings.gameMode) && this.touchdownFriendCd > 0) {
      this.touchdownFriendCd = Math.max(0, this.touchdownFriendCd - dt);
    }
    
    // Update particle system
    this.particles.update(dt);
    
    // update entities (mouse-first, keyboard fallback)
    const mouseState = this.mouseInput.getInput(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2
    );
    const keyboardShooting = this.keys.has('Space');
    const keyboardMoving = this.keys.has('ArrowLeft') || this.keys.has('ArrowRight') || this.keys.has('ArrowUp') || this.keys.has('ArrowDown');
    const useMouse = mouseState.shooting || mouseState.vx !== 0 || mouseState.vy !== 0;
    if (useMouse) {
      this.player.update(dt, {
        vx: mouseState.vx,
        vy: mouseState.vy,
        shooting: mouseState.shooting || keyboardShooting
      });
    } else {
      this.player.update(dt, this.keys);
    }
    
    // Player movement trail
    if (this.player.alive && (keyboardMoving || useMouse)) {
      this.particles.playerTrail(this.player.x + this.player.w/2, this.player.y + this.player.h);
    }

    // Classic rule: player cannot move through mushrooms without Diamond yummy.
    if (!this.player.canPassThroughMushrooms()) {
      const pr = this.player.rect();
      const minC = Math.max(0, Math.floor(pr.x / CELL));
      const maxC = Math.min(COLS - 1, Math.floor((pr.x + pr.w) / CELL));
      const minR = Math.max(0, Math.floor(pr.y / CELL));
      const maxR = Math.min(ROWS - 1, Math.floor((pr.y + pr.h) / CELL));
      let blocked = false;
      for (let r = minR; r <= maxR && !blocked; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (this.grid.get(c, r)) {
            blocked = true;
            break;
          }
        }
      }
      if (blocked) {
        this.player.revertPosition();
      }
    }

    // Falling mushrooms (with gravity for juggling)
    for (const fm of this.fallingMushrooms) {
      if (!fm.active) continue;
      fm.vy += 400 * dt; // Gravity pulls it down
      fm.y += fm.vy * dt;
      if (fm.y > this.height + fm.h || fm.y < -fm.h * 2) {
        fm.active = false;
      }
      if (this.player.alive && aabb(this.player.rect(), fm)) {
        fm.active = false;
        this.loseLife();
        return;
      }
    }

    // REFLECTED BULLETS - deadly projectiles bounced back from reflective mushrooms
    for (const rb of this.reflectedBullets) {
      if (!rb.active) continue;
      rb.y += rb.vy * dt;
      if (rb.y > this.height + 10) {
        rb.active = false;
      }
      // Check collision with player
      if (this.player.alive) {
        const pr = this.player.rect();
        const rbRect = { x: rb.x - 2, y: rb.y - 4, w: 4, h: 8 };
        if (aabb(pr, rbRect)) {
          rb.active = false;
          this.loseLife();
          return;
        }
      }
    }
    this.reflectedBullets = this.reflectedBullets.filter(rb => rb.active);

    // PSYCHEDELIC effect timer
    if (this.psychedelicTimer > 0) {
      this.psychedelicTimer -= dt;
      if (this.psychedelicTimer <= 0) {
        this.psychedelicMultiplier = 1;
        this.addPopup(this.width / 2, this.height / 2, 'PSYCHEDELIC OVER');
      }
    }

    // COINS update
    for (const coin of this.coins) {
      if (!coin.active) continue;
      coin.y += coin.vy * dt;
      if (coin.y > this.height + 10) {
        coin.active = false;
      }
      // Check collection by player
      if (this.player.alive) {
        const pr = this.player.rect();
        const coinRect = { x: coin.x - 6, y: coin.y - 6, w: 12, h: 12 };
        if (aabb(pr, coinRect)) {
          coin.active = false;
          this.addScore(SCORE.COIN);
          this.coinsCollected++;
          this.particles.emitImpact(coin.x, coin.y, '#ffd700', 4);
          sfx.coin();
        }
      }
    }
    this.coins = this.coins.filter(c => c.active);
    
    let touchdowns = 0;
    for (const c of this.centipedes) {
      c.tick(dt, this.grid);
      if (c.consumeTouchdown()) touchdowns++;
    }
    if (touchdowns > 0) this.handleTouchdowns(touchdowns);
    
    // Update spiders with player position for chase behavior
    for (const s of this.spiders) {
      s.update(dt, this.player.y);
    }
    
    // Update fleas and handle mushroom dropping
    for (const f of this.fleas) {
      f.update(dt);
      // Check if flea should drop a mushroom
      if (f.shouldDropMushroom()) {
        const c = Math.floor(f.x / CELL);
        const r = Math.floor(f.y / CELL);
        if (inBounds(c,r) && !this.grid.get(c,r) && r < ROWS-PLAYER_ROWS) {
          this.grid.set(c,r,new Mushroom(c,r));
        }
      }
    }
    
    // Update scorpions
    for (const sc of this.scorpions) {
      sc.update(dt);
    }
    
    // Update Yummies (power-ups)
    for (const p of this.powerUps) {
      const wasActive = p.active;
      p.update(dt);

      // RASPBERRY SOUND: Power-up fell off screen without being collected!
      if (wasActive && !p.active) {
        sfx.raspberry();
        this.addPopup(FIELD_W / 2, this.height - 40, 'MISSED YUMMY!');
      }

      // Keep classic visuals subdued; enhanced mode gets stronger sparkle.
      const sparkleChance = this.isClassicMode() ? 0.015 : 0.06;
      if (p.active && this.rand() < sparkleChance) {
        this.particles.powerUpSparkle(
          p.x + p.w/2 + (this.rand() - 0.5) * p.w,
          p.y + p.h/2 + (this.rand() - 0.5) * p.h,
          p.type
        );
      }

      // Check for collection
      if (p.active && aabb(this.player.rect(), p.rect())) {
        p.active = false;
        let popupText = `YUMMY! ${p.type.toUpperCase()}`;
        if (p.type === 'extra_man') {
          if (this.lives < 8) {
            this.lives++;
          }
          popupText = 'YUMMY! EXTRA MAN';
          sfx.extra();
        } else if (p.type === 'house_cleaning') {
          const startRow = GRID.ROWS - GRID.PLAYER_ROWS;
          for (let r = startRow; r < GRID.ROWS; r++) {
            for (let c = 0; c < GRID.COLS; c++) {
              this.grid.set(c, r, null);
            }
          }
          popupText = 'YUMMY! HOUSE CLEANING';
          sfx.extra();
        } else {
          this.player.addPowerUp(p.type);
        }
        
        // Show collection popup
        this.addPopup(
          p.x + p.w/2,
          p.y + p.h/2,
          popupText
        );
        
        const sparkleBursts = this.isClassicMode() ? 4 : 12;
        for (let i = 0; i < sparkleBursts; i++) {
          const angle = (i / sparkleBursts) * Math.PI * 2;
          const radius = GRID.CELL * 0.75;
          const sparkleX = p.x + p.w/2 + Math.cos(angle) * radius;
          const sparkleY = p.y + p.h/2 + Math.sin(angle) * radius;
          this.particles.powerUpSparkle(sparkleX, sparkleY, p.type);
        }
        
        if (!this.isClassicMode()) {
          this.backgroundEffects.addEnergyField(p.x + p.w/2, p.y + p.h/2, 1.1);
        }
        
        // Play collection sound
        sfx.powerup();
      }
    }
    
    // Enemy spawn logic
    const modeTuning = getLevelTuning(this.level, this.settings.gameMode);
    
    // Larry the Scobster (Spider)
    this.spiderTimer -= dt;
    if (this.spiderTimer <= 0) {
      this.spiders.push(new Spider(this.level, this.rand));
      this.spiderTimer = randRange(
        modeTuning.spiderMin,
        modeTuning.spiderMax,
        this.rand
      );
    }
    
    // Groucho the Flick (Flea)
    this.fleaCd -= dt;
    if (this.fleaCd <= 0) {
      const playerRowStart = GRID.ROWS - GRID.PLAYER_ROWS;
      const mushes = this.grid.countInRows(playerRowStart, GRID.ROWS - 1);
      if (mushes < ENEMIES.GROUCHO_THE_FLICK.PLAYER_ROWS_MIN_MUSHES) {
        this.fleas.push(new Flea(this.rand));
      }
      this.fleaCd = this.settings.gameMode === 'classic'
        ? ENEMIES.GROUCHO_THE_FLICK.SPAWN_COOLDOWN
        : Math.max(1.1, ENEMIES.GROUCHO_THE_FLICK.SPAWN_COOLDOWN * 0.82);
    }
    
    // Gordon the Gecko (Scorpion)
    this.scorpionTimer -= dt;
    if (this.scorpionTimer <= 0) {
      this.scorpions.push(new Scorpion(this.rand));
      this.scorpionTimer = randRange(
        modeTuning.scorpionMin,
        modeTuning.scorpionMax,
        this.rand
      );
    }
    
    // UFO
    this.ufoTimer -= dt;
    if (this.ufoTimer <= 0) {
      if (this.rand() < ENEMIES.UFO.SPAWN_CHANCE) {
        this.ufos.push(new UFO(this.rand));
      }
      this.ufoTimer = randRange(
        ENEMIES.UFO.SPAWN_MIN_TIME,
        ENEMIES.UFO.SPAWN_MAX_TIME,
        this.rand
      );
    }
    
    // Update UFOs and handle mushroom destruction
    for (const ufo of this.ufos) {
      const cellsToCheck = ufo.update(dt);
      
      // Handle mushroom destruction
      if (cellsToCheck) {
        for (const { c, r } of cellsToCheck) {
          const mush = this.grid.get(c, r);
          if (mush) {
            // Remove mushroom
            this.grid.set(c, r, null);
            
            // Add destruction effects
            const x = c * GRID.CELL + GRID.CELL/2;
            const y = r * GRID.CELL + GRID.CELL/2;
            
            this.particles.emitExplosion(x, y, mush.poisoned ? '#ff6e49' : '#7ea5d3', this.isClassicMode() ? 4 : 12);
            if (!this.isClassicMode()) {
              this.backgroundEffects.addEnergyField(x, y, 0.9);
            }
          }
        }
      }
      
      // Remove UFO if it's off screen
      if (ufo.x < -ufo.w || ufo.x > GRID.COLS * GRID.CELL) {
        ufo.dead = true;
      }
    }

    // Gordon the Gecko poisons mushrooms it touches
    for (const sc of this.scorpions) {
      const c = Math.floor(sc.x / GRID.CELL);
      const r = Math.floor(sc.y / GRID.CELL);
      const m = this.grid.get(c, r);
      if (m) {
        m.poisoned = true;
        if (!this.isClassicMode()) {
          this.particles.emitPoison(
            c * GRID.CELL + GRID.CELL/2,
            r * GRID.CELL + GRID.CELL/2
          );
        }
      }
    }

    // bullets collisions
    this.handleBullets();

    // Player collisions with enemies
    if (this.player.alive) {
      const pr = this.player.rect();
      
      // Pentipede segments
      for (const cent of this.centipedes) {
        for (const s of cent.segments) {
          if (aabb(pr, {
            x: s.c * GRID.CELL + 2,
            y: s.r * GRID.CELL + 2,
            w: GRID.CELL - 4,
            h: GRID.CELL - 4
          })) {
            this.loseLife();
            return;
          }
        }
      }
      
      // Larry the Scobster (Spider)
      for (const sp of this.spiders) {
        if (!sp.dead && aabb(pr, sp.rect())) {
          this.loseLife();
          return;
        }
      }
      
      // Groucho the Flick (Flea)
      for (const f of this.fleas) {
        if (!f.dead && aabb(pr, f.rect())) {
          this.loseLife();
          return;
        }
      }
      
      // Gordon the Gecko (Scorpion)
      for (const sc of this.scorpions) {
        if (!sc.dead && aabb(pr, sc.rect())) {
          this.loseLife();
          return;
        }
      }
      
      // UFO
      for (const ufo of this.ufos) {
        if (!ufo.dead && aabb(pr, ufo.rect())) {
          this.loseLife();
          return;
        }
      }
    }

  // cleanup
  this.spiders = this.spiders.filter(s => !s.dead);
  this.fleas = this.fleas.filter(s => !s.dead);
  this.scorpions = this.scorpions.filter(s => !s.dead);
  this.ufos = this.ufos.filter(u => !u.dead);
  if (this.fleas.length <= 1) this.fleaMultiplier = 1;
  this.powerUps = this.powerUps.filter(p => p.active);
  this.fallingMushrooms = this.fallingMushrooms.filter(fm => fm.active);
  // update popups and shake timer
  if (this.shakeT>0) this.shakeT -= dt;
  for (const p of this.popups){ p.t -= dt; p.y -= 22*dt; }
  this.popups = this.popups.filter(p=>p.t>0);

  // level complete
  const remaining = this.centipedes.reduce((n,c)=>n+c.segments.length,0);
  if (remaining===0 && this.levelClearT<=0){ this.levelClearT = 0.6; sfx.level(); }
  }

  private handleBullets(){
    for (const b of this.player.bullets){
      if (!b.active) continue;
      
      if (b.isMegaBlast) {
        // Mega blast affects everything in its radius
        this.handleMegaBlast(b);
        continue;
      }
      
      // Regular bullet collisions
      if (this.handleRegularBullet(b)) {
        continue; // Bullet was consumed
      }
    }
  }
  
  private handleMegaBlast(b: Bullet) {
    const blastRect = b.rect();
    let hitCount = 0;
    
    if (!this.isClassicMode()) {
      this.backgroundEffects.addEnergyField(b.x, b.y, 1.2);
    }
    
    // Mushrooms in blast radius
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const mush = this.grid.get(c, r);
        if (!mush) continue;
        
        const mushRect = { x: c*CELL+2, y: r*CELL+2, w: CELL-4, h: CELL-4 };
        if (aabb(blastRect, mushRect)) {
          mush.hp = Math.max(0, mush.hp - b.damage);
          if (mush.hp <= 0) {
            this.grid.set(c, r, null);
            this.addScore(SCORE.MUSHROOM_CLEAR_BONUS);
            this.particles.emitExplosion(
              c*CELL + CELL/2,
              r*CELL + CELL/2,
              mush.poisoned ? '#ff6d4c' : '#7ea5d3',
              this.isClassicMode() ? 5 : 10
            );
          }
          hitCount++;
        }
      }
    }
    
    // Centipedes in blast radius
    for (let ci = this.centipedes.length - 1; ci >= 0; ci--) {
      const cent = this.centipedes[ci];
      for (let si = cent.segments.length - 1; si >= 0; si--) {
        const s = cent.segments[si];
        const rect = { x: s.c*CELL+2, y: s.r*CELL+2, w: CELL-4, h: CELL-4 };
        if (aabb(blastRect, rect)) {
          if (!this.grid.get(s.c, s.r)) {
            this.grid.set(s.c, s.r, new Mushroom(s.c, s.r));
          }
          const killedHead = si === 0;
          const pts = killedHead ? SCORE.HEAD : SCORE.SEGMENT;
          this.addScore(pts);
          this.addPopup(s.c*CELL + CELL/2, s.r*CELL + CELL/2, String(pts));
          
          // Explosion effect
          const color = killedHead ? '#ff744a' : '#6e8dbf';
          this.particles.emitExplosion(s.c*CELL + CELL/2, s.r*CELL + CELL/2, color, this.isClassicMode() ? 5 : 11);
          
          // Split centipede
          const left = cent.segments.slice(0, si);
          const right = cent.segments.slice(si + 1);
          this.centipedes.splice(ci, 1);
          if (left.length) {
            left[0].head = true;
            this.centipedes.push(Object.assign(new Centipede(0,this.level), { segments:left }));
          }
          if (right.length) {
            right[0].head = true;
            this.centipedes.push(Object.assign(new Centipede(0,this.level), { segments:right }));
          }
          hitCount++;
        }
      }
    }
    
    // Other enemies in blast radius
    for (const sp of this.spiders) {
      if (!sp.dead && aabb(blastRect, sp.rect())) {
        sp.dead = true;
        const pts = this.spiderScore(sp);
        this.addScore(pts);
        this.addPopup(sp.x+sp.w/2, sp.y+sp.h/2, String(pts));
        this.particles.enemyExplosion(sp.x + sp.w/2, sp.y + sp.h/2);
        this.maybeDropPowerUp(sp.x + sp.w/2, sp.y + sp.h/2);
        hitCount++;
      }
    }
    
    for (const f of this.fleas) {
      if (!f.dead && aabb(blastRect, f.rect())) {
        f.dead = true;
        this.addScore(SCORE.FLEA);
        this.addPopup(f.x+f.w/2, f.y+f.h/2, String(SCORE.FLEA));
        this.particles.enemyExplosion(f.x + f.w/2, f.y + f.h/2);
        this.maybeDropPowerUp(f.x + f.w/2, f.y + f.h/2);
        hitCount++;
      }
    }
    
    for (const sc of this.scorpions) {
      if (!sc.dead && aabb(blastRect, sc.rect())) {
        sc.dead = true;
        this.addScore(SCORE.SCORPION);
        this.addPopup(sc.x+sc.w/2, sc.y+sc.h/2, String(SCORE.SCORPION));
        this.particles.enemyExplosion(sc.x + sc.w/2, sc.y + sc.h/2);
        this.maybeDropPowerUp(sc.x + sc.w/2, sc.y + sc.h/2);
        hitCount++;
      }
    }
    
    if (hitCount > 0) {
      sfx.extra(); // Mega blast hit sound
      b.active = false;
      const burstCount = this.isClassicMode() ? 6 : 12;
      for (let i = 0; i < burstCount; i++) {
        const angle = (i / burstCount) * Math.PI * 2;
        const radius = WEAPONS.MEGA_BLAST.BLAST_RADIUS * 0.8;
        const x = b.x + Math.cos(angle) * radius;
        const y = b.y + Math.sin(angle) * radius;
        this.particles.emitExplosion(x, y, '#ff8a42', this.isClassicMode() ? 4 : 12);
      }
    }
  }
  
  private handleRegularBullet(b: Bullet): boolean {
      // mushrooms
      const mc = Math.floor(b.x / CELL), mr = Math.floor(b.y / CELL);
      const mush = this.grid.get(mc, mr);
      if (mush){
        const rect = { x:mush.x+2, y:mush.y+2, w:CELL-4, h:CELL-4 };
        if (aabb(b.rect(), rect)){
        b.active = false;

        // REFLECTIVE MUSHROOMS: Bounce bullet back at player!
        if (mush.reflective) {
          this.reflectedBullets.push({
            x: b.x,
            y: b.y,
            vy: Math.abs(b.vy) * REFLECTED_BULLET.SPEED_MULTIPLIER,
            active: true
          });
          sfx.reflect();
          this.particles.emitImpact(b.x, b.y, '#c0c0c0', 4);
          this.particles.emitImpact(b.x, b.y, '#ffffff', 2);
          return true;
        }

        // PSYCHEDELIC MUSHROOMS: Trigger rainbow effect and point multiplier!
        if (mush.psychedelic) {
          this.psychedelicTimer = TIMERS.PSYCHEDELIC_DURATION;
          this.psychedelicMultiplier = PSYCHEDELIC.POINT_MULTIPLIER;
          this.addScore(SCORE.PSYCHEDELIC_MUSHROOM);
          this.addPopup(mush.x + CELL/2, mush.y + CELL/2, `PSYCHEDELIC! ${PSYCHEDELIC.POINT_MULTIPLIER}x POINTS!`);
          sfx.extra();
          // Rainbow explosion
          const colors = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0077ff', '#7700ff', '#ff00ff'];
          for (let i = 0; i < 14; i++) {
            this.particles.emitExplosion(
              mush.x + CELL/2,
              mush.y + CELL/2,
              colors[i % colors.length],
              3
            );
          }
          this.grid.set(mc, mr, null);
          return true;
        }

        mush.hp -= b.damage;
        this.addScore(mush.poisoned ? SCORE.POISON_MUSHROOM_HIT : SCORE.MUSHROOM_HIT);
        sfx.hit();
        if (this.isClassicMode()) {
          this.particles.emitImpact(b.x, b.y, '#cfd7e4', 2);
        } else {
          this.particles.bulletImpact(b.x, b.y);
        }
        if (mush.hp <= 0){
          this.grid.set(mc, mr, null);
          this.addScore(SCORE.MUSHROOM_CLEAR_BONUS);
          const fallChance = getFallingMushroomChance(this.level, this.settings.gameMode);
          if (this.rand() < fallChance) {
            this.fallingMushrooms.push({
              x: mush.x + 1,
              y: mush.y + 1,
              w: CELL - 2,
              h: CELL - 2,
              vy: 150 + this.level * 8,
              poisoned: mush.poisoned,
              active: true,
              juggleCount: 0
            });
          }
          // Crystal shatter effect
          const burst = this.isClassicMode() ? 3 : 8;
          for (let i = 0; i < burst; i++) {
            this.particles.emitImpact(
              mush.x + CELL/2,
              mush.y + CELL/2,
              mush.poisoned ? '#ff6d4c' : '#7ea5d3'
            );
          }
        }
        return true;
      }
    }

    // Falling mushroom JUGGLING system - hit it multiple times for bonus points!
    for (const fm of this.fallingMushrooms) {
      if (!fm.active) continue;
      if (aabb(b.rect(), fm)) {
        b.active = false;
        fm.juggleCount++;

        // Calculate score with juggle multiplier
        const baseScore = fm.poisoned ? SCORE.FALLING_POISON_MUSHROOM : SCORE.FALLING_MUSHROOM;
        const juggleMultiplier = Math.pow(SCORE.JUGGLE_MULTIPLIER, fm.juggleCount - 1);
        const pts = Math.floor(baseScore * juggleMultiplier);
        this.addScore(pts);

        // Pop the mushroom back up (juggle effect)
        fm.vy = -Math.abs(fm.vy) * 0.7; // Bounce up with some dampening

        // Show juggle combo
        const juggleText = fm.juggleCount > 1 ? `JUGGLE x${fm.juggleCount}! ${pts}` : String(pts);
        this.addPopup(fm.x + fm.w/2, fm.y + fm.h/2, juggleText);

        // Visual feedback - more particles with higher juggle count
        const burstSize = Math.min(this.isClassicMode() ? 8 : 16, 4 + fm.juggleCount * 2);
        this.particles.emitExplosion(
          fm.x + fm.w/2,
          fm.y + fm.h/2,
          fm.poisoned ? '#ff6d4c' : '#7ea5d3',
          burstSize
        );

        // Play juggle sound with increasing pitch
        sfx.juggle(fm.juggleCount);

        // Destroy mushroom after many juggles or if it goes too high
        if (fm.juggleCount >= 5) {
          fm.active = false;
          this.addPopup(fm.x + fm.w/2, fm.y + fm.h/2, 'PERFECT JUGGLE!');
          sfx.extra();
        }

        return true;
      }
    }
    
      // centipede segments
      hitLoop: for (let ci=0; ci<this.centipedes.length; ci++){
        const cent = this.centipedes[ci];
        for (let si=0; si<cent.segments.length; si++){
          const s = cent.segments[si];
          const rect = { x: s.c*CELL+2, y: s.r*CELL+2, w:CELL-4, h:CELL-4 };
          if (aabb(b.rect(), rect)){
            b.active = false;
            if (!this.grid.get(s.c, s.r)) this.grid.set(s.c, s.r, new Mushroom(s.c, s.r));
          const killedHead = si===0;
          const pts = killedHead ? SCORE.HEAD : SCORE.SEGMENT;
          this.addScore(pts);
          this.addPopup(s.c*CELL + CELL/2, s.r*CELL + CELL/2, String(pts));
          sfx.hit();
          
          // Explosion effect
          const color = killedHead ? '#ff744a' : '#6e8dbf';
          this.particles.emitExplosion(s.c*CELL + CELL/2, s.r*CELL + CELL/2, color, this.isClassicMode() ? 5 : 12);
          
          const left = cent.segments.slice(0, si);
          const right = cent.segments.slice(si+1);
            this.centipedes.splice(ci,1);
            if (left.length){ left[0].head = true; this.centipedes.push(Object.assign(new Centipede(0,this.level), { segments:left })); }
            if (right.length){ right[0].head = true; this.centipedes.push(Object.assign(new Centipede(0,this.level), { segments:right })); }
          return true;
        }
      }
    }
    
      // spider
    for (const sp of this.spiders){
      if (!sp.dead && aabb(b.rect(), sp.rect())){
        sp.dead = true;
        b.active = false;
        const pts = this.spiderScore(sp);
        this.addScore(pts);
        this.addPopup(sp.x+sp.w/2, sp.y+sp.h/2, String(pts));
        sfx.spider();
        this.particles.emitExplosion(sp.x + sp.w/2, sp.y + sp.h/2, '#88bf63', this.isClassicMode() ? 6 : 12);
        this.maybeDropPowerUp(sp.x + sp.w/2, sp.y + sp.h/2);
        return true;
      }
    }
    
      // flea
    for (const f of this.fleas){
      if (!f.dead && aabb(b.rect(), f.rect())){
        f.dead = true;
        b.active = false;
        const concurrentFleas = this.fleas.filter(ff => !ff.dead).length;
        const pts = SCORE.FLEA * this.fleaMultiplier;
        if (concurrentFleas > 1) {
          this.fleaMultiplier = Math.min(32, this.fleaMultiplier * 2);
        } else {
          this.fleaMultiplier = 1;
        }
        this.addScore(pts);
        this.addPopup(f.x+f.w/2, f.y+f.h/2, String(pts));
        sfx.flea();
        this.particles.emitExplosion(f.x + f.w/2, f.y + f.h/2, '#8aa4cc', this.isClassicMode() ? 4 : 10);
        this.maybeDropPowerUp(f.x + f.w/2, f.y + f.h/2);
        return true;
      }
    }
    
      // scorpion
    for (const sc of this.scorpions){
      if (!sc.dead && aabb(b.rect(), sc.rect())){
        sc.dead = true;
        b.active = false;
        this.addScore(SCORE.SCORPION);
        this.addPopup(sc.x+sc.w/2, sc.y+sc.h/2, String(SCORE.SCORPION));
        sfx.scorpion();
        this.particles.emitExplosion(sc.x + sc.w/2, sc.y + sc.h/2, '#cc705a', this.isClassicMode() ? 6 : 12);
        this.maybeDropPowerUp(sc.x + sc.w/2, sc.y + sc.h/2);
        return true;
      }
    }

    // spaceship / UFO
    for (const ufo of this.ufos) {
      if (!ufo.dead && aabb(b.rect(), ufo.rect())) {
        ufo.dead = true;
        b.active = false;
        const steps = (SCORE.SPACESHIP_MAX - SCORE.SPACESHIP_MIN) / 100;
        const pts = SCORE.SPACESHIP_MIN + Math.floor(this.rand() * (steps + 1)) * 100;
        this.addScore(pts);
        this.addPopup(ufo.x + ufo.w/2, ufo.y + ufo.h/2, String(pts));
        sfx.ufo();
        this.particles.emitExplosion(ufo.x + ufo.w/2, ufo.y + ufo.h/2, '#aac7ab', this.isClassicMode() ? 8 : 14);
        return true;
      }
    }
    
    return false;
  }

  private spiderScore(sp: Spider) {
    // Proximity tiers by distance to player
    const py = this.player.y;
    const dy = Math.abs(sp.y - py);
    if (dy < GRID.CELL * 2) return ENEMIES.LARRY_THE_SCOBSTER.SCORE_NEAR;
    if (dy < GRID.CELL * 4) return ENEMIES.LARRY_THE_SCOBSTER.SCORE_MED;
    return ENEMIES.LARRY_THE_SCOBSTER.SCORE_FAR;
  }

  private handleTouchdowns(count: number) {
    const modeTuning = getLevelTuning(this.level, this.settings.gameMode);
    const touchdownRules = getTouchdownRules(this.settings.gameMode);
    if (usesModernScoring(this.settings.gameMode)) {
      this.addPopup(this.width / 2, (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL - 8, 'TOUCHDOWN');
    }
    for (let i = 0; i < count; i++) {
      const totalSegments = this.centipedes.reduce((n, c) => n + c.segments.length, 0);
      if (totalSegments < touchdownRules.segmentCap) {
        const len = Math.max(4, Math.min(modeTuning.centipedeLength, 14));
        this.centipedes.push(new Centipede(len, this.level));
      }

      if (!usesModernScoring(this.settings.gameMode)) continue;
      if (this.touchdownFriendCd > 0) continue;
      const roll = this.rand();
      if (roll < 0.45 && this.spiders.length < 2) {
        this.spiders.push(new Spider(this.level, this.rand));
      } else if (roll < 0.8 && this.fleas.length < 3) {
        this.fleas.push(new Flea(this.rand));
      } else if (this.scorpions.length < 2) {
        this.scorpions.push(new Scorpion(this.rand));
      }
      this.touchdownFriendCd = touchdownRules.friendCooldown;
    }
  }

  private loseLife(){
    // Don't lose life if shield is active or phase shifting
    if (this.player.isShieldActive() || this.player.phaseShiftActive) {
      this.shakeT = 0.15;
      return;
    }
    
    this.lives--;
    this.player.alive = false;
  this.shakeT = 0.35;
    this.hitsTaken++;
    
    const savedPowerUps = this.player.hasPowerUp('lock') ? this.player.getPowerUpSnapshot() : [];
    
    if (this.lives <= 0) {
      this.mode = 'gameover';
      sfx.gameover();
      this.notifyStateChange();
    } else {
      this.player = new Player();
      if (savedPowerUps.length) {
        this.player.restorePowerUps(savedPowerUps);
      }
    }
  }
  
  private hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  }

  private isClassicMode(): boolean {
    return this.settings.gameMode === 'classic';
  }

  private addPopup(x:number, y:number, text:string){
    this.popups.push({x, y, text, t:0.7});
    if (this.popups.length>12) this.popups.shift();
  }

  private addScore(basePoints: number, type: 'normal' | 'chain' | 'bonus' = 'normal') {
    let finalPoints = basePoints;

    // PSYCHEDELIC MULTIPLIER - rainbow mushroom effect!
    if (this.psychedelicMultiplier > 1) {
      finalPoints *= this.psychedelicMultiplier;
    }

    if (usesModernScoring(this.settings.gameMode)) {
      finalPoints *= 1 + (this.level - 1) * SCORE.LEVEL_MULTIPLIER;

      if (type === 'normal') {
        finalPoints *= this.combo;
        this.comboTimer = SCORING.COMBO_WINDOW;
        this.combo = Math.min(this.combo + 0.5, SCORING.MAX_COMBO);
        this.chainHits++;
        this.chainTimer = SCORING.CHAIN_TIMEOUT;

        for (const [multiplier, required] of Object.entries(SCORING.CHAIN_REQUIREMENTS)) {
          if (this.chainHits === required) {
            const bonus = basePoints * (+multiplier - 1);
            this.addScore(bonus, 'chain');
            this.addPopup(
              this.player.x + this.player.w / 2,
              this.player.y,
              `CHAIN x${multiplier}!`
            );
            break;
          }
        }
      }
    }

    finalPoints = Math.round(finalPoints);
    if (type !== 'normal') {
      this.sidebarBonus = Math.min(99999, this.sidebarBonus + finalPoints);
    }
    
    // Update score and check for extra life
    this.score += finalPoints;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('apeiron_hi', String(this.highScore));
      } catch {}
    }
    while (this.score >= this.nextExtraLife) {
      if (this.lives < 8) {
        this.lives++;
        sfx.extra();
      }
      this.nextExtraLife += EXTRA_LIFE_STEP;
    }
    
    return finalPoints;
  }
  
  private updateScoring(dt: number) {
    if (!usesModernScoring(this.settings.gameMode)) return;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
    } else if (this.combo > 1) {
      this.combo = Math.max(1, this.combo - SCORING.COMBO_DECAY_RATE * dt);
    }

    if (this.chainTimer > 0) {
      this.chainTimer -= dt;
      if (this.chainTimer <= 0) {
        this.chainHits = 0;
      }
    }
  }
  
  private awardLevelBonuses() {
    if (!usesModernScoring(this.settings.gameMode)) return;

    let bonusText = '';
    let totalBonus = SCORE.LEVEL_COMPLETION;

    let remainingMushrooms = 0;
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        if (this.grid.get(c, r)) remainingMushrooms++;
      }
    }
    this.mushroomsLost = Math.max(0, this.initialMushrooms - remainingMushrooms);

    if (this.mushroomsLost === 0) {
      totalBonus += SCORE.PERFECT_CLEAR;
      bonusText += 'PERFECT FIELD ';
    }

    const levelTime = (performance.now() - this.levelStartTime) / 1000;
    if (levelTime < this.getParTime()) {
      totalBonus += SCORE.SPEED_CLEAR;
      bonusText += 'SPEED CLEAR ';
    }

    if (this.hitsTaken === 0) {
      totalBonus += SCORE.NO_HIT;
      bonusText += 'FLAWLESS ';
    }

    totalBonus += remainingMushrooms * SCORE.MUSHROOM_FIELD_BONUS;

    if (totalBonus > 0) {
      this.addScore(totalBonus, 'bonus');
      if (bonusText) {
        this.addPopup(this.width / 2, this.height / 2, bonusText.trim());
      }
    }
  }
  
  private getParTime(): number {
    if (this.level <= 5) return SCORING.PAR_TIMES.EASY;
    if (this.level <= 10) return SCORING.PAR_TIMES.MEDIUM;
    if (this.level <= 15) return SCORING.PAR_TIMES.HARD;
    return SCORING.PAR_TIMES.EXPERT;
  }

  private startLevel(){
    const tuning = getLevelTuning(this.level, this.settings.gameMode);
    this.sidebarBonus = 0;

    // Update background theme based on wave (changes every 4 waves like original)
    this.backgroundEffects.setWave(this.level);

    // Reset level-specific scoring
    this.combo = 1;
    this.comboTimer = 0;
    this.chainHits = 0;
    this.chainTimer = 0;
    this.levelStartTime = performance.now();
    this.hitsTaken = 0;
    
    // Setup mushroom field
    this.seedMushrooms(tuning.mushroomDensity);
    
    // Count initial mushrooms for perfect field bonus
    this.initialMushrooms = 0;
    this.mushroomsLost = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid.get(c, r)) this.initialMushrooms++;
      }
    }
    
    // Setup enemies
    const len = tuning.centipedeLength;
    this.centipedes = [ new Centipede(len, this.level) ];
    this.spiders.length = 0;
    this.fleas.length = 0;
    this.scorpions.length = 0;
    this.ufos.length = 0;
    this.fallingMushrooms.length = 0;
    this.reflectedBullets.length = 0;
    this.coins.length = 0;
    this.touchdownFriendCd = 0;
    
    this.spiderTimer = randRange(tuning.spiderMin, tuning.spiderMax, this.rand);
    this.scorpionTimer = randRange(tuning.scorpionMin, tuning.scorpionMax, this.rand);
    this.fleaCd = this.settings.gameMode === 'classic'
      ? TIMERS.SPAWN_FLEA_COOLDOWN
      : Math.max(1.1, TIMERS.SPAWN_FLEA_COOLDOWN * 0.82);
    this.ufoTimer = randRange(
      ENEMIES.UFO.SPAWN_MIN_TIME,
      ENEMIES.UFO.SPAWN_MAX_TIME,
      this.rand
    );
  }

  private spawnPowerUp(x: number, y: number) {
    // Don't spawn if we already have too many active Yummies
    if (this.powerUps.filter(p => p.active).length >= YUMMIES.SPAWN.MAX_ACTIVE) {
      return;
    }
    
    // Random Yummy type
    const type = YUMMIES.TYPES[Math.floor(this.rand() * YUMMIES.TYPES.length)];
    
    // Create new Yummy
    this.powerUps.push(new PowerUp(
      x - GRID.CELL/2,
      y - GRID.CELL/2,
      type,
      this.rand
    ));
    
    if (!this.isClassicMode()) {
      this.backgroundEffects.addEnergyField(x, y, 1.0);
    }
    
    const sparkleCount = this.isClassicMode() ? 3 : 8;
    for (let i = 0; i < sparkleCount; i++) {
      this.particles.powerUpSparkle(
        x + (this.rand() - 0.5) * GRID.CELL,
        y + (this.rand() - 0.5) * GRID.CELL,
        type
      );
    }
  }

  private maybeDropPowerUp(x: number, y: number) {
    if (this.rand() < POWERUPS.SPAWN_CHANCE) {
      this.spawnPowerUp(x, y);
    }
    // Also try to drop coins
    this.maybeDropCoin(x, y);
  }

  // COIN SYSTEM - coins drop from enemies and can trigger frenzy
  private maybeDropCoin(x: number, y: number) {
    if (this.coins.length >= COINS.MAX_ACTIVE) return;

    if (this.rand() < COINS.DROP_CHANCE) {
      this.spawnCoin(x, y);

      // Check for coin frenzy trigger
      if (this.rand() < COINS.FRENZY_CHANCE && !this.coinFrenzyActive) {
        this.triggerCoinFrenzy();
      }
    }
  }

  private spawnCoin(x: number, y: number) {
    if (this.coins.length >= COINS.MAX_ACTIVE) return;
    this.coins.push({
      x: x + (this.rand() - 0.5) * GRID.CELL,
      y,
      vy: COINS.FALL_SPEED,
      active: true,
      value: SCORE.COIN
    });
  }

  // COIN FRENZY - fill the bottom third of screen with coins!
  private triggerCoinFrenzy() {
    this.coinFrenzyActive = true;
    this.coinsCollected = 0;
    this.addPopup(this.width / 2, this.height / 3, 'COIN FRENZY!');
    sfx.coinFrenzy();

    // Spawn many coins across the top
    const fieldW = COLS * CELL;
    for (let i = 0; i < COINS.FRENZY_COUNT && this.coins.length < COINS.MAX_ACTIVE; i++) {
      this.coins.push({
        x: this.rand() * fieldW,
        y: -this.rand() * 100 - 10,
        vy: COINS.FALL_SPEED * (0.8 + this.rand() * 0.4),
        active: true,
        value: SCORE.COIN
      });
    }

    // End frenzy after duration
    setTimeout(() => {
      this.coinFrenzyActive = false;
      if (this.coinsCollected > 10) {
        this.addScore(SCORE.COIN_FRENZY_BONUS, 'bonus');
        this.addPopup(this.width / 2, this.height / 2, `FRENZY BONUS! ${this.coinsCollected} COINS!`);
      }
    }, TIMERS.COIN_FRENZY_DURATION * 1000);
  }

  private resetGame(keepHi=false){
    // re-seed RNG to keep determinism on each new game
    this.rand = makeRng(0xC0FFEE);
    if (!keepHi){ try{ const hi = localStorage.getItem('apeiron_hi'); if (hi) this.highScore = Math.max(this.highScore, parseInt(hi,10)||0); }catch{} }
    this.score = 0; this.lives = 3; this.level = 1; this.nextExtraLife = EXTRA_LIFE_STEP;
    this.sidebarBonus = 0;
    this.grid = new Grid(COLS, ROWS);
    this.player = new Player();
    this.centipedes = [];
    this.spiders = [];
    this.fleas = [];
    this.scorpions = [];
    this.ufos = [];
    this.powerUps = [];
    this.fallingMushrooms = [];
    this.reflectedBullets = [];
    this.coins = [];
    this.psychedelicTimer = 0;
    this.psychedelicMultiplier = 1;
    this.coinFrenzyActive = false;
    this.coinsCollected = 0;
    this.spiderTimer=randRange(TIMERS.SPAWN_SPIDER_MIN,TIMERS.SPAWN_SPIDER_MAX, this.rand);
    this.fleaCd=TIMERS.SPAWN_FLEA_COOLDOWN;
    this.scorpionTimer=randRange(TIMERS.SPAWN_SCORPION_MIN,TIMERS.SPAWN_SCORPION_MAX, this.rand);
    this.startLevel();
  }

  private draw() {
    const g = this.ctx;
    const fieldW = FIELD_W;
    const panelX = fieldW;
    const panelW = Math.max(0, this.width - fieldW);
    const profile = this.getVisualProfile();
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';

    // Backdrop for the whole canvas (panel + field).
    g.fillStyle = '#101010';
    g.fillRect(0, 0, this.width, this.height);

    // Update and draw background effects
    this.backgroundEffects.setProfile(profile);
    this.backgroundEffects.update(1/60);
    this.backgroundEffects.draw();

    // Deterministic screen shake (sin/cos phase) without RNG
    let sx = 0, sy = 0;
    if (this.shakeT > 0 && this.settings.screenShake) {
      const m = 3 * (this.shakeT/0.35);
      sx = Math.sin(this.tGlobal * 80) * m;
      sy = Math.cos(this.tGlobal * 60) * m;
    }

    g.save();
    g.translate(sx, sy);

    // Gameplay area is clipped to the left field. Sidebar is right panel.
    g.save();
    g.beginPath();
    g.rect(0, 0, fieldW, this.height);
    g.clip();

    // mushrooms
    for (let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const m = this.grid.get(c,r); if(!m) continue; const x=c*CELL, y=r*CELL;
      drawMushroom(g, x, y, m.poisoned, m.hp, profile, m.reflective, m.psychedelic, this.tGlobal);
    }
    for (const fm of this.fallingMushrooms) {
      if (!fm.active) continue;
      drawMushroom(g, fm.x, fm.y, fm.poisoned, 1, profile, false, false, this.tGlobal);
    }

    // centipede
    for (const cent of this.centipedes){
      for (let i=0;i<cent.segments.length;i++){
        const s = cent.segments[i]; const x = s.c*CELL, y=s.r*CELL;
        drawSegment(g, x, y, s.head, profile);
      }
    }

    // enemies
    for (const sp of this.spiders){ drawSpider(g, sp.x, sp.y, sp.w, sp.h); }
    for (const f of this.fleas){ drawFlea(g, f.x, f.y, f.w, f.h); }
    for (const sc of this.scorpions){ drawScorpion(g, sc.x, sc.y, sc.w, sc.h); }
    for (const ufo of this.ufos){ if (!ufo.dead) drawUFO(g, ufo.x, ufo.y, ufo.w, ufo.h); }
    
    // power-ups
    g.font = '10px ui-monospace, Menlo, monospace';
    g.textAlign = 'center';
    for (const p of this.powerUps) {
      if (p.active) p.draw(g);
    }
    g.textAlign = 'start';

    // player & bullets
    const p = this.player;
    
    // Draw shield effect if active
    if (p.isShieldActive()) {
      g.fillStyle = `rgba(${this.hexToRgb(POWERUP_COLORS.shield)},0.22)`;
      g.fillRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
    }
    
    drawPlayer(g, p.x, p.y, p.w, p.h, profile);
    if (p.flashT>0){ drawMuzzleFlash(g, p.x, p.y, p.w, Math.min(1, p.flashT/0.05), profile); }
    for (const b of p.bullets){ if(b.active) drawBullet(g, b.x, b.y, profile); }

    // REFLECTED BULLETS - dangerous red bullets coming at player
    for (const rb of this.reflectedBullets) {
      if (!rb.active) continue;
      g.fillStyle = '#ff3030';
      g.beginPath();
      g.roundRect(rb.x - 2, rb.y - 5, 4, 10, 2);
      g.fill();
      g.fillStyle = '#ffaaaa';
      g.beginPath();
      g.ellipse(rb.x, rb.y - 3, 1.5, 1, 0, 0, Math.PI * 2);
      g.fill();
    }

    // COINS - golden collectibles
    for (const coin of this.coins) {
      if (!coin.active) continue;
      const pulse = 0.8 + Math.sin(this.tGlobal * 8 + coin.x) * 0.2;
      // Gold coin with shine
      g.fillStyle = '#ffd700';
      g.beginPath();
      g.arc(coin.x, coin.y, 5 * pulse, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#b8860b';
      g.lineWidth = 1;
      g.stroke();
      // Shine highlight
      g.fillStyle = '#fff8dc';
      g.beginPath();
      g.arc(coin.x - 1.5, coin.y - 1.5, 1.5, 0, Math.PI * 2);
      g.fill();
    }

    this.particles.draw(g);

    // Player zone line
    if (VISUAL.PLAYER_ZONE_LINE) {
      const yLine = (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL + 0.5;
      g.strokeStyle = 'rgba(255,255,255,0.15)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, yLine);
      g.lineTo(fieldW, yLine);
      g.stroke();
    }

    // Floating score popups
    if (this.popups.length) {
      g.font = '12px ui-monospace, Menlo, monospace';
      g.textAlign = 'center';
      
      for (const p of this.popups) {
        const a = Math.max(0, Math.min(1, p.t/0.7));
        g.fillStyle = this.isClassicMode()
          ? `rgba(118,208,232,${a})`
          : `rgba(235,255,255,${a})`;
        g.fillText(p.text, p.x, p.y);
      }
      
      g.textAlign = 'start';
    }
    
    // Level clear flash overlay
    if (this.levelClearT > 0) {
      const a = Math.min(0.9, Math.max(0, this.levelClearT / 0.6));

      // White flash
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.fillRect(0, 0, this.width, this.height);
    }

    // PSYCHEDELIC EFFECT - rainbow screen flash!
    if (this.psychedelicTimer > 0) {
      const phase = this.tGlobal * 4;
      const intensity = Math.min(0.35, this.psychedelicTimer / TIMERS.PSYCHEDELIC_DURATION * 0.5);

      // Rainbow gradient overlay
      const rainbowGrad = g.createLinearGradient(0, 0, fieldW, this.height);
      rainbowGrad.addColorStop(0, `rgba(255,0,0,${intensity})`);
      rainbowGrad.addColorStop(0.17, `rgba(255,127,0,${intensity})`);
      rainbowGrad.addColorStop(0.33, `rgba(255,255,0,${intensity})`);
      rainbowGrad.addColorStop(0.5, `rgba(0,255,0,${intensity})`);
      rainbowGrad.addColorStop(0.67, `rgba(0,127,255,${intensity})`);
      rainbowGrad.addColorStop(0.83, `rgba(127,0,255,${intensity})`);
      rainbowGrad.addColorStop(1, `rgba(255,0,127,${intensity})`);

      g.save();
      g.globalCompositeOperation = 'overlay';
      g.fillStyle = rainbowGrad;
      g.fillRect(0, 0, fieldW, this.height);

      // Pulsing radial effect
      const pulseRad = g.createRadialGradient(
        fieldW/2 + Math.sin(phase) * 50,
        this.height/2 + Math.cos(phase) * 50,
        0,
        fieldW/2, this.height/2, fieldW
      );
      pulseRad.addColorStop(0, `rgba(255,255,255,${intensity * 0.5})`);
      pulseRad.addColorStop(0.5, `rgba(255,200,255,${intensity * 0.3})`);
      pulseRad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = pulseRad;
      g.fillRect(0, 0, fieldW, this.height);
      g.restore();

      // Show multiplier text
      g.font = 'bold 16px ui-monospace, Menlo, monospace';
      g.textAlign = 'center';
      g.fillStyle = `rgba(255,255,255,${0.6 + Math.sin(this.tGlobal * 10) * 0.4})`;
      g.fillText(`${PSYCHEDELIC.POINT_MULTIPLIER}x POINTS!`, fieldW / 2, 30);
      g.textAlign = 'start';
    }
    
    // Debug overlays
    if (this.settings.showFPS || this.settings.showHitboxes) {
      g.save();
      g.globalAlpha = 0.8;
      
      // FPS counter
      if (this.settings.showFPS) {
        const fps = Math.round(1000 / (performance.now() - this.last));
        g.fillStyle = '#fff';
        g.font = '12px ui-monospace, Menlo, monospace';
        g.fillText(`FPS: ${fps}`, fieldW - 60, 15);
      }
      
      // Hitboxes
      if (this.settings.showHitboxes) {
        g.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        g.lineWidth = 1;
        
        // Player hitbox
        const pr = this.player.rect();
        g.strokeRect(pr.x, pr.y, pr.w, pr.h);
        
        // Bullet hitboxes
        for (const b of this.player.bullets) {
          if (!b.active) continue;
          const br = b.rect();
          g.strokeRect(br.x, br.y, br.w, br.h);
        }
        
        // Enemy hitboxes
        for (const sp of this.spiders) {
          if (sp.dead) continue;
          const r = sp.rect();
          g.strokeRect(r.x, r.y, r.w, r.h);
        }
        
        for (const f of this.fleas) {
          if (f.dead) continue;
          const r = f.rect();
          g.strokeRect(r.x, r.y, r.w, r.h);
        }
        
        for (const sc of this.scorpions) {
          if (sc.dead) continue;
          const r = sc.rect();
          g.strokeRect(r.x, r.y, r.w, r.h);
        }
        
        for (const ufo of this.ufos) {
          if (ufo.dead) continue;
          const r = ufo.rect();
          g.strokeRect(r.x, r.y, r.w, r.h);
          
          // Show destruction radius
          g.strokeStyle = 'rgba(0, 255, 255, 0.2)';
          g.beginPath();
          g.arc(
            r.x + r.w/2,
            r.y + r.h/2,
            ENEMIES.UFO.MUSHROOM_DESTROY_RADIUS,
            0,
            Math.PI * 2
          );
          g.stroke();
        }
        
        // Centipede segment hitboxes
        for (const cent of this.centipedes) {
          for (const s of cent.segments) {
            g.strokeRect(
              s.c * GRID.CELL + 2,
              s.r * GRID.CELL + 2,
              GRID.CELL - 4,
              GRID.CELL - 4
            );
          }
        }
      }
      g.restore();
    }

    g.restore();
    this.drawSidebar(g, panelX, panelW);
    g.restore();
  }

  private drawSidebar(g: CanvasRenderingContext2D, x: number, w: number) {
    if (w <= 0) return;
    const profile = this.getVisualProfile();
    const classicProfile = profile === 'classic';

    if (!this.sidebarTexture || this.sidebarTextureWidth !== w) {
      this.sidebarTexture = this.buildSidebarTexture(w, this.height);
      this.sidebarTextureWidth = w;
    }
    g.drawImage(this.sidebarTexture, x, 0);

    g.fillStyle = '#1f2629';
    g.fillRect(x, 0, 2, this.height);
    g.fillStyle = '#6d6e6f';
    g.fillRect(x + 2, 0, 1, this.height);

    g.save();
    g.translate(x, 0);

    if (this.sidebarLogoReady && this.sidebarLogo && !classicProfile) {
      const logoPad = 6;
      const logoTop = 3;
      const logoBoxW = w - logoPad * 2;
      const logoBoxH = 78;
      const iw = this.sidebarLogo.naturalWidth || 1;
      const ih = this.sidebarLogo.naturalHeight || 1;
      const scale = Math.min(logoBoxW / iw, logoBoxH / ih);
      const drawW = Math.floor(iw * scale);
      const drawH = Math.floor(ih * scale);
      const drawX = Math.floor((w - drawW) * 0.5);
      const drawY = logoTop + Math.floor((logoBoxH - drawH) * 0.5);
      g.drawImage(this.sidebarLogo, drawX, drawY, drawW, drawH);
    } else {
      g.strokeStyle = classicProfile ? '#be8730' : '#ad7e32';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(w * 0.5, 36, w * 0.42, 25, -0.12, 0, Math.PI * 2);
      g.stroke();
      g.font = 'italic 700 44px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'top';
      const logoGrad = g.createLinearGradient(w * 0.18, 10, w * 0.82, 58);
      if (classicProfile) {
        logoGrad.addColorStop(0, '#70441a');
        logoGrad.addColorStop(0.38, '#e6bf55');
        logoGrad.addColorStop(1, '#c77818');
      } else {
        logoGrad.addColorStop(0, '#6f4a1c');
        logoGrad.addColorStop(0.38, '#f3c15f');
        logoGrad.addColorStop(1, '#d8841e');
      }
      g.fillStyle = logoGrad;
      g.strokeStyle = 'rgba(21, 12, 6, 0.95)';
      g.lineWidth = 2;
      g.strokeText('Apeiron', w * 0.47, 8);
      g.fillText('Apeiron', w * 0.47, 8);
      if (!classicProfile) {
        g.font = 'italic 700 58px Georgia, serif';
        g.fillStyle = '#d77a1c';
        g.strokeText('X', w * 0.83, 4);
        g.fillText('X', w * 0.83, 4);
      }
    }
    g.textAlign = 'center';
    g.textBaseline = 'top';

    const drawDataBox = (top: number, label: string, value: string, valueFont = 46) => {
      g.fillStyle = classicProfile ? '#db2e26' : '#d3a43c';
      g.font = '700 18px "Times New Roman", Georgia, serif';
      g.fillText(label, w * 0.5, top);

      const boxX = 14;
      const boxY = top + 28;
      const boxW = w - 28;
      const boxH = 36;
      g.fillStyle = '#08090d';
      g.fillRect(boxX, boxY, boxW, boxH);
      g.strokeStyle = '#6a7073';
      g.lineWidth = 2;
      g.strokeRect(boxX, boxY, boxW, boxH);
      g.fillStyle = 'rgba(255,255,255,0.07)';
      g.fillRect(boxX + 1, boxY + 1, boxW - 2, 6);

      const fitFont = Math.max(28, Math.min(valueFont, Math.floor((boxW - 12) / Math.max(1, value.length) * 1.68)));
      g.font = `700 ${fitFont}px "Times New Roman", Georgia, serif`;
      g.strokeStyle = '#051923';
      g.lineWidth = 2.2;
      g.strokeText(value, w * 0.5, top + 20);
      g.fillStyle = '#5fd2ef';
      g.fillText(value, w * 0.5, top + 20);
      g.fillStyle = 'rgba(186, 243, 252, 0.33)';
      g.fillText(value, w * 0.5 + 1, top + 19);
    };

    const scoreText = String(this.score);
    const bonusText = String(this.sidebarBonus);
    drawDataBox(94, 'Score', scoreText, 46);
    drawDataBox(212, 'Bonus', bonusText, 46);

    g.fillStyle = classicProfile ? '#db2e26' : '#d3a43c';
    g.font = '700 18px "Times New Roman", Georgia, serif';
    g.fillText('Lives', w * 0.5, 326);
    g.fillStyle = '#08090d';
    g.fillRect(14, 352, w - 28, 32);
    g.strokeStyle = '#6a7073';
    g.lineWidth = 2;
    g.strokeRect(14, 350, w - 28, 34);

    let lx = 52;
    for (let i = 0; i < Math.max(0, this.lives); i++) {
      g.fillStyle = '#111d2d';
      g.beginPath();
      g.moveTo(lx, 368);
      g.lineTo(lx + 5.5, 360);
      g.lineTo(lx + 11, 368);
      g.lineTo(lx + 5.5, 372.5);
      g.closePath();
      g.fill();
      g.fillStyle = classicProfile ? '#f4df74' : '#82e1f5';
      g.beginPath();
      g.ellipse(lx + 5.5, 365.4, 1.8, 1.45, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#5d7088';
      g.strokeRect(lx + 1.2, 362.9, 8.6, 7.6);
      lx += 18;
      if (lx > w - 24) break;
    }

    // Active power-up strip.
    g.fillStyle = '#090a0e';
    g.fillRect(44, 420, w - 88, 22);
    g.strokeStyle = '#5a5e63';
    g.strokeRect(44, 418, w - 88, 24);
    const hasLock = this.player.hasPowerUp('lock');
    const hasDiamond = this.player.hasPowerUp('diamond');
    const hasGun = this.player.hasPowerUp('machine_gun');
    const iconY = 431;
    g.font = '700 18px Georgia, serif';
    g.fillStyle = hasGun ? '#c54630' : 'rgba(197, 70, 48, 0.35)';
    g.fillText('2', 62, iconY - 10);
    if (hasDiamond) {
      g.fillStyle = '#45d6ff';
    } else {
      g.fillStyle = 'rgba(69, 214, 255, 0.35)';
    }
    g.beginPath();
    g.moveTo(72, iconY);
    g.lineTo(78, iconY - 6);
    g.lineTo(84, iconY);
    g.lineTo(78, iconY + 6);
    g.closePath();
    g.fill();
    if (hasGun) {
      g.fillStyle = '#e55d2f';
    } else {
      g.fillStyle = 'rgba(229, 93, 47, 0.35)';
    }
    g.fillRect(98, iconY - 7, 3, 14);
    g.fillRect(104, iconY - 7, 3, 14);
    g.fillRect(110, iconY - 7, 3, 14);
    if (hasLock) {
      g.strokeStyle = '#c8d5e0';
      g.lineWidth = 1.5;
    } else {
      g.strokeStyle = 'rgba(200, 213, 224, 0.4)';
      g.lineWidth = 1.2;
    }
    g.strokeRect(130, iconY - 3, 10, 8);
    g.beginPath();
    g.arc(135, iconY - 3, 4, Math.PI, Math.PI * 2);
    g.stroke();

    g.fillStyle = classicProfile ? '#db2e26' : '#d3a43c';
    g.font = '700 18px "Times New Roman", Georgia, serif';
    g.fillText('Wave', w * 0.5, 454);
    g.fillStyle = '#08090d';
    g.fillRect(40, 480, w - 80, 54);
    g.strokeStyle = '#6a7073';
    g.strokeRect(40, 478, w - 80, 54);
    g.font = '700 54px "Times New Roman", Georgia, serif';
    const waveText = String(this.level);
    g.strokeStyle = '#061c28';
    g.lineWidth = 2.4;
    g.strokeText(waveText, w * 0.5, 472);
    g.fillStyle = '#67d6ea';
    g.fillText(waveText, w * 0.5, 472);
    g.fillStyle = 'rgba(161, 238, 248, 0.35)';
    g.fillText(waveText, w * 0.5 + 1, 471);

    if (this.player.autofireTime > 0) {
      const progress = this.player.autofireTime / YUMMIES.DURATIONS.MACHINE_GUN;
      g.fillStyle = '#090a0e';
      g.fillRect(44, 446, w - 88, 7);
      g.fillStyle = '#b8842e';
      g.fillRect(45, 447, (w - 90) * progress, 5);
      g.fillStyle = '#f1ce7a';
      g.fillRect(45, 447, (w - 90) * progress * 0.35, 5);
    }

    g.restore();
  }

  private buildSidebarTexture(w: number, h: number): HTMLCanvasElement {
    const tile = document.createElement('canvas');
    tile.width = w;
    tile.height = h;
    const t = tile.getContext('2d');
    if (!t) return tile;

    const grad = t.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0a0a0b');
    grad.addColorStop(0.3, '#1a1b1d');
    grad.addColorStop(0.74, '#131416');
    grad.addColorStop(1, '#09090a');
    t.fillStyle = grad;
    t.fillRect(0, 0, w, h);

    const img = t.createImageData(w, h);
    const data = img.data;
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const i = (yy * w + xx) * 4;
        const grain = Math.sin((xx * 127.1 + yy * 311.7) * 0.11) * 0.5 + 0.5;
        const poresA = Math.sin((xx * 71.3 + yy * 91.9) * 0.27) * 0.5 + 0.5;
        const poresB = Math.sin((xx * 43.7 - yy * 57.3) * 0.2) * 0.5 + 0.5;
        const brushed = Math.sin((xx * 0.08 + yy * 0.36) + poresA * 4.2) * 0.5 + 0.5;
        const c = Math.max(0, Math.min(255, 9 + grain * 14 + poresA * 9 + poresB * 8 + brushed * 7));
        data[i] = c;
        data[i + 1] = c;
        data[i + 2] = c + 1;
        data[i + 3] = 255;
      }
    }
    t.putImageData(img, 0, 0);

    t.fillStyle = 'rgba(255,255,255,0.055)';
    for (let i = 0; i < 1900; i++) {
      const rx = Math.sin(i * 12.47) * 0.5 + 0.5;
      const ry = Math.sin(i * 7.11 + 3.2) * 0.5 + 0.5;
      const rw = 1 + ((Math.sin(i * 3.9) * 0.5 + 0.5) > 0.75 ? 1 : 0);
      t.fillRect(Math.floor(rx * w), Math.floor(ry * h), rw, 1);
    }

    const ridge = t.createLinearGradient(0, 0, w, 0);
    ridge.addColorStop(0, 'rgba(255,255,255,0.06)');
    ridge.addColorStop(0.45, 'rgba(255,255,255,0.01)');
    ridge.addColorStop(1, 'rgba(0,0,0,0.06)');
    t.fillStyle = ridge;
    t.fillRect(0, 0, w, h);

    const shine = t.createLinearGradient(0, 0, w, h * 0.75);
    shine.addColorStop(0, 'rgba(255,255,255,0.026)');
    shine.addColorStop(0.35, 'rgba(255,255,255,0.014)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    t.fillStyle = shine;
    t.fillRect(0, 0, w, h);

    t.fillStyle = 'rgba(0, 0, 0, 0.18)';
    t.fillRect(0, 0, w, 2);
    t.fillRect(0, h - 2, w, 2);

    return tile;
  }

  private getVisualProfile(): VisualProfile {
    return this.settings.gameMode === 'classic' ? 'classic' : 'x';
  }

  pause() {
    if (this.mode === 'playing') {
      this.mode = 'pause';
      this.notifyStateChange();
    }
  }

  startNewGame() {
    this.mode = 'playing';
    this.resetGame();
    sfx.start();
    this.notifyStateChange();
  }
  
  resume() {
    if (this.mode === 'pause') {
      this.mode = 'playing';
      this.notifyStateChange();
    }
  }
  
  updateSettings(newSettings: EngineSettings) {
    this.settings = { ...newSettings };
    
    // Apply volume settings
    sfx.setVolume(this.settings.sfxVolume / 100);
    
    // Update particle density
    this.particles.setDensity(this.settings.particleDensity);

    if (!usesModernScoring(this.settings.gameMode)) {
      this.combo = 1;
      this.comboTimer = 0;
      this.chainHits = 0;
      this.chainTimer = 0;
    }
  }
  
  private notifyStateChange() {
    this.onStateChange?.({
      mode: this.mode,
      score: this.score,
      highScore: this.highScore,
      level: this.level
    });
  }

  private bindInput(){
    const onDown = (e:KeyboardEvent)=>{
      this.keys.add(e.code);
  if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(e.code)) e.preventDefault();
      
      if (e.code === 'KeyP') {
        if (this.mode === 'playing') this.pause();
        else if (this.mode === 'pause') this.resume();
      }
      else if (e.code === 'CapsLock') {
        if (this.mode === 'playing') this.pause();
        else if (this.mode === 'pause') this.resume();
      }
      else if (e.code === 'Escape' && (this.mode === 'playing' || this.mode === 'pause')) {
        this.mode = 'title';
        this.notifyStateChange();
      }
      else if (this.mode === 'title' && e.code === 'Space') {
        this.startNewGame();
      }
      else if (this.mode === 'gameover' && e.code === 'Space') {
        this.startNewGame();
      }
    };
    
    const onUp = (e:KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    (this as any)._onDown = onDown;
    (this as any)._onUp = onUp;
  }
  
  private unbindInput(){
    window.removeEventListener('keydown', (this as any)._onDown);
    window.removeEventListener('keyup', (this as any)._onUp);
  }
}

function randRange(a:number,b:number, rng: ()=>number = Math.random){ return a + rng()*(b-a); }
function inBounds(c:number,r:number){ return c>=0 && c<COLS && r>=0 && r<ROWS }
