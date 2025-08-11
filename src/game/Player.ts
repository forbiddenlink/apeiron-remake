import { GRID, XQJ37_BLASTER, PLAYER, YUMMIES } from './GameConfig';
import type { Rect } from './Types';
import { sfx } from './AudioSynth';

export type YummyType = keyof typeof YUMMIES.DURATIONS;

export class Bullet {
  x = 0; y = 0; active = false;
  vx = 0; vy = -XQJ37_BLASTER.PROJECTILE_SPEED;
  damage = 1;
  isNuke = false;
  isGuided = false;
  private angle = 0;
  private target: { x: number, y: number } | null = null;
  
  constructor(angle = 0, damage = 1, isNuke = false, isGuided = false) {
    if (angle !== 0) {
      this.angle = angle;
      const rad = angle * Math.PI / 180;
      const speed = XQJ37_BLASTER.PROJECTILE_SPEED;
      this.vx = Math.sin(rad) * speed;
      this.vy = -Math.cos(rad) * speed;
    }
    this.damage = damage;
    this.isNuke = isNuke;
    this.isGuided = isGuided;
  }
  
  update(dt: number, enemies?: { x: number, y: number }[]) {
    if (!this.active) return;
    
    if (this.isGuided && enemies && enemies.length > 0) {
      // Find closest enemy above the bullet
      let closestDist = Infinity;
      let closestEnemy = null;
      
      for (const enemy of enemies) {
        if (enemy.y < this.y) { // Only target enemies above the bullet
          const dx = enemy.x - this.x;
          const dy = enemy.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < closestDist) {
            closestDist = dist;
            closestEnemy = enemy;
          }
        }
      }
      
      if (closestEnemy) {
        // Update target
        this.target = closestEnemy;
        
        // Calculate desired angle to target
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const targetAngle = Math.atan2(dx, -dy) * 180 / Math.PI;
        
        // Smoothly rotate towards target
        const turnRate = XQJ37_BLASTER.GUIDED_TURN_RATE * dt;
        let angleDiff = targetAngle - this.angle;
        
        // Normalize angle difference to [-180, 180]
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;
        
        // Apply turn rate
        if (Math.abs(angleDiff) > turnRate) {
          this.angle += Math.sign(angleDiff) * turnRate;
        } else {
          this.angle = targetAngle;
        }
        
        // Update velocity based on new angle
        const rad = this.angle * Math.PI / 180;
        const speed = XQJ37_BLASTER.PROJECTILE_SPEED;
        this.vx = Math.sin(rad) * speed;
        this.vy = -Math.cos(rad) * speed;
      }
    }
    
    // Update position
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Check bounds
    if (this.y < -8 || this.x < -8 || this.x > GRID.COLS * GRID.CELL + 8) {
      this.active = false;
    }
  }
  
  rect(): Rect {
    if (this.isNuke) {
      return {
        x: this.x - YUMMIES.DURATIONS.NUKE,
        y: this.y - YUMMIES.DURATIONS.NUKE,
        w: YUMMIES.DURATIONS.NUKE * 2,
        h: YUMMIES.DURATIONS.NUKE * 2
      };
    }
    return { x: this.x, y: this.y, w: 2, h: 8 };
  }
  
  getAngle(): number {
    return this.angle;
  }
}

export class Player {
  w = PLAYER.SIZE.WIDTH;
  h = PLAYER.SIZE.HEIGHT;
  x = (GRID.COLS * GRID.CELL) / 2 - (this.w / 2);
  y = (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL - this.h - 2;
  speed = PLAYER.MOVEMENT.BASE_SPEED;
  cooldown = 0;
  alive = true;
  bullets: Bullet[] = Array.from({length: XQJ37_BLASTER.MAX_PROJECTILES * 8}, () => new Bullet());
  flashT = 0; // muzzle flash timer

  // Yummy power-up states
  activeYummies = new Map<YummyType, number>();
  shieldFlashT = 0;
  
  // Special mechanics
  energy = PLAYER.ABILITIES.MAX_ENERGY;
  chargeLevel = 0;
  dashCooldown = 0;
  dashDuration = 0;
  ghostActive = false;
  ghostTimer = 0;
  nukeCharging = false;
  nukeCharge = 0;
  
  // Movement state
  private lastX = this.x;
  private lastY = this.y;
  private vx = 0;
  private vy = 0;
  private dashDirection = { x: 0, y: 0 };
  private isDashing = false;
  private dashInvulnTimer = 0;
  
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
    // Update Yummy power-up timers
    for (const [type, time] of this.activeYummies.entries()) {
      const newTime = time - dt;
      if (newTime <= 0) {
        this.activeYummies.delete(type);
        sfx.extra(); // Power-up end sound
      } else {
        this.activeYummies.set(type, newTime);
      }
    }
    
    // Update cooldowns
    this.cooldown -= dt;
    this.dashCooldown -= dt;
    
    // Update invulnerability timer
    if (this.dashInvulnTimer > 0) {
      this.dashInvulnTimer -= dt;
    }
    
    // Update ghost mode
    if (this.ghostActive) {
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0) {
        this.ghostActive = false;
      }
    }
    
