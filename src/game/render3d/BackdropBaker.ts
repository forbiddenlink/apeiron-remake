// Relights the flat backdrop textures as terrain.
//
// Each theme texture becomes the color map of a ground plane with a procedural
// height map, lit by a low sun and rendered once, top-down. The result is a
// still image the game draws exactly like the flat one: no 3D at play time.
import * as THREE from 'three'

const OUT = 1184 // 2x the 592-pixel field, for Retina

// Soft rolling height field with fine grain: stacked, smoothed random layers.
function heightMap(size: number): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = size
  out.height = size
  const g = out.getContext('2d')
  if (!g) return out
  g.fillStyle = '#808080'
  g.fillRect(0, 0, size, size)
  // Deterministic generator so every boot bakes the same ground.
  let seed = 0x9e3779b9
  const rnd = () => {
    seed = (Math.imul(seed ^ (seed >>> 15), 1 | seed) + 0x6d2b79f5) | 0
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296
  }
  const layers: [number, number][] = [
    [6, 0.55],
    [14, 0.4],
    [40, 0.28],
    [128, 0.16],
  ]
  for (const [cells, alpha] of layers) {
    const layer = document.createElement('canvas')
    layer.width = cells
    layer.height = cells
    const l = layer.getContext('2d')
    if (!l) continue
    const img = l.createImageData(cells, cells)
    for (let i = 0; i < cells * cells; i++) {
      const v = Math.floor(rnd() * 255)
      img.data[i * 4] = v
      img.data[i * 4 + 1] = v
      img.data[i * 4 + 2] = v
      img.data[i * 4 + 3] = 255
    }
    l.putImageData(img, 0, 0)
    g.globalAlpha = alpha
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    g.drawImage(layer, 0, 0, size, size)
  }
  g.globalAlpha = 1
  return out
}

// Relights each source canvas in turn, a few milliseconds of work per timer
// tick, and hands each result to onReady. Does nothing where WebGL is missing.
export function bakeBackdrops(
  sources: { key: string; canvas: HTMLCanvasElement }[],
  onReady: (key: string, lit: HTMLCanvasElement) => void
): void {
  if (typeof document === 'undefined' || typeof WebGL2RenderingContext === 'undefined') return
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
      antialias: false,
      preserveDrawingBuffer: true,
    })
    renderer.setPixelRatio(1)
    renderer.setSize(OUT, OUT, false)
    renderer.toneMapping = THREE.NoToneMapping

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.set(0, 0, 5)
    camera.lookAt(0, 0, 0)

    // Sun from the upper left, matching the highlights on the characters.
    const sun = new THREE.DirectionalLight(0xfff1d6, 3.0)
    sun.position.set(-1.1, 1.3, 1.7)
    scene.add(sun, new THREE.AmbientLight(0xbfd4ff, 0.75))

    const bump = new THREE.CanvasTexture(heightMap(512))
    bump.wrapS = THREE.RepeatWrapping
    bump.wrapT = THREE.RepeatWrapping
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.92,
      metalness: 0,
      bumpMap: bump,
      bumpScale: 9,
    })
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material))

    let next = 0
    const step = () => {
      try {
        if (next < sources.length && renderer) {
          const { key, canvas } = sources[next++]
          const map = new THREE.CanvasTexture(canvas)
          map.colorSpace = THREE.SRGBColorSpace
          material.map = map
          material.needsUpdate = true
          renderer.render(scene, camera)
          const lit = document.createElement('canvas')
          lit.width = OUT
          lit.height = OUT
          lit.getContext('2d')?.drawImage(glCanvas, 0, 0)
          map.dispose()
          onReady(key, lit)
          setTimeout(step, 0)
          return
        }
      } catch {
        // Keep the flat backdrops for anything that did not bake.
      }
      bump.dispose()
      material.dispose()
      release()
    }
    setTimeout(step, 0)
  } catch {
    release()
  }
}
