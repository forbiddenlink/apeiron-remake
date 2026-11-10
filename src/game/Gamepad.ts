// Gamepad reading for the standard mapping: left stick or d-pad to move, any
// face button or trigger to fire, Start to pause. Pure function of a snapshot so
// it can be tested without a controller.
export interface PadInput {
  x: number // -1..1
  y: number // -1..1
  fire: boolean
  pause: boolean
  active: boolean // any movement or fire this frame
}

export interface PadLike {
  axes: readonly number[]
  buttons: readonly { pressed: boolean }[]
}

const DEADZONE = 0.22
const NO_INPUT: PadInput = { x: 0, y: 0, fire: false, pause: false, active: false }

function pressed(pad: PadLike, index: number): boolean {
  return !!pad.buttons[index]?.pressed
}

function withDeadzone(v: number): number {
  if (!Number.isFinite(v) || Math.abs(v) < DEADZONE) return 0
  // Rescale so movement starts from zero at the edge of the deadzone.
  return (Math.sign(v) * (Math.abs(v) - DEADZONE)) / (1 - DEADZONE)
}

export function readGamepad(pad: PadLike | null | undefined): PadInput {
  if (!pad) return NO_INPUT
  let x = withDeadzone(pad.axes[0] ?? 0)
  let y = withDeadzone(pad.axes[1] ?? 0)
  // D-pad (standard mapping: 12 up, 13 down, 14 left, 15 right) overrides the stick.
  if (pressed(pad, 14)) x = -1
  if (pressed(pad, 15)) x = 1
  if (pressed(pad, 12)) y = -1
  if (pressed(pad, 13)) y = 1
  const len = Math.hypot(x, y)
  if (len > 1) {
    x /= len
    y /= len
  }
  const fire = [0, 1, 2, 3, 5, 7].some((i) => pressed(pad, i))
  return { x, y, fire, pause: pressed(pad, 9), active: x !== 0 || y !== 0 || fire }
}

// The first connected pad, or null. Safe where the Gamepad API does not exist.
export function firstGamepad(): PadLike | null {
  try {
    const pads = typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null
    if (!pads) return null
    for (const pad of pads) if (pad?.connected) return pad
  } catch {}
  return null
}
