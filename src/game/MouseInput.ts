import { GRID, PLAYER } from './GameConfig'

// The pointer is the original's control: the crystal should be where the mouse
// is. At the keyboard speed a flick across the field took 1.65 s to catch up;
// at four times that it takes about 0.4 s. Per tick that is 16 units, well under
// what it would take to jump clean over a mushroom.
export const MOUSE_FOLLOW_MULT = 4

export function getMouseVelocity(
  playerX: number,
  playerY: number,
  targetX: number,
  targetY: number,
  dt: number
): { vx: number; vy: number; arrived: boolean } {
  const dx = targetX - playerX
  const dy = targetY - playerY
  const distance = Math.hypot(dx, dy)
  if (distance === 0) return { vx: 0, vy: 0, arrived: true }

  const speed = PLAYER.MOVEMENT.BASE_SPEED * MOUSE_FOLLOW_MULT
  const velocity = {
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed * PLAYER.MOVEMENT.VERTICAL_MULT,
  }
  if (Math.hypot(velocity.vx, velocity.vy) * dt < distance) {
    return { ...velocity, arrived: false }
  }

  return { vx: dx / dt, vy: dy / dt, arrived: true }
}

// Relative mode moves up to this multiple of the normal top speed.
const RELATIVE_SPEED_CAP = 2.5

