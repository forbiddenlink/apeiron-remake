// 3D sprite baker.
//
// Every character is a small 3D model built in code from primitives, lit with an
// image-based environment plus a key light, and rendered once at boot into a 2D
// atlas. The game then blits tiles from that atlas with its normal canvas
// drawing, so gameplay, determinism and the pixel gate are untouched: the 3D
// renderer never runs during play.
//
// Units are logical game pixels (a grid cell is 16). Each tile is TILE logical
// pixels square, rendered at BAKE_SCALE for Retina.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export const TILE = 32
// 32 units x 6 = 192-pixel tiles: enough for a Retina display with the frame
// scaled up to fit a large window.
const BAKE_SCALE = 6
const PX = TILE * BAKE_SCALE
const COLS = 10
const ELEVATION = (38 * Math.PI) / 180 // camera tilt above the ground plane
const TARGET_Y = 5 // world height that lands on the tile center
const BAKE_SLICE_MS = 8

export type Profile = 'classic' | 'x'

export const FRAMES = {
  segment: 8,
  crystal: 16,
  scobster: 6,
  flick: 4,
  gecko: 6,
  ufo: 8,
  coin: 8,
} as const

export interface SpriteAtlas {
  canvas: HTMLCanvasElement
  tiles: Map<string, { x: number; y: number }>
}

type Opts = {
  rough?: number
  metal?: number
  emissive?: number
  glow?: number
  flat?: boolean
  clearcoat?: number
  opacity?: number
}

function material(color: number, o: Opts = {}): THREE.Material {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: o.rough ?? 0.38,
    metalness: o.metal ?? 0,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.glow ?? 1,
    flatShading: o.flat ?? false,
    clearcoat: o.clearcoat ?? 0.35,
    clearcoatRoughness: 0.3,
    transparent: o.opacity !== undefined,
    opacity: o.opacity ?? 1,
  })
}

type V3 = [number, number, number]

function ball(r: number, color: number, pos: V3, scale: V3 = [1, 1, 1], o: Opts = {}): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), material(color, o))
  m.position.set(...pos)
  m.scale.set(...scale)
  return m
}

function rod(rTop: number, rBottom: number, h: number, color: number, pos: V3, o: Opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 18), material(color, o))
  m.position.set(...pos)
  return m
}

// A limb from a to b.
function limb(a: V3, b: V3, r: number, color: number, o: Opts = {}): THREE.Mesh {
  const va = new THREE.Vector3(...a)
  const vb = new THREE.Vector3(...b)
  const len = va.distanceTo(vb)
  const m = new THREE.Mesh(
    new THREE.CapsuleGeometry(r, Math.max(0.01, len), 6, 10),
    material(color, o)
  )
  m.position.copy(va).add(vb).multiplyScalar(0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize())
  return m
}

function eye(x: number, y: number, z: number, r = 1.7): THREE.Object3D[] {
  return [
    ball(r, 0xffffff, [x, y, z], [1, 1, 1], { rough: 0.15 }),
    ball(r * 0.5, 0x0b0b12, [x, y + r * 0.05, z + r * 0.72], [1, 1, 1], { rough: 0.1 }),
  ]
}

// ---------------------------------------------------------------- models

const MUSH = {
  classic: { cap: 0xd1164f, poison: 0xf07a12, stem: 0xe8cf86 },
  x: { cap: 0x2463c9, poison: 0xe2601c, stem: 0xbdd0e2 },
} as const

const STEM_H = 8.2
const CAP_R = 4.7

