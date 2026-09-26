import { GRID, PLAYER } from './GameConfig';

export function getMouseVelocity(
  playerX: number,
  playerY: number,
  targetX: number,
  targetY: number,
  dt: number
): { vx: number; vy: number; arrived: boolean } {
  const dx = targetX - playerX;
  const dy = targetY - playerY;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { vx: 0, vy: 0, arrived: true };

  const speed = PLAYER.MOVEMENT.BASE_SPEED;
  const velocity = {
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed * PLAYER.MOVEMENT.VERTICAL_MULT,
  };
  if (Math.hypot(velocity.vx, velocity.vy) * dt < distance) {
    return { ...velocity, arrived: false };
  }

  return { vx: dx / dt, vy: dy / dt, arrived: true };
}

export function clampMouseTarget(mouseX: number, mouseY: number): { x: number; y: number } {
  const halfWidth = PLAYER.SIZE.WIDTH / 2;
  const halfHeight = PLAYER.SIZE.HEIGHT / 2;
  const minY = (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL + halfHeight;
  const maxY = (GRID.ROWS - 1) * GRID.CELL - halfHeight - 2;

  return {
    x: Math.max(halfWidth, Math.min(mouseX, GRID.COLS * GRID.CELL - halfWidth)),
    y: Math.max(minY, Math.min(mouseY, maxY))
  };
}

export class MouseInput {
  private mouseX = 0;
  private mouseY = 0;
  private mouseDown = false;
  private mouseMoved = false;
  private readonly moveThreshold = 2; // Minimum pixels moved to trigger movement
  private boundingRect: DOMRect | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  private bindEvents() {
    // Mouse move handler
    const onMouseMove = (e: MouseEvent) => {
      if (!this.boundingRect) {
        this.boundingRect = this.canvas.getBoundingClientRect();
      }

      const oldX = this.mouseX;
      const oldY = this.mouseY;

      // Convert screen coordinates to canvas coordinates
      this.mouseX = (e.clientX - this.boundingRect.left) * (this.canvas.width / this.boundingRect.width);
      this.mouseY = (e.clientY - this.boundingRect.top) * (this.canvas.height / this.boundingRect.height);

      // Check if moved enough to trigger movement
      const dx = this.mouseX - oldX;
      const dy = this.mouseY - oldY;
      if (Math.sqrt(dx * dx + dy * dy) > this.moveThreshold) {
        this.mouseMoved = true;
      }
    };

    // Mouse button handlers
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      this.mouseDown = true;
    };

    const onMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      this.mouseDown = false;
    };

    // Handle mouse leaving canvas
    const onMouseLeave = () => {
      this.mouseDown = false;
    };

    // Handle canvas resize
    const onResize = () => {
      this.boundingRect = this.canvas.getBoundingClientRect();
    };

    // Bind all events
    this.canvas.addEventListener('mousemove', onMouseMove);
    this.canvas.addEventListener('mousedown', onMouseDown);
    this.canvas.addEventListener('mouseup', onMouseUp);
    this.canvas.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', onResize);

    // Store event handlers for cleanup
    (this as any)._onMouseMove = onMouseMove;
    (this as any)._onMouseDown = onMouseDown;
    (this as any)._onMouseUp = onMouseUp;
    (this as any)._onMouseLeave = onMouseLeave;
    (this as any)._onResize = onResize;
  }

  unbindEvents() {
    this.canvas.removeEventListener('mousemove', (this as any)._onMouseMove);
    this.canvas.removeEventListener('mousedown', (this as any)._onMouseDown);
    this.canvas.removeEventListener('mouseup', (this as any)._onMouseUp);
    this.canvas.removeEventListener('mouseleave', (this as any)._onMouseLeave);
    window.removeEventListener('resize', (this as any)._onResize);
  }

  getInput(playerX: number, playerY: number, dt: number): { vx: number; vy: number; shooting: boolean } {
    // Calculate movement vector
    let vx = 0;
    let vy = 0;

    if (this.mouseMoved) {
      // Calculate player center
      // Clamp to the center positions Player can actually reach.
      const target = clampMouseTarget(this.mouseX, this.mouseY);
      const velocity = getMouseVelocity(playerX, playerY, target.x, target.y, dt);
      vx = velocity.vx;
      vy = velocity.vy;
      if (velocity.arrived) this.mouseMoved = false;
    }

    return {
      vx,
      vy,
      shooting: this.mouseDown
    };
  }
}