export function clampMouseTarget(mouseX: number, mouseY: number): { x: number; y: number } {
  const halfWidth = PLAYER.SIZE.WIDTH / 2
  const halfHeight = PLAYER.SIZE.HEIGHT / 2
  const minY = (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL + halfHeight
  const maxY = (GRID.ROWS - 1) * GRID.CELL - halfHeight - 2

  return {
    x: Math.max(halfWidth, Math.min(mouseX, GRID.COLS * GRID.CELL - halfWidth)),
    y: Math.max(minY, Math.min(mouseY, maxY)),
  }
}

// Pointer input: mouse, pen and touch all drive the crystal the same way. The
// name is kept for the existing imports.
export class MouseInput {
  private mouseX = 0
  private mouseY = 0
  private mouseDown = false
  private mouseMoved = false
  private readonly moveThreshold = 2 // Minimum pixels moved to trigger movement
  private canvas: HTMLCanvasElement
  private unbind: (() => void) | null = null
  private relative = false
  private lastPlayerX = 0
  private lastPlayerY = 0
  // Called when the browser drops pointer lock (the player pressed Esc).
  onLockLost: (() => void) | null = null

  // logicalWidth/Height: the game's own coordinate space (800x592). The canvas
  // backing store may be larger (Retina) and its CSS box may be scaled.
  constructor(
    canvas: HTMLCanvasElement,
    private logicalWidth: number = canvas.width,
    private logicalHeight: number = canvas.height,
    // Screen pixels per field unit: the field is drawn scaled up.
    private fieldScale = 1
  ) {
    this.canvas = canvas
    this.bindEvents()
  }

  // Relative mode: the cursor is captured and hidden and the crystal follows
  // mouse movement directly, as the 1995 game did, instead of chasing a pointer.
  setRelative(on: boolean) {
    this.relative = on
    if (!on) this.releaseLock()
  }

  isLocked(): boolean {
    return typeof document !== 'undefined' && document.pointerLockElement === this.canvas
  }

  releaseLock() {
    if (this.isLocked()) document.exitPointerLock?.()
  }

  private bindEvents() {
    const track = (e: PointerEvent) => {
      // Measured per event: the frame can be rescaled or scrolled at any time.
      const rect = this.canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      if (this.isLocked()) {
        // Captured: accumulate movement into a virtual cursor inside the player zone.
        const moved = clampMouseTarget(
          this.mouseX + (e.movementX * (this.logicalWidth / rect.width)) / this.fieldScale,
          this.mouseY + (e.movementY * (this.logicalHeight / rect.height)) / this.fieldScale
        )
        this.mouseX = moved.x
        this.mouseY = moved.y
        this.mouseMoved = true
        return
      }
      const oldX = this.mouseX
      const oldY = this.mouseY
      this.mouseX = ((e.clientX - rect.left) * (this.logicalWidth / rect.width)) / this.fieldScale
      this.mouseY = ((e.clientY - rect.top) * (this.logicalHeight / rect.height)) / this.fieldScale
      if (Math.hypot(this.mouseX - oldX, this.mouseY - oldY) > this.moveThreshold) {
        this.mouseMoved = true
      }
    }

    const onMove = (e: PointerEvent) => track(e)

    const onDown = (e: PointerEvent) => {
      e.preventDefault()
      track(e)
      // A finger has no hover: go to where it lands.
      if (e.pointerType !== 'mouse') this.mouseMoved = true
      this.mouseDown = true
      if (this.relative && e.pointerType === 'mouse' && !this.isLocked()) {
        // Start the virtual cursor on the crystal so it does not jump.
        this.mouseX = this.lastPlayerX
        this.mouseY = this.lastPlayerY
        try {
          void this.canvas.requestPointerLock?.()
        } catch {}
        return
      }
      try {
        this.canvas.setPointerCapture(e.pointerId)
      } catch {}
    }

    let wasLocked = false
    const onLockChange = () => {
      const locked = this.isLocked()
      if (wasLocked && !locked) {
        this.mouseDown = false
        this.onLockLost?.()
      }
      wasLocked = locked
    }

    const onUp = (e: PointerEvent) => {
      e.preventDefault()
      this.mouseDown = false
    }

    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && !this.canvas.hasPointerCapture?.(e.pointerId)) {
        this.mouseDown = false
      }
    }

    const onCancel = () => {
      this.mouseDown = false
    }

    const c = this.canvas
    c.addEventListener('pointermove', onMove)
    c.addEventListener('pointerdown', onDown)
    c.addEventListener('pointerup', onUp)
    c.addEventListener('pointerleave', onLeave)
    c.addEventListener('pointercancel', onCancel)
    if (typeof document !== 'undefined') {
      document.addEventListener('pointerlockchange', onLockChange)
    }
    this.unbind = () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('pointerlockchange', onLockChange)
      }
      c.removeEventListener('pointermove', onMove)
      c.removeEventListener('pointerdown', onDown)
      c.removeEventListener('pointerup', onUp)
      c.removeEventListener('pointerleave', onLeave)
      c.removeEventListener('pointercancel', onCancel)
    }
  }

  unbindEvents() {
    this.unbind?.()
    this.unbind = null
  }

  getInput(
    playerX: number,
    playerY: number,
    dt: number
  ): { vx: number; vy: number; shooting: boolean } {
    let vx = 0
    let vy = 0
    this.lastPlayerX = playerX
    this.lastPlayerY = playerY

    if (this.mouseMoved && this.isLocked()) {
      // Direct follow, capped per tick so a hard flick cannot jump a mushroom.
      const target = clampMouseTarget(this.mouseX, this.mouseY)
      const cap = PLAYER.MOVEMENT.BASE_SPEED * RELATIVE_SPEED_CAP
      const dx = target.x - playerX
      const dy = target.y - playerY
      const dist = Math.hypot(dx, dy)
      if (dist > 0) {
        const speed = Math.min(cap, dist / dt)
        vx = (dx / dist) * speed
        vy = (dy / dist) * speed
      }
      if (dist < 0.5) this.mouseMoved = false
    } else if (this.mouseMoved) {
      // Clamp to the center positions Player can actually reach.
      const target = clampMouseTarget(this.mouseX, this.mouseY)
      const velocity = getMouseVelocity(playerX, playerY, target.x, target.y, dt)
      vx = velocity.vx
      vy = velocity.vy
      if (velocity.arrived) this.mouseMoved = false
    }

    return {
      vx,
      vy,
      shooting: this.mouseDown,
    }
  }
}
