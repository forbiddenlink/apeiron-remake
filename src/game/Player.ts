import { CELL, COLS, ROWS, PLAYER_ROWS, SPEED, TIMERS, POWERUPS, WEAPONS, PLAYER_MECHANICS } from './Constants';
import type { Rect } from './Types';
import { sfx } from './AudioSynth';

export type PowerUpType = typeof POWERUPS.TYPES[number];

export class Bullet {
  x = 0; y = 0; active = false;
  vx = 0; vy = -SPEED.BULLET_PX_PER_SEC * 1.05;
  damage = 1;
  isMegaBlast = false;
  
  constructor(angle = 0, damage = 1, isMegaBlast = false) {
    if (angle !== 0) {
      const rad = angle * Math.PI / 180;
      const speed = Math.sqrt(this.vy * this.vy);
      this.vx = Math.sin(rad) * speed;
      this.vy = -Math.cos(rad) * speed;
    }
    this.damage = damage;
    this.isMegaBlast = isMegaBlast;
  }
  
  update(dt: number) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -8 || this.x < -8 || this.x > COLS * CELL + 8) this.active = false;
  }
  
  rect(): Rect {
    if (this.isMegaBlast) {
      return {
        x: this.x - WEAPONS.MEGA_BLAST.BLAST_RADIUS,
        y: this.y - WEAPONS.MEGA_BLAST.BLAST_RADIUS,
        w: WEAPONS.MEGA_BLAST.BLAST_RADIUS * 2,
        h: WEAPONS.MEGA_BLAST.BLAST_RADIUS * 2
      };
    }
    return { x: this.x, y: this.y, w: 2, h: 8 };
  }
}

export class Player {
  w = CELL * 1.2; h = CELL * 0.9;
  x = (COLS*CELL)/2 - (this.w/2);
  y = (ROWS-PLAYER_ROWS)*CELL - this.h - 2;
  speed = SPEED.PLAYER_PX_PER_SEC;
  cooldown = 0;
  alive = true;
  bullets: Bullet[] = Array.from({length: 24}, () => new Bullet());
  flashT = 0; // muzzle flash timer

  // Power-up states
  activePowerUps = new Map<PowerUpType, number>();
  shieldFlashT = 0;
  
  // Special mechanics
  energy = PLAYER_MECHANICS.MAX_ENERGY;
  chargeLevel = 0;
  dashCooldown = 0;
  warpCooldown = 0;
  phaseShiftActive = false;
  phaseShiftTimer = 0;
  megaBlastCharging = false;
  megaBlastCharge = 0;
  
  // Movement state
  private lastX = this.x;
  private lastY = this.y;
  private dashDirection = { x: 0, y: 0 };
  private isDashing = false;
  
  update(dt: number, keys: Set<string>) {
    if (!this.alive) return;
    
    // Update timers and cooldowns
    this.updateTimers(dt);
    
    // Handle movement and special abilities
    this.handleMovement(dt, keys);
    this.handleSpecialAbilities(dt, keys);
    
    // Update bullets
    for (const b of this.bullets) {
      b.update(dt);
    }
    
    if (this.flashT > 0) this.flashT -= dt;
  }
  
  private updateTimers(dt: number) {
    // Update power-up timers
    for (const [type, time] of this.activePowerUps.entries()) {
      const newTime = time - dt;
      if (newTime <= 0) {
        this.activePowerUps.delete(type);
        sfx.extra(); // Power-up end sound
      } else {
        this.activePowerUps.set(type, newTime);
      }
    }
    
    // Update cooldowns
    this.cooldown -= dt;
    this.dashCooldown -= dt;
    this.warpCooldown -= dt;
    
    // Update phase shift
    if (this.phaseShiftActive) {
      this.phaseShiftTimer -= dt;
      if (this.phaseShiftTimer <= 0) {
        this.phaseShiftActive = false;
      }
    }
    
    // Energy regeneration
    this.energy = Math.min(PLAYER_MECHANICS.MAX_ENERGY,
      this.energy + PLAYER_MECHANICS.ENERGY_REGEN * dt);
    
    // Shield flash effect
    if (this.hasPowerUp('shield')) {
      this.shieldFlashT = (this.shieldFlashT + dt) % POWERUPS.SHIELD_FLASH_RATE;
    }
  }
  
