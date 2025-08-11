import { CELL, COLS, ROWS, PLAYER_ROWS, TIMERS, SCORE, DENSITY, EXTRA_LIFE_STEP, VISUAL, POWERUPS, POWERUP_COLORS } from './Constants';
import { Grid, Mushroom } from './Grid';
import { Player, PowerUpType } from './Player';
import { Centipede } from './Centipede';
import { Spider, Flea, Scorpion } from './Enemies';
import { PowerUp } from './PowerUp';
import { ParticleSystem } from './ParticleSystem';
import { aabb } from './Types';
import { drawMushroom, drawSegment, drawSpider, drawFlea, drawScorpion, drawPlayer, drawBullet, drawMuzzleFlash } from './ProceduralSprites';
import { sfx } from './AudioSynth';
import { makeRng } from './RNG';

export class Engine{
  private ctx:CanvasRenderingContext2D;
  private raf=0; private running=false; private last=0; private acc=0;
  private keys = new Set<string>();
  private rand = makeRng(0xC0FFEE);
  mode: 'title' | 'playing' | 'pause' | 'gameover' = 'title';
  onStateChange?: (state: { mode: typeof this.mode; score: number; highScore: number; level: number }) => void;
  settings = {
    musicVolume: 70,
    sfxVolume: 80,
    particleDensity: 'medium' as const,
    screenShake: true,
    showHitboxes: false,
    showFPS: false
  };
  private levelClearT = 0; // seconds remaining for level-clear flash/freeze
  private popups: {x:number,y:number,text:string,t:number}[] = [];
  private shakeT = 0; // seconds
  private tGlobal = 0; // accumulative time for deterministic shake phase

  score=0; highScore=0; lives=3; level=1; nextExtraLife=EXTRA_LIFE_STEP;
  grid = new Grid(COLS, ROWS);
  player = new Player();
  centipedes: Centipede[] = [];
  spiders: Spider[] = [];
  fleas: Flea[] = [];
  scorpions: Scorpion[] = [];
  powerUps: PowerUp[] = [];
  coins: {x:number,y:number,w:number,h:number,active:boolean}[] = [];
  particles = new ParticleSystem();
  
  // Scoring mechanics
  private combo = 1;
  private comboTimer = 0;
  private chainHits = 0;
  private chainTimer = 0;
  private levelStartTime = 0;
  private initialMushrooms = 0;
  private mushroomsLost = 0;
  private hitsTaken = 0;

  private spiderTimer=randRange(TIMERS.SPAWN_SPIDER_MIN,TIMERS.SPAWN_SPIDER_MAX, this.rand);
  private fleaCd=TIMERS.SPAWN_FLEA_COOLDOWN;
  private scorpionTimer=randRange(TIMERS.SPAWN_SCORPION_MIN,TIMERS.SPAWN_SCORPION_MAX, this.rand);
  private coinTimer=randRange(TIMERS.COIN_SPAWN_MIN,TIMERS.COIN_SPAWN_MAX, this.rand);

  constructor(private canvas:HTMLCanvasElement, private width:number, private height:number){
    const c = canvas.getContext('2d'); if (!c) throw new Error('No 2D context'); this.ctx = c;
  // load hi-score if present
  try{ const hi = localStorage.getItem('apeiron_hi'); if (hi) this.highScore = Math.max(0, parseInt(hi,10)||0); }catch{}
  this.resetGame(true);
    this.bindInput();
  }