function mushroom(
  profile: Profile,
  poisoned: boolean,
  hp: number,
  reflective: boolean
): THREE.Object3D[] {
  const c = MUSH[profile]
  // Damage eats the cap down: 4 hp is whole, 1 hp is a stub.
  const size = 0.55 + 0.15 * Math.max(1, Math.min(4, hp))
  const capColor = reflective ? 0xe9eef5 : poisoned ? c.poison : c.cap
  const capOpts: Opts = reflective
    ? { metal: 1, rough: 0.08, clearcoat: 1 }
    : { rough: 0.3, clearcoat: 0.9 }
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(CAP_R * size, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    material(capColor, capOpts)
  )
  cap.position.set(0, STEM_H, 0)
  cap.scale.set(1, 0.85, 1)
  const gills = new THREE.Mesh(
    new THREE.CircleGeometry(CAP_R * size - 0.1, 28),
    material(reflective ? 0x6f7782 : 0x3a1420, { rough: 0.9, clearcoat: 0 })
  )
  gills.rotation.x = Math.PI / 2
  gills.position.set(0, STEM_H - 0.02, 0)
  const parts: THREE.Object3D[] = [
    rod(1.6, 2.4, STEM_H, reflective ? 0xb9c2cc : c.stem, [0, STEM_H / 2, 0], {
      rough: 0.6,
      clearcoat: 0.1,
    }),
    gills,
    cap,
  ]
  if (poisoned && !reflective) {
    // Dark spots: poison must not depend on telling two cap colors apart.
    for (const [a, e] of [
      [0.2, 0.55],
      [1.5, 0.75],
      [-1.1, 0.7],
      [2.9, 0.5],
      [-2.4, 0.45],
    ]) {
      const r = CAP_R * size
      const x = r * Math.sin(e) * Math.sin(a)
      const z = r * Math.sin(e) * Math.cos(a)
      const y = STEM_H + r * 0.85 * Math.cos(e)
      parts.push(ball(0.95 * size, 0x2a0d06, [x, y, z], [1, 0.5, 1], { rough: 0.5 }))
    }
  }
  return parts
}

const SEG = {
  classic: { body: 0x5b2fc4, head: 0xd92b22 },
  x: { body: 0x3f9a2c, head: 0xe2670f },
} as const

function segment(profile: Profile, head: boolean, frame: number): THREE.Object3D[] {
  const phase = (frame / FRAMES.segment) * Math.PI * 2
  const swing = Math.sin(phase)
  const bob = Math.abs(Math.cos(phase)) * 0.35
  const color = head ? SEG[profile].head : SEG[profile].body
  const parts: THREE.Object3D[] = [
    ball(5.7, color, [0, 6 + bob, 0], [1, 0.86, 1], { rough: 0.22, clearcoat: 1 }),
  ]
  // Cheech wears sneakers.
  for (const side of [-1, 1]) {
    const s = swing * side
    const x = side * 3.3 + s * 1.2
    const y = 1.1 + Math.max(0, s) * 1.1
    parts.push(ball(1.9, 0x1b1b22, [x, y, 2.6], [1, 0.7, 1.35], { rough: 0.5 }))
    parts.push(ball(1.0, 0xffffff, [x, y + 0.75, 3.4], [1, 0.5, 1], { rough: 0.3 }))
  }
  if (head) {
    parts.push(...eye(-2.1, 7.6 + bob, 4.0), ...eye(2.1, 7.6 + bob, 4.0))
    parts.push(ball(1.0, 0x7a1010, [0, 4.6 + bob, 5.2], [1.6, 0.5, 0.6], { rough: 0.4 }))
    for (const side of [-1, 1]) {
      parts.push(limb([side * 1.6, 10 + bob, 0], [side * 3.2, 14 + bob, 0.5], 0.35, 0x2a1418))
      parts.push(
        ball(0.95, 0xffc25a, [side * 3.2, 14.3 + bob, 0.5], [1, 1, 1], {
          emissive: 0xff8a1a,
          glow: 0.6,
        })
      )
    }
  }
  return parts
}

