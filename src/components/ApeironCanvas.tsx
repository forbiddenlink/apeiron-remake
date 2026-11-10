import { useEffect, useRef } from 'react'
import { Engine, type EngineSnapshot } from '../game/Engine'
import { sparticleEffects } from '../game/SparticleEffects'
import type { GameSettings } from '../settings'

interface ApeironCanvasProps {
  width: number
  height: number
  settings: GameSettings
  // Device pixels per logical game pixel (devicePixelRatio times the frame scale).
  pixelRatio: number
  // True while a menu panel is open and owns the keyboard.
  uiBlocked: boolean
  onSnapshot: (state: EngineSnapshot) => void
  onEngine: (engine: Engine | null) => void
}

export function ApeironCanvas({
  width,
  height,
  settings,
  pixelRatio,
  uiBlocked,
  onSnapshot,
  onEngine,
}: ApeironCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const ref = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<Engine | null>(null)
  const levelRef = useRef(1)
  // Latest callbacks and settings without re-creating the engine.
  const onSnapshotRef = useRef(onSnapshot)
  onSnapshotRef.current = onSnapshot
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const pixelRatioRef = useRef(pixelRatio)
  pixelRatioRef.current = pixelRatio

  // Sparticle background effects (Apeiron X only)
  useEffect(() => {
    if (!containerRef.current) return
    sparticleEffects.attach(containerRef.current)
    sparticleEffects.setIntensity(settingsRef.current.particleDensity)
    sparticleEffects.setEnabled(settingsRef.current.gameMode !== 'classic')
    return () => sparticleEffects.detach()
  }, [])

  useEffect(() => {
    sparticleEffects.setIntensity(settings.particleDensity)
    sparticleEffects.setEnabled(settings.gameMode !== 'classic')
  }, [settings.particleDensity, settings.gameMode])

  // Engine lifetime
  // biome-ignore lint/correctness/useExhaustiveDependencies: the engine is rebuilt only if the frame size changes
  useEffect(() => {
    if (!ref.current) return
    const engine = new Engine(ref.current, width, height)
    engineRef.current = engine
    // Test seam: headless visual-regression / playtest harness drives the
    // engine directly (see tools/). No-op in normal runs unless the harness
    // set window.__APEIRON_TEST__ via addInitScript before boot.
    if ((window as unknown as { __APEIRON_TEST__?: boolean }).__APEIRON_TEST__) {
      ;(window as unknown as { __apeironEngine?: Engine }).__apeironEngine = engine
    }

    engine.onStateChange = (state) => {
      if (state.level !== levelRef.current) {
        levelRef.current = state.level
        sparticleEffects.setThemeFromWave(state.level)
      }
      onSnapshotRef.current(state)
    }
    engine.updateSettings(settingsRef.current)
    engine.setPixelRatio(pixelRatioRef.current)
    onEngine(engine)
    onSnapshotRef.current({
      mode: engine.mode,
      score: engine.score,
      highScore: engine.highScore,
      level: engine.level,
      seed: engine.seed,
      cheated: engine.cheated,
      stats: engine.stats,
    })

    engine.start()
    return () => {
      engine.destroy()
      engineRef.current = null
      onEngine(null)
    }
  }, [width, height])

  useEffect(() => {
    engineRef.current?.updateSettings(settings)
  }, [settings])

  useEffect(() => {
    engineRef.current?.setPixelRatio(pixelRatio)
  }, [pixelRatio])

  useEffect(() => {
    engineRef.current?.setUiBlocked(uiBlocked)
  }, [uiBlocked])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={ref}
        width={width}
        height={height}
        aria-label="Apeiron playfield"
        style={{
          display: 'block',
          width,
          height,
          background: '#101010',
          border: 'none',
          boxShadow: 'none',
          position: 'relative',
          zIndex: 1,
          touchAction: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  )
}