  // Fill the grid with mushrooms at the given density, avoiding the player zone (bottom PLAYER_ROWS rows)
  private seedMushrooms(density: number) {
    // Clear all mushrooms first
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.grid.set(c, r, null);
      }
    }
    // Place mushrooms randomly, skipping player zone
    const total = Math.floor(COLS * (ROWS - PLAYER_ROWS) * density);
    let placed = 0;
    while (placed < total) {
      const c = Math.floor(this.rand() * COLS);
      const r = Math.floor(this.rand() * (ROWS - PLAYER_ROWS));
      if (!this.grid.get(c, r)) {
        this.grid.set(c, r, new Mushroom(c, r));
        placed++;
      }
    }
  }

  start(){ this.running = true; this.last = performance.now(); this.loop(this.last); }
  destroy(){ this.running=false; cancelAnimationFrame(this.raf); this.unbindInput(); }

  private loop(now:number){
    if (!this.running) return;
    const dt = (now - this.last) / 1000; this.last = now; this.acc += dt;
  while (this.acc >= TIMERS.FIXED_DT){ if (this.mode==='playing') this.tick(TIMERS.FIXED_DT); this.acc -= TIMERS.FIXED_DT; }
    this.draw();
    this.raf = requestAnimationFrame(t=>this.loop(t));
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
    
    // Update particle system
    this.particles.update(dt);
    
    // update entities
    this.player.update(dt, this.keys);
    
    // Player movement trail
    if (this.player.alive && (this.keys.has('ArrowLeft') || this.keys.has('ArrowRight') || 
        this.keys.has('ArrowUp') || this.keys.has('ArrowDown'))) {
      this.particles.playerTrail(this.player.x + this.player.w/2, this.player.y + this.player.h);
    }
    
    for (const c of this.centipedes) c.tick(dt, this.grid);
    
    // Update spiders with player position for chase behavior
    for (const s of this.spiders) {
      s.update(dt, this.player.y);
      // Chance to drop power-up when killed
      if (s.dead && this.rand() < POWERUPS.SPAWN_CHANCE) {
        this.spawnPowerUp(s.x + s.w/2, s.y + s.h/2);
        this.particles.enemyExplosion(s.x + s.w/2, s.y + s.h/2);
      }
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
      // Chance to drop power-up when killed
      if (f.dead && this.rand() < POWERUPS.SPAWN_CHANCE) {
        this.spawnPowerUp(f.x + f.w/2, f.y + f.h/2);
        this.particles.enemyExplosion(f.x + f.w/2, f.y + f.h/2);
      }
    }
    
    // Update scorpions
    for (const sc of this.scorpions) {
      sc.update(dt);
      // Chance to drop power-up when killed
      if (sc.dead && this.rand() < POWERUPS.SPAWN_CHANCE) {
        this.spawnPowerUp(sc.x + sc.w/2, sc.y + sc.h/2);
        this.particles.enemyExplosion(sc.x + sc.w/2, sc.y + sc.h/2);
      }
    }
    
    // Update power-ups
    for (const p of this.powerUps) {
      p.update(dt);
      // Power-up sparkle effect
      if (p.active && this.rand() < 0.1) {
        this.particles.powerUpSparkle(
          p.x + p.w/2 + (Math.random() - 0.5) * p.w,
          p.y + p.h/2 + (Math.random() - 0.5) * p.h,
          p.type
        );
      }
      // Check for collection
      if (p.active && aabb(this.player.rect(), p.rect())) {
        p.active = false;
        this.player.addPowerUp(p.type);
        this.addPopup(p.x + p.w/2, p.y + p.h/2, p.type.toUpperCase());
        // Collection effect
        for (let i = 0; i < 8; i++) {
          this.particles.powerUpSparkle(p.x + p.w/2, p.y + p.h/2, p.type);
        }
      }
    }
    
    // coins fall slowly (for readability) if any
    for (const coin of this.coins){ if (!coin.active) continue; coin.y += 30*dt; if (coin.y>this.height) coin.active=false; }

    // spawn logic
    this.spiderTimer -= dt; if (this.spiderTimer<=0){ this.spiders.push(new Spider(this.level, this.rand)); this.spiderTimer = randRange(TIMERS.SPAWN_SPIDER_MIN,TIMERS.SPAWN_SPIDER_MAX, this.rand); }
    this.fleaCd -= dt; if (this.fleaCd<=0){
      const playerRowStart = ROWS-PLAYER_ROWS;
      const mushes = this.grid.countInRows(playerRowStart, ROWS-1);
      if (mushes < DENSITY.PLAYER_ROWS_MIN_MUSHES) this.fleas.push(new Flea(this.rand));
      this.fleaCd = TIMERS.SPAWN_FLEA_COOLDOWN;
    }
    this.scorpionTimer -= dt; if (this.scorpionTimer<=0){ this.scorpions.push(new Scorpion(this.rand)); this.scorpionTimer = randRange(TIMERS.SPAWN_SCORPION_MIN,TIMERS.SPAWN_SCORPION_MAX, this.rand); }
    // coin spawn
    this.coinTimer -= dt; if (this.coinTimer<=0){
      // drop a coin near top area
      const x = Math.floor(this.rand()*COLS)*CELL + CELL/2 - 6;
      const y = 2;
      this.coins.push({x, y, w:12, h:12, active:true});
      this.coinTimer = randRange(TIMERS.COIN_SPAWN_MIN,TIMERS.COIN_SPAWN_MAX, this.rand);
    }

    // flea plants mushrooms as it falls (random chance every cell)
    for (const f of this.fleas){
      const c = Math.floor(f.x / CELL); const r = Math.floor(f.y / CELL);
      if (inBounds(c,r) && this.rand()<0.08 && !this.grid.get(c,r) && r < ROWS-PLAYER_ROWS){ this.grid.set(c,r,new Mushroom(c,r)); }
    }

    // scorpion poisons mushrooms it touches
    for (const sc of this.scorpions){
      const c = Math.floor(sc.x / CELL); const r = Math.floor(sc.y / CELL);
      const m = this.grid.get(c,r); if (m) m.poisoned = true;
    }

    // bullets collisions
    this.handleBullets();

  // coin collection by player
  const pr = this.player.rect();
  for (const coin of this.coins){ if (!coin.active) continue; if (aabb(pr, coin)){ coin.active=false; this.player.autofireTime = POWERUPS.AUTOFIRE_DURATION; sfx.extra(); } }

    // player collisions (segments, spider, flea, scorpion)
    if (this.player.alive){
      const pr = this.player.rect();
      // segments
      for (const cent of this.centipedes){ for (const s of cent.segments){ if (aabb(pr, {x:s.c*CELL+2,y:s.r*CELL+2,w:CELL-4,h:CELL-4})) { this.loseLife(); return; } } }
      // spider
      for (const sp of this.spiders){ if (!sp.dead && aabb(pr, sp.rect())) { this.loseLife(); return; } }
      // flea
      for (const f of this.fleas){ if (!f.dead && aabb(pr, f.rect())) { this.loseLife(); return; } }
      // scorpion
      for (const sc of this.scorpions){ if (!sc.dead && aabb(pr, sc.rect())) { this.loseLife(); return; } }
    }

  // cleanup
    this.spiders = this.spiders.filter(s=>!s.dead);
    this.fleas = this.fleas.filter(s=>!s.dead);
    this.scorpions = this.scorpions.filter(s=>!s.dead);
  this.coins = this.coins.filter(c=>c.active);
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
    
    // Add energy field effect for mega blast
    this.backgroundEffects.addEnergyField(b.x, b.y, 2);
    
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
            this.particles.emitExplosion(c*CELL + CELL/2, r*CELL + CELL/2, 
              mush.poisoned ? POWERUP_COLORS.shield : '#64b5f6');
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
          const color = killedHead ? POWERUP_COLORS.rapid : POWERUP_COLORS.spread;
          this.particles.emitExplosion(s.c*CELL + CELL/2, s.r*CELL + CELL/2, color);
          
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
        hitCount++;
      }
    }
    
    for (const f of this.fleas) {
      if (!f.dead && aabb(blastRect, f.rect())) {
        f.dead = true;
        this.addScore(SCORE.FLEA);
        this.addPopup(f.x+f.w/2, f.y+f.h/2, String(SCORE.FLEA));
        this.particles.enemyExplosion(f.x + f.w/2, f.y + f.h/2);
        hitCount++;
      }
    }
    
    for (const sc of this.scorpions) {
      if (!sc.dead && aabb(blastRect, sc.rect())) {
        sc.dead = true;
        this.addScore(SCORE.SCORPION);
        this.addPopup(sc.x+sc.w/2, sc.y+sc.h/2, String(SCORE.SCORPION));
        this.particles.enemyExplosion(sc.x + sc.w/2, sc.y + sc.h/2);
        hitCount++;
      }
    }
    
    if (hitCount > 0) {
      sfx.extra(); // Mega blast hit sound
      b.active = false;
      // Create large explosion effect
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const radius = WEAPONS.MEGA_BLAST.BLAST_RADIUS * 0.8;
        const x = b.x + Math.cos(angle) * radius;
        const y = b.y + Math.sin(angle) * radius;
        this.particles.emitExplosion(x, y, POWERUP_COLORS.mega);
      }
    }
  }
  
  private handleRegularBullet(b: Bullet): boolean {
    // Add small energy field effect for bullet impact
    this.backgroundEffects.addEnergyField(b.x, b.y, 0.5);
    
    // mushrooms
    const mc = Math.floor(b.x / CELL), mr = Math.floor(b.y / CELL);
    const mush = this.grid.get(mc, mr);
    if (mush){
      const rect = { x:mush.x+2, y:mush.y+2, w:CELL-4, h:CELL-4 };
      if (aabb(b.rect(), rect)){
        b.active = false;
        mush.hp -= b.damage;
        this.addScore(SCORE.MUSHROOM_HIT);
        sfx.hit();
        // Impact effect
        this.particles.bulletImpact(b.x, b.y);
        if (mush.hp <= 0){
          this.grid.set(mc, mr, null);
          this.addScore(SCORE.MUSHROOM_CLEAR_BONUS);
          // Crystal shatter effect
          for (let i = 0; i < 8; i++) {
            this.particles.emitImpact(
              mush.x + CELL/2,
              mush.y + CELL/2,
              mush.poisoned ? POWERUP_COLORS.shield : '#64b5f6'
            );
          }
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
          const color = killedHead ? POWERUP_COLORS.rapid : POWERUP_COLORS.spread;
          this.particles.emitExplosion(s.c*CELL + CELL/2, s.r*CELL + CELL/2, color);
          
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
        // Spider explosion effect
        this.particles.enemyExplosion(sp.x + sp.w/2, sp.y + sp.h/2);
        return true;
      }
    }
    
    // flea
    for (const f of this.fleas){
      if (!f.dead && aabb(b.rect(), f.rect())){
        f.dead = true;
        b.active = false;
        this.addScore(SCORE.FLEA);
        this.addPopup(f.x+f.w/2, f.y+f.h/2, String(SCORE.FLEA));
        sfx.flea();
        // Flea explosion effect
        this.particles.enemyExplosion(f.x + f.w/2, f.y + f.h/2);
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
        // Scorpion explosion effect
        this.particles.enemyExplosion(sc.x + sc.w/2, sc.y + sc.h/2);
        return true;
      }
    }
    
    return false;
  }

  private spiderScore(sp:Spider){
    // proximity tiers by distance to player
    const py = this.player.y; const dy = Math.abs(sp.y - py);
    if (dy < CELL*2) return SCORE.SPIDER_NEAR;
    if (dy < CELL*4) return SCORE.SPIDER_MED;
    return SCORE.SPIDER_FAR;
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
    
    // Reset combo and chain on death
    this.combo = 1;
    this.comboTimer = 0;
    this.chainHits = 0;
    this.chainTimer = 0;
    
    if (this.lives < 0) {
      this.mode = 'gameover';
      sfx.gameover();
    } else {
      this.player = new Player();
    }
  }
  
  private hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  }

  private addPopup(x:number, y:number, text:string){
    this.popups.push({x, y, text, t:0.7});
    if (this.popups.length>12) this.popups.shift();
  }

  private addScore(basePoints: number, type: 'normal' | 'chain' | 'bonus' = 'normal') {
    let finalPoints = basePoints;
    
    // Apply level multiplier
    const levelBonus = 1 + (this.level - 1) * SCORE.LEVEL_MULTIPLIER;
    finalPoints *= levelBonus;
    
    if (type === 'normal') {
      // Apply combo multiplier
      finalPoints *= this.combo;
      
      // Update combo
      this.comboTimer = SCORING.COMBO_WINDOW;
      this.combo = Math.min(this.combo + 0.5, SCORING.MAX_COMBO);
      
      // Update chain
      this.chainHits++;
      this.chainTimer = SCORE.CHAIN_TIMEOUT;
      
      // Check for chain level up
      for (const [multiplier, required] of Object.entries(SCORING.CHAIN_REQUIREMENTS)) {
        if (this.chainHits === required) {
          const bonus = basePoints * (+multiplier - 1);
          this.addScore(bonus, 'chain');
          this.addPopup(this.player.x + this.player.w/2, this.player.y, `CHAIN x${multiplier}!`);
          break;
        }
      }
    }
    
    // Round the final score
    finalPoints = Math.round(finalPoints);
    
    // Update score and check for extra life
    this.score += finalPoints;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('apeiron_hi', String(this.highScore));
      } catch {}
    }
    if (this.score >= this.nextExtraLife) {
      this.lives++;
      this.nextExtraLife += EXTRA_LIFE_STEP;
      sfx.extra();
    }
    
    return finalPoints;
  }
  
  private updateScoring(dt: number) {
    // Update combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        // Start combo decay
        if (this.combo > 1) {
          this.combo = Math.max(1, this.combo - SCORING.COMBO_DECAY_RATE * dt);
        }
      }
    }
    
    // Update chain timer
    if (this.chainTimer > 0) {
      this.chainTimer -= dt;
      if (this.chainTimer <= 0) {
        this.chainHits = 0;
      }
    }
  }
  
  private awardLevelBonuses() {
    let bonusText = '';
    let totalBonus = SCORE.LEVEL_COMPLETION;
    
    // Perfect mushroom field bonus
    if (this.mushroomsLost === 0) {
      totalBonus += SCORE.PERFECT_CLEAR;
      bonusText += 'PERFECT FIELD! ';
    }
    
    // Speed clear bonus
    const levelTime = (performance.now() - this.levelStartTime) / 1000;
    const parTime = this.getParTime();
    if (levelTime < parTime) {
      totalBonus += SCORE.SPEED_CLEAR;
      bonusText += 'SPEED CLEAR! ';
    }
    
    // No-hit bonus
    if (this.hitsTaken === 0) {
      totalBonus += SCORE.NO_HIT;
      bonusText += 'FLAWLESS! ';
    }
    
    // Remaining mushrooms bonus
    let remainingMushrooms = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid.get(c, r)) remainingMushrooms++;
      }
    }
    totalBonus += remainingMushrooms * SCORE.MUSHROOM_FIELD_BONUS;
    
    // Award bonus
    if (totalBonus > 0) {
      this.addScore(totalBonus, 'bonus');
      if (bonusText) {
        this.addPopup(this.width/2, this.height/2, bonusText);
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
    // Reset level-specific scoring
    this.combo = 1;
    this.comboTimer = 0;
    this.chainHits = 0;
    this.chainTimer = 0;
    this.levelStartTime = performance.now();
    this.hitsTaken = 0;
    
    // Setup mushroom field
    const mushDensity = 0.10 + Math.min(0.12, (this.level-1)*0.02);
    this.seedMushrooms(mushDensity);
    
    // Count initial mushrooms for perfect field bonus
    this.initialMushrooms = 0;
    this.mushroomsLost = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid.get(c, r)) this.initialMushrooms++;
      }
    }
    
    // Setup enemies
    const len = Math.min(16, 10 + Math.floor(this.level*2));
    this.centipedes = [ new Centipede(len, this.level) ];
    this.spiders.length = 0;
    this.fleas.length = 0;
    this.scorpions.length = 0;
    this.coins.length = 0;
    
    // Tighten spawn windows with level
    const l = this.level;
    const spiderMin = Math.max(1.5, TIMERS.SPAWN_SPIDER_MIN - l*0.2);
    const spiderMax = Math.max(3.0, TIMERS.SPAWN_SPIDER_MAX - l*0.3);
    this.spiderTimer = randRange(spiderMin, spiderMax, this.rand);
    const scMin = Math.max(3.0, TIMERS.SPAWN_SCORPION_MIN - l*0.25);
    const scMax = Math.max(6.0, TIMERS.SPAWN_SCORPION_MAX - l*0.4);
    this.scorpionTimer = randRange(scMin, scMax, this.rand);
  }

  private spawnPowerUp(x: number, y: number) {
    // Don't spawn if we already have too many active power-ups
    if (this.powerUps.filter(p => p.active).length >= POWERUPS.MAX_ACTIVE) return;
    
    // Random power-up type
    const type = POWERUPS.TYPES[Math.floor(this.rand() * POWERUPS.TYPES.length)];
    this.powerUps.push(new PowerUp(x - CELL/2, y - CELL/2, type, this.rand));
    
    // Add energy field effect for power-up spawn
    this.backgroundEffects.addEnergyField(x, y, 1.5);
  }

  private resetGame(keepHi=false){
    // re-seed RNG to keep determinism on each new game
    this.rand = makeRng(0xC0FFEE);
    if (!keepHi){ try{ const hi = localStorage.getItem('apeiron_hi'); if (hi) this.highScore = Math.max(this.highScore, parseInt(hi,10)||0); }catch{} }
    this.score = 0; this.lives = 3; this.level = 1; this.nextExtraLife = EXTRA_LIFE_STEP;
    this.grid = new Grid(COLS, ROWS);
    this.player = new Player();
    this.centipedes = [];
    this.spiders = [];
    this.fleas = [];
    this.scorpions = [];
    this.powerUps = [];
    this.coins = [];
    this.spiderTimer=randRange(TIMERS.SPAWN_SPIDER_MIN,TIMERS.SPAWN_SPIDER_MAX, this.rand);
    this.fleaCd=TIMERS.SPAWN_FLEA_COOLDOWN;
    this.scorpionTimer=randRange(TIMERS.SPAWN_SCORPION_MIN,TIMERS.SPAWN_SCORPION_MAX, this.rand);
    this.coinTimer=randRange(TIMERS.COIN_SPAWN_MIN,TIMERS.COIN_SPAWN_MAX, this.rand);
    this.startLevel();
  }

  private backgroundEffects = new BackgroundEffects(this.ctx, this.width, this.height);
  
  private draw(){
    const g = this.ctx;
    g.imageSmoothingEnabled = false;
    
    // Update and draw background effects
    this.backgroundEffects.update(1/60);
    this.backgroundEffects.draw();
    
    // Deterministic screen shake (sin/cos phase) without RNG
    let sx = 0, sy = 0;
    if (this.shakeT > 0 && this.settings.screenShake) {
      const m = 3 * (this.shakeT/0.35);
      sx = Math.sin(this.tGlobal*80) * m;
      sy = Math.cos(this.tGlobal*60) * m;
    }
    g.save();
    g.translate(sx, sy);
    // bezel/frame
    if ((VISUAL as any)?.FRAME){
      g.strokeStyle = '#333'; g.lineWidth = 4; g.strokeRect(2,2,this.width-4,this.height-4);
      g.strokeStyle = '#111'; g.lineWidth = 2; g.strokeRect(6,6,this.width-12,this.height-12);
    }

    // Background particles (energy trails, etc.)
    this.particles.draw(g);

    // mushrooms
    for (let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const m = this.grid.get(c,r); if(!m) continue; const x=c*CELL, y=r*CELL;
      drawMushroom(g, x, y, m.poisoned, m.hp);
    }

    // centipede
    for (const cent of this.centipedes){
      for (let i=0;i<cent.segments.length;i++){
        const s = cent.segments[i]; const x = s.c*CELL, y=s.r*CELL;
        drawSegment(g, x, y, s.head);
      }
    }

    // enemies
    for (const sp of this.spiders){ drawSpider(g, sp.x, sp.y, sp.w, sp.h); }
    for (const f of this.fleas){ drawFlea(g, f.x, f.y, f.w, f.h); }
    for (const sc of this.scorpions){ drawScorpion(g, sc.x, sc.y, sc.w, sc.h); }
    
    // power-ups
    g.font = '10px ui-monospace, Menlo, monospace';
    g.textAlign = 'center';
    for (const p of this.powerUps) {
      if (p.active) p.draw(g);
    }
    g.textAlign = 'start';
    
    // coins
    for (const c of this.coins){ if(!c.active) continue; g.fillStyle = '#ffd54a'; g.fillRect(c.x, c.y, c.w, c.h); g.fillStyle='#000'; g.fillRect(c.x+5, c.y+3, 2, 6); }

    // player & bullets
    const p = this.player;
    
    // Draw shield effect if active
    if (p.isShieldActive()) {
      g.fillStyle = `rgba(${hexToRgb(POWERUP_COLORS.shield)},0.3)`;
      g.fillRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
    }
    
    drawPlayer(g, p.x, p.y, p.w, p.h);
    if (p.flashT>0){ drawMuzzleFlash(g, p.x, p.y, p.w, Math.min(1, p.flashT/0.05)); }
    for (const b of p.bullets){ if(b.active) drawBullet(g, b.x, b.y); }
    
    // Foreground particles (explosions, impacts, etc.)
    g.save();
    g.globalCompositeOperation = 'lighter';
    this.particles.draw(g);
    g.restore();

  // optional scanlines
    if ((VISUAL as any)?.SCANLINES){
      g.fillStyle = 'rgba(0,0,0,0.07)';
      for (let y=0;y<this.height;y+=2){ g.fillRect(0,y,this.width,1); }
    }

  // HUD bar
  g.fillStyle = 'rgba(0,0,0,0.85)'; g.fillRect(0,0,this.width,22);
  g.fillStyle = '#ffffff'; g.strokeStyle='#000'; g.font = '12px ui-monospace, Menlo, monospace';
  g.fillText('SCORE '+this.score.toString().padStart(6,'0'), 8, 15);
  // HI at center
  const hiText = 'HI '+this.highScore.toString().padStart(6,'0');
  const wHi = g.measureText(hiText).width; g.fillText(hiText, this.width/2 - wHi/2, 15);
  g.fillText('LIVES', 140, 15);
    // draw life icons
  const iconY = 6; let ix = 185;
    for (let i=0;i<Math.max(0,this.lives);i++){
      g.fillStyle = '#5be3ff'; g.fillRect(ix, iconY+6, 10, 6);
      g.fillStyle = '#b8f4ff'; g.fillRect(ix+4, iconY, 2, 6);
      ix += 16;
    }
  g.fillText('LEVEL '+this.level, 260, 15);
  // coin indicator
  g.fillText('COIN', 360, 15);
  if (this.player.autofireTime>0){ g.fillStyle='#ffd54a'; g.fillRect(400, 7, 40*(this.player.autofireTime/POWERUPS.AUTOFIRE_DURATION), 8); }

    // player zone line (hidden by default via VISUAL flag)
    if ((VISUAL as any)?.PLAYER_ZONE_LINE){
      g.strokeStyle = '#222'; g.lineWidth = 1;
      const yLine = (ROWS-PLAYER_ROWS)*CELL + 0.5;
      g.beginPath(); g.moveTo(0, yLine); g.lineTo(this.width, yLine); g.stroke();
    }
    // floating score popups
    if (this.popups.length){
      g.font = '12px ui-monospace, Menlo, monospace'; g.textAlign='center';
      for (const p of this.popups){
        const a = Math.max(0, Math.min(1, p.t/0.7));
        g.fillStyle = `rgba(255,255,255,${a})`; g.strokeStyle = `rgba(0,0,0,${a})`;
        g.lineWidth = 2; g.strokeText(p.text, p.x, p.y); g.fillText(p.text, p.x, p.y);
      }
      g.textAlign='start';
    }
    // overlays
    // level clear flash overlay (white fade)
    if (this.levelClearT>0){
      const a = Math.min(0.9, Math.max(0, this.levelClearT / 0.6));
      g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(0,0,this.width,this.height);
    }
    // Draw FPS counter if enabled
    if (this.settings.showFPS) {
      const fps = Math.round(1000 / (performance.now() - this.last));
      g.fillStyle = '#fff';
      g.font = '12px ui-monospace, Menlo, monospace';
      g.fillText(`FPS: ${fps}`, this.width - 60, 15);
    }
    
    // Draw hitboxes if enabled
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
      
      // Centipede segment hitboxes
      for (const cent of this.centipedes) {
        for (const s of cent.segments) {
          g.strokeRect(s.c*CELL+2, s.r*CELL+2, CELL-4, CELL-4);
        }
      }
    }
    g.restore();
  }

  pause() {
    if (this.mode === 'playing') {
      this.mode = 'pause';
      this.notifyStateChange();
    }
  }
  
  resume() {
    if (this.mode === 'pause') {
      this.mode = 'playing';
      this.notifyStateChange();
    }
  }
  
  updateSettings(newSettings: typeof this.settings) {
    this.settings = { ...newSettings };
    
    // Apply volume settings
    sfx.setVolume(this.settings.sfxVolume / 100);
    
    // Update particle density
    this.particles.setDensity(this.settings.particleDensity);
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
      
      if (e.code === 'Escape' && this.mode === 'playing') {
        this.pause();
      }
      else if (this.mode === 'title' && e.code === 'Space') {
        this.mode = 'playing';
        this.resetGame();
        sfx.start();
        this.notifyStateChange();
      }
      else if (this.mode === 'gameover' && e.code === 'Space') {
        this.mode = 'playing';
        this.resetGame();
        sfx.start();
        this.notifyStateChange();
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
