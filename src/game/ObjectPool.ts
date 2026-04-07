// Generic object pool for performance optimization
// Reduces GC pressure by reusing objects instead of creating/destroying them

export interface Poolable {
  active: boolean;
  reset(): void;
}

export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private active: T[] = [];
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, initialSize: number = 50, maxSize: number = 500) {
    this.factory = factory;
    this.maxSize = maxSize;

    // Pre-allocate pool
    for (let i = 0; i < initialSize; i++) {
      const obj = this.factory();
      obj.active = false;
      this.pool.push(obj);
    }
  }

  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else if (this.active.length < this.maxSize) {
      obj = this.factory();
    } else {
      // Pool exhausted and at max - recycle oldest active
      obj = this.active.shift()!;
      obj.reset();
    }

    obj.active = true;
    this.active.push(obj);
    return obj;
  }

  release(obj: T): void {
    const idx = this.active.indexOf(obj);
    if (idx !== -1) {
      this.active.splice(idx, 1);
      obj.active = false;
      obj.reset();
      this.pool.push(obj);
    }
  }

  releaseAll(): void {
    for (const obj of this.active) {
      obj.active = false;
      obj.reset();
      this.pool.push(obj);
    }
    this.active.length = 0;
  }

  forEach(callback: (obj: T) => void): void {
    // Iterate in reverse for safe removal during iteration
    for (let i = this.active.length - 1; i >= 0; i--) {
      callback(this.active[i]);
    }
  }

  filter(predicate: (obj: T) => boolean): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const obj = this.active[i];
      if (!predicate(obj)) {
        this.release(obj);
      }
    }
  }

  getActive(): readonly T[] {
    return this.active;
  }

  get activeCount(): number {
    return this.active.length;
  }

  get pooledCount(): number {
    return this.pool.length;
  }

  get totalCount(): number {
    return this.active.length + this.pool.length;
  }
}

// Specialized pools for common game objects

export interface PooledParticle extends Poolable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  alpha: number;
  type: string;
  rotation: number;
}

export function createParticlePool(initialSize: number = 200): ObjectPool<PooledParticle> {
  return new ObjectPool<PooledParticle>(
    () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      color: '#ffffff',
      size: 4,
      alpha: 1,
      type: 'explosion',
      rotation: 0,
      reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.maxLife = 1;
        this.color = '#ffffff';
        this.size = 4;
        this.alpha = 1;
        this.type = 'explosion';
        this.rotation = 0;
      }
    }),
    initialSize,
    1000
  );
}

export interface PooledBullet extends Poolable {
  x: number;
  y: number;
  vy: number;
  damage: number;
  isMegaBlast: boolean;
  blastRadius: number;
}

export function createBulletPool(initialSize: number = 20): ObjectPool<PooledBullet> {
  return new ObjectPool<PooledBullet>(
    () => ({
      active: false,
      x: 0,
      y: 0,
      vy: -640,
      damage: 1,
      isMegaBlast: false,
      blastRadius: 0,
      reset() {
        this.x = 0;
        this.y = 0;
        this.vy = -640;
        this.damage = 1;
        this.isMegaBlast = false;
        this.blastRadius = 0;
      }
    }),
    initialSize,
    50
  );
}

export interface PooledCoin extends Poolable {
  x: number;
  y: number;
  vy: number;
  value: number;
}

export function createCoinPool(initialSize: number = 30): ObjectPool<PooledCoin> {
  return new ObjectPool<PooledCoin>(
    () => ({
      active: false,
      x: 0,
      y: 0,
      vy: 180,
      value: 100,
      reset() {
        this.x = 0;
        this.y = 0;
        this.vy = 180;
        this.value = 100;
      }
    }),
    initialSize,
    100
  );
}
