import { GRID, ENEMIES, PLAYER } from './GameConfig';

interface DebugSettings {
  showHitboxes: boolean;
  showVelocityVectors: boolean;
  showEnemyPaths: boolean;
  showSpawnZones: boolean;
  showPlayerZone: boolean;
  showGrid: boolean;
  showFPS: boolean;
  showCollisionPoints: boolean;
  showEnergyFields: boolean;
  showParticleCount: boolean;
}

interface CollisionPoint {
  x: number;
  y: number;
  type: 'hit' | 'miss';
  time: number;
}

interface PathPoint {
  x: number;
  y: number;
  time: number;
}

export class DebugVisualizer {
  private settings: DebugSettings = {
    showHitboxes: false,
    showVelocityVectors: false,
    showEnemyPaths: false,
    showSpawnZones: false,
    showPlayerZone: false,
    showGrid: false,
    showFPS: false,
    showCollisionPoints: false,
    showEnergyFields: false,
    showParticleCount: false
  };

  private collisionPoints: CollisionPoint[] = [];
  private enemyPaths: Map<string, PathPoint[]> = new Map();
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private fps = 0;
  private fpsUpdateInterval = 500; // Update FPS every 500ms
  private lastFpsUpdate = 0;
  private particleCount = 0;

  constructor(private ctx: CanvasRenderingContext2D) {}

  updateSettings(settings: Partial<DebugSettings>) {
    this.settings = { ...this.settings, ...settings };
  }

  addCollisionPoint(x: number, y: number, type: 'hit' | 'miss') {
    this.collisionPoints.push({ x, y, type, time: performance.now() });
    // Keep only last 2 seconds of collision points
    const twoSecondsAgo = performance.now() - 2000;
    this.collisionPoints = this.collisionPoints.filter(p => p.time > twoSecondsAgo);
  }

  addEnemyPathPoint(enemyId: string, x: number, y: number) {
    if (!this.enemyPaths.has(enemyId)) {
      this.enemyPaths.set(enemyId, []);
    }
    const path = this.enemyPaths.get(enemyId)!;
    path.push({ x, y, time: performance.now() });
    // Keep only last 3 seconds of path points
    const threeSecondsAgo = performance.now() - 3000;
    this.enemyPaths.set(
      enemyId,
      path.filter(p => p.time > threeSecondsAgo)
    );
  }

  setParticleCount(count: number) {
    this.particleCount = count;
  }

  draw() {
    if (Object.values(this.settings).every(setting => !setting)) return;

    const now = performance.now();
    this.frameCount++;

    // Update FPS counter
    if (now - this.lastFpsUpdate > this.fpsUpdateInterval) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    this.ctx.save();

    // Draw grid
    if (this.settings.showGrid) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.lineWidth = 0.5;
      for (let x = 0; x < GRID.COLS; x++) {
        this.ctx.beginPath();
        this.ctx.moveTo(x * GRID.CELL, 0);
        this.ctx.lineTo(x * GRID.CELL, GRID.ROWS * GRID.CELL);
        this.ctx.stroke();
      }
      for (let y = 0; y < GRID.ROWS; y++) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y * GRID.CELL);
        this.ctx.lineTo(GRID.COLS * GRID.CELL, y * GRID.CELL);
        this.ctx.stroke();
      }
    }

    // Draw player zone
    if (this.settings.showPlayerZone) {
      this.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
      this.ctx.fillRect(
        0,
        (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL,
        GRID.COLS * GRID.CELL,
        GRID.PLAYER_ROWS * GRID.CELL
      );
    }

    // Draw spawn zones
    if (this.settings.showSpawnZones) {
      // Spider spawn zones
      this.ctx.fillStyle = 'rgba(255, 64, 129, 0.1)';
      this.ctx.fillRect(
        0,
        (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL,
        GRID.CELL,
        GRID.PLAYER_ROWS * GRID.CELL
      );
      this.ctx.fillRect(
        (GRID.COLS - 1) * GRID.CELL,
        (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL,
        GRID.CELL,
        GRID.PLAYER_ROWS * GRID.CELL
      );

      // Flea spawn zone
      this.ctx.fillStyle = 'rgba(124, 77, 255, 0.1)';
      this.ctx.fillRect(
        0,
        0,
        GRID.COLS * GRID.CELL,
        GRID.CELL
      );

      // UFO spawn zone
      this.ctx.fillStyle = 'rgba(0, 229, 255, 0.1)';
      this.ctx.fillRect(
        0,
        0,
        GRID.COLS * GRID.CELL,
        GRID.ROWS * GRID.CELL / 3
      );
    }

    // Draw collision points
    if (this.settings.showCollisionPoints) {
      for (const point of this.collisionPoints) {
        const age = (now - point.time) / 2000; // Age ratio (0-1)
        const alpha = 1 - age;
        this.ctx.fillStyle = point.type === 'hit'
          ? `rgba(255, 64, 129, ${alpha})`
          : `rgba(255, 255, 255, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Draw enemy paths
    if (this.settings.showEnemyPaths) {
      for (const [enemyId, path] of this.enemyPaths) {
        if (path.length < 2) continue;

        this.ctx.strokeStyle = 'rgba(255, 64, 129, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          this.ctx.lineTo(path[i].x, path[i].y);
        }
        this.ctx.stroke();
      }
    }

    // Draw debug info overlay
    if (this.settings.showFPS || this.settings.showParticleCount) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(10, 30, 150, this.settings.showFPS && this.settings.showParticleCount ? 50 : 30);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '12px monospace';
      let y = 45;
      if (this.settings.showFPS) {
        this.ctx.fillText(`FPS: ${this.fps}`, 20, y);
        y += 20;
      }
      if (this.settings.showParticleCount) {
        this.ctx.fillText(`Particles: ${this.particleCount}`, 20, y);
      }
    }

    this.ctx.restore();
  }

  // Helper method to draw velocity vectors
  drawVelocityVector(x: number, y: number, vx: number, vy: number, color = 'rgba(255, 255, 255, 0.5)') {
    if (!this.settings.showVelocityVectors) return;

    const scale = 20; // Scale factor to make vectors visible
    const arrowSize = 5;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 1;

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    const endX = x + vx * scale;
    const endY = y + vy * scale;
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(vy, vx);
    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - arrowSize * Math.cos(angle - Math.PI / 6),
      endY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      endX - arrowSize * Math.cos(angle + Math.PI / 6),
      endY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  // Helper method to draw hitboxes
  drawHitbox(x: number, y: number, w: number, h: number, color = 'rgba(255, 0, 0, 0.5)') {
    if (!this.settings.showHitboxes) return;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.restore();
  }

  // Helper method to draw energy fields
  drawEnergyField(x: number, y: number, radius: number, intensity: number) {
    if (!this.settings.showEnergyFields) return;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(100, 255, 255, ${intensity})`);
    gradient.addColorStop(1, 'rgba(100, 255, 255, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }
}