    // Energy regeneration
    this.energy = Math.min(PLAYER.ABILITIES.MAX_ENERGY,
      this.energy + PLAYER.ABILITIES.ENERGY_REGEN * dt);
    
    // Shield flash effect
    if (this.hasYummy('SHIELD')) {
      this.shieldFlashT = (this.shieldFlashT + dt) % YUMMIES.VISUALS.SHIELD_FLASH_RATE;
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
    let speedMultiplier = this.hasYummy('SPEED') ? YUMMIES.DURATIONS.SPEED_BOOST : 1;
    if (this.isDashing) {
      speedMultiplier *= PLAYER.ABILITIES.DASH_SPEED;
      dx = this.dashDirection.x;
      dy = this.dashDirection.y;
    }
    
    // Apply acceleration/deceleration
    const targetVX = dx * this.speed * speedMultiplier;
    const targetVY = dy * this.speed * speedMultiplier * PLAYER.MOVEMENT.VERTICAL_MULT;
    
    if (this.ghostActive) {
      // During ghost mode, increase momentum
      this.vx += (targetVX - this.vx) * 1.2 * dt; // Smoother movement in ghost mode
      this.vy += (targetVY - this.vy) * 1.2 * dt;
    } else if (dx !== 0 || dy !== 0) {
      // Accelerate towards target velocity
      const accel = PLAYER.MOVEMENT.ACCEL * dt;
      this.vx += Math.sign(targetVX - this.vx) * accel;
      this.vy += Math.sign(targetVY - this.vy) * accel;
    } else {
      // Decelerate when no input
      const decel = PLAYER.MOVEMENT.DECEL * dt;
      this.vx = Math.abs(this.vx) <= decel ? 0 : this.vx - Math.sign(this.vx) * decel;
      this.vy = Math.abs(this.vy) <= decel ? 0 : this.vy - Math.sign(this.vy) * decel;
    }
    
    // Apply momentum decay
    this.vx *= PLAYER.MOVEMENT.MOMENTUM_DECAY;
    this.vy *= PLAYER.MOVEMENT.MOMENTUM_DECAY;
    
    // Clamp velocities
    const maxVel = PLAYER.MOVEMENT.MAX_VELOCITY;
    this.vx = Math.max(-maxVel, Math.min(maxVel, this.vx));
    this.vy = Math.max(-maxVel, Math.min(maxVel, this.vy));
    
    // Update position
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Bounds checking with momentum preservation
    const minX = 0;
    const maxX = GRID.COLS * GRID.CELL - this.w;
    const minY = (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL - this.h - 2;
    const maxY = (GRID.ROWS - 1) * GRID.CELL - this.h - 2;
    
    if (this.x < minX) {
      this.x = minX;
      this.vx = Math.max(0, this.vx); // Preserve only positive momentum
    } else if (this.x > maxX) {
      this.x = maxX;
      this.vx = Math.min(0, this.vx); // Preserve only negative momentum
    }
    
    if (this.y < minY) {
      this.y = minY;
      this.vy = Math.max(0, this.vy);
    } else if (this.y > maxY) {
      this.y = maxY;
      this.vy = Math.min(0, this.vy);
    }
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
        this.dashCooldown = PLAYER.ABILITIES.DASH_COOLDOWN;
      }
    }
    
    // Ghost mode (Control key)
    if (keys.has('ControlLeft') && this.hasYummy('GHOST') && !this.ghostActive) {
      this.startGhostMode();
    }
    
    // Nuke (Hold Space)
    if (keys.has('Space')) {
      if (!this.nukeCharging && this.hasYummy('NUKE')) {
        this.startNukeCharge();
      } else if (this.nukeCharging) {
        this.chargeNuke(dt);
      }
    } else if (this.nukeCharging) {
      this.fireNuke();
    }
    