// The player: an upright crystal shard, a tall six-sided point over a short one,
// flat-shaded so each facet catches the light differently as it turns.
function crystal(frame: number): THREE.Object3D[] {
  const gem = new THREE.Group()
  const gemMat = () =>
    material(0x25b9f2, {
      rough: 0.03,
      metal: 0,
      flat: true,
      emissive: 0x06405e,
      glow: 0.5,
      clearcoat: 1,
    })
  const upper = new THREE.Mesh(new THREE.ConeGeometry(5.6, 10.5, 6), gemMat())
  upper.position.y = 5.25
  const lower = new THREE.Mesh(new THREE.ConeGeometry(5.6, 5, 6), gemMat())
  lower.rotation.x = Math.PI
  lower.position.y = -2.5
  gem.add(upper, lower)
  gem.position.y = 5.6
  // Six-fold symmetry: a sixth of a turn across the frames loops seamlessly.
  gem.rotation.y = (frame / FRAMES.crystal) * (Math.PI / 3)
  return [
    gem,
    // The plasma emitter glows at the tip.
    ball(1.15, 0xffc46e, [0, 16.4, 0], [1, 1, 1], { emissive: 0xff8a1a, glow: 2.0 }),
  ]
}

// Larry the Scobster: part scorpion, part lobster. Claws snap.
function scobster(frame: number): THREE.Object3D[] {
  const snap = 0.5 + 0.5 * Math.sin((frame / FRAMES.scobster) * Math.PI * 2)
  const shell = 0x3f9a22
  const dark = 0x1f5a1c
  const parts: THREE.Object3D[] = [
    ball(5.2, shell, [0, 5.2, 0], [1.35, 0.72, 1], { rough: 0.25, clearcoat: 1 }),
    ball(2.6, dark, [0, 6.4, -4.6], [1, 0.8, 1], { rough: 0.3 }),
    ball(2.0, dark, [0, 9.0, -6.2], [1, 0.9, 1], { rough: 0.3 }),
    ball(1.5, 0xd8492e, [0, 11.2, -5.0], [1, 1, 1], { rough: 0.25 }), // stinger
  ]
  for (const side of [-1, 1]) {
    // Eye stalks
    parts.push(limb([side * 2.0, 7.4, 3.4], [side * 2.4, 9.6, 4.0], 0.35, dark))
    parts.push(...eye(side * 2.4, 10.2, 4.2, 1.35))
    // Arm and two-part claw
    const elbow: V3 = [side * 8.2, 5.2, 2.2]
    const hand: V3 = [side * 9.6, 6.6, 5.6]
    parts.push(limb([side * 5.6, 5.0, 1.2], elbow, 0.75, dark))
    parts.push(limb(elbow, hand, 0.75, dark))
    const open = 1.3 * snap
    parts.push(
      ball(2.3, shell, [hand[0], hand[1] + open, hand[2] + 1.4], [1, 0.6, 1.4], { rough: 0.25 })
    )
    parts.push(
      ball(1.9, shell, [hand[0], hand[1] - open * 0.6, hand[2] + 1.4], [1, 0.5, 1.3], {
        rough: 0.25,
      })
    )
    // Legs
    for (let i = 0; i < 3; i++) {
      const z = 2.6 - i * 2.4
      const lift = Math.sin((frame / FRAMES.scobster) * Math.PI * 2 + i * 2.1) * 0.6
      parts.push(
        limb([side * 5.4, 4.2, z], [side * 8.0, 0.6 + Math.max(0, lift), z + 0.6], 0.45, dark)
      )
    }
  }
  return parts
}

