// Just enough browser for Engine to run under Vitest's node environment: a
// canvas whose 2D context swallows every call, no-op event targets, and an
// in-memory localStorage. Nothing is drawn; tests read engine state only.

function fakeContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop() {} }
  const target: Record<string | symbol, unknown> = {}
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop]
      if (prop === 'createImageData' || prop === 'getImageData') {
        return (...args: number[]) => {
          const w = Math.max(1, Math.floor(args.length >= 4 ? args[2] : args[0]))
          const h = Math.max(1, Math.floor(args.length >= 4 ? args[3] : args[1]))
          return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }
        }
      }
      if (
        prop === 'createLinearGradient' ||
        prop === 'createRadialGradient' ||
        prop === 'createConicGradient' ||
        prop === 'createPattern'
      ) {
        return () => gradient
      }
      if (prop === 'measureText') return () => ({ width: 0 })
      return () => undefined
    },
    set(t, prop, value) {
      t[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

export function fakeCanvas(width = 800, height = 592): HTMLCanvasElement {
  const ctx = fakeContext()
  return {
    width,
    height,
    style: {},
    getContext: () => ctx,
    addEventListener() {},
    removeEventListener() {},
    setPointerCapture() {},
    hasPointerCapture: () => false,
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height, right: width, bottom: height }),
  } as unknown as HTMLCanvasElement
}

export function installFakeDom(options: { testHarness?: boolean } = {}): void {
  const store = new Map<string, string>()
  const g = globalThis as Record<string, unknown>
  g.window = {
    devicePixelRatio: 1,
    __APEIRON_TEST__: options.testHarness ? true : undefined,
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: false }),
  }
  g.document = {
    visibilityState: 'visible',
    createElement: () => fakeCanvas(),
    addEventListener() {},
    removeEventListener() {},
  }
  g.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  }
  g.requestAnimationFrame = () => 1
  g.cancelAnimationFrame = () => {}
}