    // Normal weapon handling
    if (keys.has('Space') && this.cooldown <= 0 && !this.nukeCharging) {
      this.fire();
      this.cooldown = this.getFireCooldown();
    }
  }
  
  private startDash() {
    // Use current velocity for dash direction if moving
    const len = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
    
    if (len > 0) {
      this.dashDirection = {
        x: this.vx / len,
        y: this.vy / len
      };
      this.isDashing = true;
      this.dashDuration = PLAYER_MECHANICS.DASH_DURATION;
      this.dashInvulnTimer = PLAYER_MECHANICS.DASH_INVULN;
      
      // Add initial dash burst
      this.vx = this.dashDirection.x * this.speed * PLAYER_MECHANICS.DASH_SPEED;
      this.vy = this.dashDirection.y * this.speed * PLAYER_MECHANICS.DASH_SPEED;
      
      sfx.extra(); // Dash sound
    }
  }
  
  private warp(keys: Set<string>) {
    // Calculate warp direction from movement keys or current velocity
    let dx = 0, dy = 0;
    
    // Check for key input first
    if (keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('ArrowRight')) dx += 1;
    if (keys.has('ArrowUp')) dy -= 1;
    if (keys.has('ArrowDown')) dy += 1;
    
    // If no keys pressed, use current velocity direction
    if (dx === 0 && dy === 0 && (this.vx !== 0 || this.vy !== 0)) {
      const len = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
      dx = this.vx / len;
      dy = this.vy / len;
    }
    
    if (dx !== 0 || dy !== 0) {
      // Normalize direction if from keys
      if (Math.abs(dx) + Math.abs(dy) > 1) {
        const len = Math.sqrt(dx*dx + dy*dy);
        dx /= len;
        dy /= len;
      }
      
      // Calculate new position
      const newX = this.x + dx * WEAPONS.WARP.RANGE;
      const newY = this.y + dy * WEAPONS.WARP.RANGE;
      
      // Store pre-warp velocity
      const preVX = this.vx;
      const preVY = this.vy;
      
      // Bounds checking
      this.x = Math.max(0, Math.min(COLS*CELL - this.w, newX));
      const minY = (ROWS-PLAYER_ROWS)*CELL - this.h - 2;
      const maxY = (ROWS-1)*CELL - this.h - 2;
      this.y = Math.max(minY, Math.min(maxY, newY));
      
      // Preserve momentum in warp direction
      const speed = Math.sqrt(preVX*preVX + preVY*preVY);
      this.vx = dx * speed * 1.2; // Slight speed boost after warp
      this.vy = dy * speed * 1.2;
      
      // Apply costs and cooldowns
      this.energy -= WEAPONS.WARP.ENERGY_COST;
      this.warpCooldown = WEAPONS.WARP.COOLDOWN;
      this.warpInvulnTimer = WEAPONS.WARP.INVULN_TIME;
      sfx.extra(); // Warp sound
    }
  }
  
  private startGhostMode() {
    this.ghostActive = true;
    this.ghostTimer = YUMMIES.DURATIONS.GHOST_MODE;
    sfx.extra(); // Ghost mode sound
  }
  
  private startNukeCharge() {
    this.nukeCharging = true;
    this.nukeCharge = 0;
    sfx.extra(); // Start charge sound
  }
  
  private chargeNuke(dt: number) {
    this.nukeCharge = Math.min(
      100, // Max charge
      this.nukeCharge + 50 * dt // Charge rate
    );
  }
  
  private fireNuke() {
    if (this.nukeCharge >= 100) {
      const b = this.bullets.find(bb => !bb.active);
      if (b) {
        b.active = true;
        b.x = this.x + this.w/2;
        b.y = this.y - 6;
        b.vx = 0;
        b.vy = -XQJ37_BLASTER.PROJECTILE_SPEED;
        b.damage = 10;
        b.isNuke = true;
        this.flashT = 0.1;
        sfx.extra(); // Nuke blast sound
      }
    }
    this.nukeCharging = false;
    this.nukeCharge = 0;
  }
  }
  
  fire() {
    if (this.hasYummy('TRIPLE')) {
      // Triple shot pattern
      const angles = [-XQJ37_BLASTER.TRIPLE_SHOT_ANGLE, 0, XQJ37_BLASTER.TRIPLE_SHOT_ANGLE];
      for (const angle of angles) {
        const b = this.bullets.find(bb => !bb.active);
        if (!b) continue;
        b.active = true;
        b.x = this.x + this.w/2 - 1;
        b.y = this.y - 6;
        b.isGuided = this.hasYummy('GUIDED');
        if (angle !== 0) {
          const rad = angle * Math.PI / 180;
          const speed = XQJ37_BLASTER.PROJECTILE_SPEED;
          b.vx = Math.sin(rad) * speed;
          b.vy = -Math.cos(rad) * speed;
        } else {
          b.vx = 0;
          b.vy = -XQJ37_BLASTER.PROJECTILE_SPEED;
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
      b.vy = -XQJ37_BLASTER.PROJECTILE_SPEED;
      b.isGuided = this.hasYummy('GUIDED');
    }
    
    this.flashT = XQJ37_BLASTER.MUZZLE_FLASH_TIME;
    sfx.shoot();
  }

  getFireCooldown(): number {
    let cooldown = XQJ37_BLASTER.FIRE_RATE;
    if (this.hasYummy('MACHINE_GUN')) {
      cooldown = XQJ37_BLASTER.MACHINE_GUN_RATE;
    }
    return cooldown;
  }
  
  addYummy(type: YummyType) {
    const duration = YUMMIES.DURATIONS[type];
    this.activeYummies.set(type, duration);
    sfx.extra(); // Yummy collection sound
  }
  
  hasYummy(type: YummyType): boolean {
    return this.activeYummies.has(type);
  }
  
  isShieldActive(): boolean {
    return this.hasYummy('SHIELD') && this.shieldFlashT < YUMMIES.VISUALS.SHIELD_FLASH_RATE / 2;
  }
  
  rect(): Rect { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}