// Groucho the Flick: a round flea with the glasses, brows and mustache.
function flick(frame: number): THREE.Object3D[] {
  const kick = Math.sin((frame / FRAMES.flick) * Math.PI * 2)
  const body = 0x2456c8
  const parts: THREE.Object3D[] = [
    ball(5.0, body, [0, 7.2, 0], [0.92, 1.12, 0.92], { rough: 0.25, clearcoat: 1 }),
    ball(1.5, 0xf0b9a0, [0, 7.0, 4.8], [1, 1.1, 1.2], { rough: 0.5 }), // nose
    ball(1.2, 0x15151b, [0, 5.3, 4.6], [2.3, 0.6, 0.8], { rough: 0.8, clearcoat: 0 }), // mustache
    ...eye(-1.9, 9.0, 3.6, 1.5),
    ...eye(1.9, 9.0, 3.6, 1.5),
  ]
  for (const side of [-1, 1]) {
    parts.push(
      ball(0.6, 0x15151b, [side * 1.9, 11.0, 3.9], [2.2, 0.6, 0.7], { rough: 0.8, clearcoat: 0 })
    ) // brow
    parts.push(limb([side * 0.9, 12.4, 0], [side * 2.4, 15.0, 0.6], 0.3, 0x23324f)) // antenna
    for (let i = 0; i < 2; i++) {
      const z = 1.5 - i * 2.6
      const k = kick * (i === 0 ? 1 : -1) * side
      parts.push(limb([side * 3.6, 4.4, z], [side * (5.6 + k * 0.8), 0.7, z + 0.8], 0.5, 0x23324f))
    }
  }
  return parts
}

// Gordon the Gecko, facing +x. The renderer mirrors him when he runs left.
function gecko(frame: number): THREE.Object3D[] {
  const t = (frame / FRAMES.gecko) * Math.PI * 2
  const sway = Math.sin(t)
  const skin = 0x2fae3c
  const belly = 0xb7dc5c
  const parts: THREE.Object3D[] = [
    ball(3.6, skin, [0, 3.6, 0], [2.0, 0.78, 1.05], { rough: 0.28, clearcoat: 1 }),
    ball(3.3, belly, [0.4, 2.9, 0], [1.8, 0.6, 0.95], { rough: 0.5 }),
    ball(3.3, skin, [8.0, 4.6, 0], [1.15, 0.85, 1], { rough: 0.28, clearcoat: 1 }),
    ...eye(9.0, 6.6, 2.0, 1.25),
    ...eye(9.0, 6.6, -2.0, 1.25),
  ]
  // Tail: tapering chain that sways.
  for (let i = 0; i < 5; i++) {
    const x = -7 - i * 2.2
    const z = Math.sin(t + i * 0.8) * (0.5 + i * 0.45)
    parts.push(ball(2.3 - i * 0.38, skin, [x, 3.0 - i * 0.25, z], [1.15, 0.8, 1], { rough: 0.3 }))
  }
  // Four legs, diagonal pairs step together.
  for (const [x, side, ph] of [
    [4.2, 1, 1],
    [4.2, -1, -1],
    [-4.2, 1, -1],
    [-4.2, -1, 1],
  ] as const) {
    const step = sway * ph
    const foot: V3 = [x + step * 1.6, 0.5 + Math.max(0, step) * 0.6, side * 6.2]
    parts.push(limb([x, 3.0, side * 2.6], foot, 0.6, skin))
    parts.push(ball(1.1, belly, foot, [1.3, 0.5, 1.1], { rough: 0.4 }))
  }
  return parts
}

function ufo(frame: number): THREE.Object3D[] {
  const profile = [
    [0, 0],
    [7, 0.3],
    [12, 1.8],
    [12.4, 2.5],
    [11.4, 3.2],
    [6, 4.2],
    [0, 4.4],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const hull = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 40),
    material(0xb4c0d6, { metal: 0.85, rough: 0.25, clearcoat: 1 })
  )
  hull.position.y = 3
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(5.2, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    material(0x8fe4ff, { rough: 0.05, opacity: 0.38, clearcoat: 1 })
  )
  dome.position.y = 7.0
  const parts: THREE.Object3D[] = [
    hull,
    ball(2.5, 0x58c23a, [0, 8.6, 0], [1, 1.15, 1], { rough: 0.3 }), // the pilot
    ...eye(0, 9.6, 1.9, 1.5),
    dome,
  ]
  // Running lights around the rim.
  const lights = 10
  for (let i = 0; i < lights; i++) {
    const a = (i / lights) * Math.PI * 2
    const on = (i + frame) % 4 === 0
    const hue = on ? 0xfff2a8 : [0xff3b2a, 0x1fb8ff, 0x49e02a][i % 3]
    parts.push(
      ball(1.15, hue, [Math.cos(a) * 11.6, 5.7, Math.sin(a) * 11.6], [1, 1, 1], {
        emissive: hue,
        glow: on ? 2.4 : 0.7,
      })
    )
  }
  return parts
}

