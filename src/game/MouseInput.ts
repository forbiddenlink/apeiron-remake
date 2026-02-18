import { GRID, PLAYER } from './GameConfig';

export class MouseInput {
  private mouseX = 0;
  private mouseY = 0;
  private mouseDown = false;
  private mouseMoved = false;
  private lastMoveTime = 0;
  private moveThreshold = 2; // Minimum pixels moved to trigger movement
  private moveTimeout = 50; // ms to wait before considering mouse stopped
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
        this.lastMoveTime = performance.now();
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

  getInput(playerX: number, playerY: number): { vx: number; vy: number; shooting: boolean } {
    // Check if mouse has stopped moving
    if (performance.now() - this.lastMoveTime > this.moveTimeout) {
      this.mouseMoved = false;
    }

    // Calculate movement vector
    let vx = 0;
    let vy = 0;

    if (this.mouseMoved) {
      // Calculate player center
      const playerZoneY = (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL;
      const maxPlayerY = GRID.ROWS * GRID.CELL - GRID.CELL;

      // Calculate target position (clamped to player zone)
      const targetX = Math.max(0, Math.min(this.mouseX, GRID.COLS * GRID.CELL));
      const targetY = Math.max(playerZoneY, Math.min(this.mouseY, maxPlayerY));

      // Calculate direction from player toward target cursor position.
      const dx = targetX - playerX;
      const dy = targetY - playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        // Normalize and scale by player speed
        const speed = PLAYER.MOVEMENT.BASE_SPEED;
        vx = (dx / dist) * speed;
        vy = (dy / dist) * speed * PLAYER.MOVEMENT.VERTICAL_MULT;
      }
    }

    return {
      vx,
      vy,
      shooting: this.mouseDown
    };
  }
}
