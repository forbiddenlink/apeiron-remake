import { GRID, XQJ37_BLASTER, PLAYER, POWERUPS } from './GameConfig';
import { WEAPONS, PLAYER_MECHANICS } from './Constants';
import type { Rect } from './Types';
import { sfx } from './AudioSynth';

export type PowerUpType = typeof POWERUPS.TYPES[number];
export type YummyType = PowerUpType;

const POWERUP_DURATIONS: Record<PowerUpType, number> = {
  guided: POWERUPS.GUIDED_SHOT_DURATION,
  diamond: POWERUPS.DIAMOND_DURATION,
  machine_gun: POWERUPS.MACHINE_GUN_DURATION,
  shield: POWERUPS.SHIELD_DURATION,
  lock: POWERUPS.LOCK_DURATION,
  house_cleaning: POWERUPS.HOUSE_CLEANING_DURATION,
  extra_man: POWERUPS.EXTRA_MAN_DURATION
};

export class Bullet {
  x = 0;
  y = 0;
  active = false;
  vx = 0;
  vy = -XQJ37_BLASTER.PROJECTILE_SPEED;
  damage = 1;
  isMegaBlast = false;
  isGuided = false;

  update(dt: number) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -8 || this.x < -8 || this.x > GRID.COLS * GRID.CELL + 8) {
      this.active = false;
    }
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
  w = PLAYER.SIZE.WIDTH;
  h = PLAYER.SIZE.HEIGHT;
  x = (GRID.COLS * GRID.CELL) / 2 - this.w / 2;
  y = (() => {
    const minY = (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL;
    const maxY = GRID.ROWS * GRID.CELL - this.h - 2;
    return minY + (maxY - minY) * 0.55;
  })();
  speed = PLAYER.MOVEMENT.BASE_SPEED;
  cooldown = 0;
  alive = true;
  bullets: Bullet[] = Array.from({ length: 24 }, () => new Bullet());
  flashT = 0;

  autofireTime = 0;
  phaseShiftActive = false;
  shieldFlashT = 0;
  energy: number = PLAYER_MECHANICS.MAX_ENERGY;

  private lastX = this.x;
  private lastY = this.y;
  private phaseShiftTimer = 0;
  private activePowerUps = new Map<PowerUpType, number>();

  update(dt: number, input: Set<string> | { vx: number; vy: number; shooting: boolean }) {
    if (!this.alive) return;

    this.cooldown -= dt;
    this.energy = Math.min(PLAYER_MECHANICS.MAX_ENERGY, this.energy + PLAYER_MECHANICS.ENERGY_REGEN * dt);

    if (this.autofireTime > 0) this.autofireTime -= dt;
    if (this.phaseShiftTimer > 0) {
      this.phaseShiftTimer -= dt;
      if (this.phaseShiftTimer <= 0) this.phaseShiftActive = false;
    }

    for (const [type, time] of this.activePowerUps.entries()) {
      const next = time - dt;
      if (next <= 0) {
        this.activePowerUps.delete(type);
      } else {
        this.activePowerUps.set(type, next);
      }
    }

    if (this.hasPowerUp('shield')) {
      this.shieldFlashT = (this.shieldFlashT + dt) % POWERUPS.SHIELD_FLASH_RATE;
    }

    this.lastX = this.x;
    this.lastY = this.y;
    this.move(dt, input);

    for (const b of this.bullets) b.update(dt);
    if (this.flashT > 0) this.flashT -= dt;

    const shooting = input instanceof Set ? input.has('Space') : input.shooting;
    if (shooting && this.cooldown <= 0) {
      this.fire();
      this.cooldown = this.getFireCooldown();
    }
  }

  private move(dt: number, input: Set<string> | { vx: number; vy: number; shooting: boolean }) {
    let dx = 0;
    let dy = 0;

    if (input instanceof Set) {
      if (input.has('ArrowLeft')) dx -= 1;
      if (input.has('ArrowRight')) dx += 1;
      if (input.has('ArrowUp')) dy -= 1;
      if (input.has('ArrowDown')) dy += 1;
      if (dx !== 0 && dy !== 0) {
        const norm = Math.sqrt(2);
        dx /= norm;
        dy /= norm;
      }
    } else {
      dx = input.vx / this.speed;
      dy = input.vy / (this.speed * PLAYER.MOVEMENT.VERTICAL_MULT);
    }

    this.x += dx * this.speed * dt;
    this.y += dy * this.speed * PLAYER.MOVEMENT.VERTICAL_MULT * dt;

    const minX = 0;
    const maxX = GRID.COLS * GRID.CELL - this.w;
    const minY = (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL;
    const maxY = (GRID.ROWS - 1) * GRID.CELL - this.h - 2;

    this.x = Math.max(minX, Math.min(maxX, this.x));
    this.y = Math.max(minY, Math.min(maxY, this.y));
  }

  fire() {
    const allowMultiShot = this.autofireTime > 0 || this.hasPowerUp('machine_gun');
    if (!allowMultiShot && this.bullets.some(b => b.active)) return;
    this.spawnBullet(0);

    this.flashT = XQJ37_BLASTER.MUZZLE_FLASH_TIME;
    sfx.shoot();
  }

  private spawnBullet(angle: number) {
    const b = this.bullets.find(bb => !bb.active);
    if (!b) return;
    b.active = true;
    b.x = this.x + this.w / 2 - 1;
    b.y = this.y - 6;
    b.damage = 1;
    b.isMegaBlast = false;
    b.isGuided = this.hasPowerUp('guided');

    if (angle === 0) {
      b.vx = 0;
      b.vy = -XQJ37_BLASTER.PROJECTILE_SPEED;
      return;
    }

    const rad = angle * Math.PI / 180;
    const speed = XQJ37_BLASTER.PROJECTILE_SPEED;
    b.vx = Math.sin(rad) * speed;
    b.vy = -Math.cos(rad) * speed;
  }

  getFireCooldown(): number {
    if (this.autofireTime > 0 || this.hasPowerUp('machine_gun')) {
      return XQJ37_BLASTER.MACHINE_GUN_RATE;
    }
    return XQJ37_BLASTER.FIRE_RATE;
  }

  addPowerUp(type: PowerUpType) {
    const duration = POWERUP_DURATIONS[type];
    if (duration > 0) {
      this.activePowerUps.set(type, duration);
    }

    if (type === 'machine_gun') {
      this.autofireTime = Math.max(this.autofireTime, duration);
    }

    sfx.extra();
  }

  addYummy(type: PowerUpType) {
    this.addPowerUp(type);
  }

  hasPowerUp(type: PowerUpType): boolean {
    const t = this.activePowerUps.get(type);
    return typeof t === 'number' && t > 0;
  }

  hasYummy(type: PowerUpType): boolean {
    return this.hasPowerUp(type);
  }

  canPassThroughMushrooms(): boolean {
    return this.hasPowerUp('diamond');
  }

  getPowerUpSnapshot(): Array<{ type: PowerUpType; remaining: number }> {
    const snapshot: Array<{ type: PowerUpType; remaining: number }> = [];
    for (const [type, remaining] of this.activePowerUps.entries()) {
      if (remaining > 0) snapshot.push({ type, remaining });
    }
    return snapshot;
  }

  restorePowerUps(snapshot: Array<{ type: PowerUpType; remaining: number }>) {
    this.activePowerUps.clear();
    this.autofireTime = 0;
    for (const { type, remaining } of snapshot) {
      if (remaining <= 0) continue;
      this.activePowerUps.set(type, remaining);
      if (type === 'machine_gun') {
        this.autofireTime = Math.max(this.autofireTime, remaining);
      }
    }
  }

  isShieldActive(): boolean {
    return this.hasPowerUp('shield') && this.shieldFlashT < POWERUPS.SHIELD_FLASH_RATE / 2;
  }

  rect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  revertPosition() {
    this.x = this.lastX;
    this.y = this.lastY;
  }
}