// How far a Yummy coin is turned away from the camera on each frame (radians).
export function coinAngle(frame: number): number {
  return Math.sin((frame / FRAMES.coin) * Math.PI * 2) * 0.62
}

function coin(frame: number): THREE.Object3D[] {
  const face = new THREE.Group()
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(5.6, 5.6, 1.3, 40),
    material(0xf6c343, { metal: 1, rough: 0.18, clearcoat: 1 })
  )
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(5.6, 0.65, 12, 40),
    material(0xb9831f, { metal: 1, rough: 0.25 })
  )
  rim.rotation.x = Math.PI / 2
  face.add(disc, rim)
  // Stand the coin up so its face points at the camera, then wobble it.
  face.rotation.x = Math.PI / 2 - ELEVATION
  const spin = new THREE.Group()
  spin.add(face)
  spin.rotation.y = coinAngle(frame)
  spin.position.y = TARGET_Y
  return [spin]
}

// ---------------------------------------------------------------- baking

function canBake(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof WebGL2RenderingContext !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined'
  )
}

// Starts baking and returns the atlas straight away, or null where WebGL is not
// available (tests, very old browsers). Tiles appear in the atlas a few at a
// time over the next frames so boot is never blocked; until a tile exists
// drawTile returns false and the caller draws the 2D procedural sprite instead.
let shared: SpriteAtlas | null = null

// The atlas if a bake has been started, for UI that wants the same sprites.
export function getSharedAtlas(): SpriteAtlas | null {
  return shared
}