  private handleMovement(dt: number, keys: Set<string>) {
    // Store previous position
    this.lastX = this.x;
    this.lastY = this.y;
    
    // Calculate movement direction
    let dx = 0, dy = 0;
    if (keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('ArrowRight')) dx += 1;
    if (keys.has('ArrowUp')) dy -= 1;
    if (keys.has('ArrowDown')) dy += 1;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const norm = Math.sqrt(2);
      dx /= norm;
      dy /= norm;
    }
    
    // Apply speed modifiers
    let speedMultiplier = this.hasPowerUp('warp') ? POWERUPS.WARP_SPEED_MULTIPLIER : 1;
    if (this.isDashing) {
      speedMultiplier *= PLAYER_MECHANICS.DASH_SPEED;
      dx = this.dashDirection.x;
      dy = this.dashDirection.y;
    }
    
    // Update position
    this.x += dx * this.speed * speedMultiplier * dt;
    this.y += dy * (this.speed * 0.9) * speedMultiplier * dt;
    
    // Bounds checking
    this.x = Math.max(0, Math.min(COLS*CELL - this.w, this.x));
    const minY = (ROWS-PLAYER_ROWS)*CELL - this.h - 2;
    const maxY = (ROWS-1)*CELL - this.h - 2;
  this.y = Math.max(minY, Math.min(maxY, this.y));
  }
  
  private handleSpecialAbilities(dt: number, keys: Set<string>) {
    // Dash ability (Shift key)
    if (keys.has('ShiftLeft') && this.dashCooldown <= 0 && !this.isDashing) {
      this.startDash();
    }
    
    // Update dash state
    if (this.isDashing) {
      this.dashDuration -= dt;
      if (this.dashDuration <= 0) {
        this.isDashing = false;
        this.dashCooldown = PLAYER_MECHANICS.DASH_COOLDOWN;
      }
    }
    
    // Warp ability (Alt key)
    if (keys.has('AltLeft') && this.warpCooldown <= 0 && this.energy >= WEAPONS.WARP.ENERGY_COST) {
      this.warp(keys);
    }
    
    // Phase shift (Control key)
    if (keys.has('ControlLeft') && this.hasPowerUp('phase') && !this.phaseShiftActive) {
      this.startPhaseShift();
    }
    
    // Mega blast (Hold Space)
    if (keys.has('Space')) {
      if (!this.megaBlastCharging && this.hasPowerUp('mega')) {
        this.startMegaBlastCharge();
      } else if (this.megaBlastCharging) {
        this.chargeMegaBlast(dt);
      }
    } else if (this.megaBlastCharging) {
      this.fireMegaBlast();
    }
    
    // Normal weapon handling
    if (keys.has('Space') && this.cooldown <= 0 && !this.megaBlastCharging) {
      this.fire();
      this.cooldown = this.getFireCooldown();
    }
  }
  
  private startDash() {
    // Store current movement direction
    const dx = this.x - this.lastX;
    const dy = this.y - this.lastY;
    const len = Math.sqrt(dx*dx + dy*dy);
    
    if (len > 0) {
      this.dashDirection = {
        x: dx / len,
        y: dy / len
      };
      this.isDashing = true;
      this.dashDuration = PLAYER_MECHANICS.DASH_DURATION;
      sfx.extra(); // Dash sound
    }
  }
  
  private warp(keys: Set<string>) {
    // Calculate warp direction from movement keys
    let dx = 0, dy = 0;
    if (keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('ArrowRight')) dx += 1;
    if (keys.has('ArrowUp')) dy -= 1;
    if (keys.has('ArrowDown')) dy += 1;
    
    if (dx !== 0 || dy !== 0) {
      // Normalize direction
      const len = Math.sqrt(dx*dx + dy*dy);
      dx /= len;
      dy /= len;
      
      // Calculate new position
      const newX = this.x + dx * WEAPONS.WARP.RANGE;
      const newY = this.y + dy * WEAPONS.WARP.RANGE;
      
      // Bounds checking
      this.x = Math.max(0, Math.min(COLS*CELL - this.w, newX));
      const minY = (ROWS-PLAYER_ROWS)*CELL - this.h - 2;
      const maxY = (ROWS-1)*CELL - this.h - 2;
      this.y = Math.max(minY, Math.min(maxY, newY));
      
      // Apply costs and cooldowns
      this.energy -= WEAPONS.WARP.ENERGY_COST;
      this.warpCooldown = WEAPONS.WARP.COOLDOWN;
      sfx.extra(); // Warp sound
    }
  }
  
  private startPhaseShift() {
    this.phaseShiftActive = true;
    this.phaseShiftTimer = WEAPONS.PHASE_SHIFT.DURATION;
    sfx.extra(); // Phase shift sound
  }
  
  private startMegaBlastCharge() {
    this.megaBlastCharging = true;
    this.megaBlastCharge = 0;
    sfx.extra(); // Start charge sound
  }
  
  private chargeMegaBlast(dt: number) {
    this.megaBlastCharge = Math.min(
      PLAYER_MECHANICS.MAX_CHARGE,
      this.megaBlastCharge + PLAYER_MECHANICS.CHARGE_RATE * dt
    );
  }
  
  private fireMegaBlast() {
    if (this.megaBlastCharge >= PLAYER_MECHANICS.MAX_CHARGE) {
      const b = this.bullets.find(bb => !bb.active);
      if (b) {
        b.active = true;
        b.x = this.x + this.w/2;
        b.y = this.y - 6;
        b.vx = 0;
        b.vy = -SPEED.BULLET_PX_PER_SEC;
        b.damage = 5;
        b.isMegaBlast = true;
        this.flashT = 0.1;
        sfx.extra(); // Mega blast sound
      }
    }
    this.megaBlastCharging = false;
    this.megaBlastCharge = 0;
  }
  }
  
  fire() {
    if (this.hasPowerUp('spread')) {
      // Spread shot: fire 3 bullets in a spread pattern
      const angles = [-POWERUPS.SPREAD_SHOT_ANGLE, 0, POWERUPS.SPREAD_SHOT_ANGLE];
      for (const angle of angles) {
        const b = this.bullets.find(bb => !bb.active);
        if (!b) continue;
        b.active = true;
        b.x = this.x + this.w/2 - 1;
        b.y = this.y - 6;
        if (angle !== 0) {
          const rad = angle * Math.PI / 180;
          const speed = SPEED.BULLET_PX_PER_SEC * 1.05;
          b.vx = Math.sin(rad) * speed;
          b.vy = -Math.cos(rad) * speed;
        } else {
          b.vx = 0;
          b.vy = -SPEED.BULLET_PX_PER_SEC * 1.05;
        }
      }
    } else {
      // Normal shot
      const b = this.bullets.find(bb => !bb.active);
      if (!b) return;
      b.active = true;
      b.x = this.x + this.w/2 - 1;
      b.y = this.y - 6;
      b.vx = 0;
      b.vy = -SPEED.BULLET_PX_PER_SEC * 1.05;
    }
    
  this.flashT = 0.05;
    sfx.shoot();
  }

  getFireCooldown(): number {
    let cooldown = TIMERS.FIRE_COOLDOWN;
    if (this.hasPowerUp('autofire')) cooldown = TIMERS.AUTOFIRE_COOLDOWN;
    if (this.hasPowerUp('rapid')) cooldown /= POWERUPS.RAPID_FIRE_MULTIPLIER;
    return cooldown;
  }
  
  addPowerUp(type: PowerUpType) {
    const duration = POWERUPS[`${type.toUpperCase()}_SHOT_DURATION` as keyof typeof POWERUPS] || 
                    POWERUPS[`${type.toUpperCase()}_DURATION` as keyof typeof POWERUPS];
    this.activePowerUps.set(type, duration);
    sfx.extra();
  }
  
  hasPowerUp(type: PowerUpType): boolean {
    return this.activePowerUps.has(type);
  }
  
  isShieldActive(): boolean {
    return this.hasPowerUp('shield') && this.shieldFlashT < POWERUPS.SHIELD_FLASH_RATE / 2;
  }
  
  rect(): Rect { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}