export function bakeSprites(): SpriteAtlas | null {
  if (shared) return shared
  if (!canBake()) return null
  let renderer: THREE.WebGLRenderer | null = null
  const release = () => {
    try {
      renderer?.dispose()
      renderer?.forceContextLoss()
    } catch {}
    renderer = null
  }
  try {
    const glCanvas = document.createElement('canvas')
    renderer = new THREE.WebGLRenderer({
      canvas: glCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    })
    renderer.setPixelRatio(1)
    renderer.setSize(PX, PX, false)
    renderer.setClearColor(0x000000, 0)
    // Neutral tone mapping keeps the saturated toy colors; ACES washed them out.
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.toneMappingExposure = 1.0

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = envTarget.texture
    scene.environmentIntensity = 0.42
    const key = new THREE.DirectionalLight(0xfff4e0, 2.0)
    key.position.set(-14, 30, 22)
    const rim = new THREE.DirectionalLight(0x9fd0ff, 0.9)
    rim.position.set(18, 14, -24)
    scene.add(key, rim)

    const half = TILE / 2
    const camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 400)
    camera.position.set(0, TARGET_Y + Math.sin(ELEVATION) * 120, Math.cos(ELEVATION) * 120)
    camera.lookAt(0, TARGET_Y, 0)

    // Order matters: what is on screen first (wave 1, classic) is baked first.
    const jobs: [string, () => THREE.Object3D[]][] = []
    for (let f = 0; f < FRAMES.crystal; f++) jobs.push([`crystal:${f}`, () => crystal(f)])
    for (const profile of ['classic', 'x'] as const) {
      for (const poisoned of [false, true]) {
        for (let hp = 4; hp >= 1; hp--) {
          jobs.push([
            `mush:${profile}:${poisoned ? 1 : 0}:${hp}`,
            () => mushroom(profile, poisoned, hp, false),
          ])
        }
      }
      for (let f = 0; f < FRAMES.segment; f++) {
        jobs.push([`seg:${profile}:b:${f}`, () => segment(profile, false, f)])
        jobs.push([`seg:${profile}:h:${f}`, () => segment(profile, true, f)])
      }
    }
    for (let f = 0; f < FRAMES.scobster; f++) jobs.push([`scobster:${f}`, () => scobster(f)])
    for (let f = 0; f < FRAMES.flick; f++) jobs.push([`flick:${f}`, () => flick(f)])
    for (let f = 0; f < FRAMES.gecko; f++) jobs.push([`gecko:${f}`, () => gecko(f)])
    for (let f = 0; f < FRAMES.ufo; f++) jobs.push([`ufo:${f}`, () => ufo(f)])
    for (let f = 0; f < FRAMES.coin; f++) jobs.push([`coin:${f}`, () => coin(f)])
    jobs.push(['mush:reflective', () => mushroom('classic', false, 4, true)])

    const atlas = document.createElement('canvas')
    atlas.width = COLS * PX
    atlas.height = Math.ceil(jobs.length / COLS) * PX
    const ctx = atlas.getContext('2d')
    if (!ctx) {
      release()
      return null
    }
    const tiles = new Map<string, { x: number; y: number }>()
    const group = new THREE.Group()
    scene.add(group)

    // Where the ground point under the model lands inside a tile.
    const groundY = (half + TARGET_Y * Math.cos(ELEVATION)) * BAKE_SCALE

    const bakeOne = (i: number) => {
      const [name, build] = jobs[i]
      const x = (i % COLS) * PX
      const y = Math.floor(i / COLS) * PX
      for (const child of [...group.children]) {
        group.remove(child)
        child.traverse((o) => {
          const mesh = o as THREE.Mesh
          mesh.geometry?.dispose()
          const m = mesh.material as THREE.Material | undefined
          m?.dispose()
        })
      }
      for (const part of build()) group.add(part)

      // Soft contact shadow, drawn under the render. The saucer flies: no shadow.
      if (!name.startsWith('ufo') && !name.startsWith('coin')) {
        const wide = name.startsWith('gecko') || name.startsWith('scobster') ? 11 : 7
        ctx.save()
        ctx.translate(x + PX / 2, y + groundY)
        ctx.scale(1, Math.sin(ELEVATION))
        const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, wide * BAKE_SCALE)
        shadow.addColorStop(0, 'rgba(0,0,0,0.42)')
        shadow.addColorStop(0.6, 'rgba(0,0,0,0.2)')
        shadow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = shadow
        ctx.beginPath()
        ctx.arc(0, 0, wide * BAKE_SCALE, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      renderer?.render(scene, camera)
      ctx.drawImage(glCanvas, x, y)
      tiles.set(name, { x, y })
    }

    // A slice of work per timer tick, capped by time so slow GPUs stay responsive.
    let next = 0
    const step = () => {
      try {
        const started = performance.now()
        while (next < jobs.length && performance.now() - started < BAKE_SLICE_MS) bakeOne(next++)
        if (next < jobs.length) {
          setTimeout(step, 0)
          return
        }
      } catch {
        // Keep whatever baked; the rest falls back to 2D sprites.
      }
      envTarget.dispose()
      pmrem.dispose()
      release()
    }
    setTimeout(step, 0)
    shared = { canvas: atlas, tiles }
    return shared
  } catch {
    release()
    return null
  }
}

// Draws one tile centered on (cx, cy) in logical pixels. Returns false if the
// tile is missing so the caller can fall back.
export function drawTile(
  g: CanvasRenderingContext2D,
  atlas: SpriteAtlas,
  name: string,
  cx: number,
  cy: number,
  scale = 1,
  flipX = false
): boolean {
  const tile = atlas.tiles.get(name)
  if (!tile) return false
  const size = TILE * scale
  if (flipX) {
    g.save()
    g.translate(cx, cy)
    g.scale(-1, 1)
    g.drawImage(atlas.canvas, tile.x, tile.y, PX, PX, -size / 2, -size / 2, size, size)
    g.restore()
  } else {
    g.drawImage(atlas.canvas, tile.x, tile.y, PX, PX, cx - size / 2, cy - size / 2, size, size)
  }
  return true
}
