# Apeiron Remake — Architecture Contract

Snapshot as of 2026-08-02. This is the agent/contributor contract: subsystem
ownership boundaries and the shared vocabulary. Keep it a frozen destination —
when it disagrees with the code, the code wins and this gets flagged, not
silently trusted (see the docs-rot discipline).

## Design invariants (do not break)

1. **Deterministic fixed-timestep.** `Engine.tick(dt)` runs at a fixed `1/60`
   step (`Engine.loop` accumulator). Gameplay logic must be a pure function of
   (previous state, seeded RNG, input) — no wall-clock reads inside `tick`.
2. **Seeded randomness.** Gameplay randomness goes through `makeRng` / the
   engine's `this.rand`. `Math.random()` is tolerated only in non-gameplay
   cosmetic paths, and the headless harness overrides it globally so captures
   stay bit-identical (see `tools/`).
3. **All assets procedural.** No image or audio files — sprites come from
   `ProceduralSprites`, audio from `AudioSynth`/`MusicSynth`.

## Subsystems & ownership

| Subsystem | Files | Owns |
|-----------|-------|------|
| Orchestrator | `Engine.ts` | game loop, mode state machine, scoring, spawn scheduling, collision dispatch |
| Field | `Grid.ts` | mushroom grid, cell occupancy, reflective/psychedelic flags |
| Player | `Player.ts` | movement state, bullets, power-up effects, ADS/fire cadence |
| Centipede | `Centipede.ts` | segment chain, descent, splitting, touchdown |
| Enemies | `Enemies.ts` | Spider (chase), Flea (mushroom drop), Scorpion (poison) |
| UFO | `UFO.ts` | bonus UFO behavior |
| Power-ups | `PowerUp.ts` | yummy lifecycle, fall, collect/miss |
| Render | `ProceduralSprites.ts`, `BackgroundEffects.ts` | 2D canvas draw of every entity + backdrop |
| FX | `ParticleSystem.ts`, `SparticleEffects.ts` | impact/trail/explosion particles, DOM overlay |
| Audio | `AudioSynth.ts`, `AudioManager.ts`, `MusicSynth.ts`, `MusicManager.ts` | synthesized SFX + music |
| Input | `MouseInput.ts`, engine key set | mouse-first + keyboard-fallback intent |
| Config | `GameConfig.ts`, `Constants.ts`, `GameMode.ts`, `ConfigManager.ts` | tuning, classic/enhanced rules, weapons |
| Rules | `LifeRules.ts` | extra-life thresholds, life accounting |

## Cross-subsystem vocabulary

- **score events** — only `Engine.addScore` mutates `score`; combo/chain
  multipliers live in `Engine.updateScoring`.
- **life events** — `Engine.loseLife` is the single sink; extra-life awards go
  through `LifeRules` / `nextExtraLife`.
- **spawn events** — enemy spawns are timer-driven in `Engine` using seeded
  `randRange`; entities never self-spawn.
- **touchdown** — `Centipede.consumeTouchdown()` is drained each tick by the
  engine, which applies `getTouchdownRules(mode)`.

## Test seam

`ApeironCanvas` exposes `window.__apeironEngine` only when
`window.__APEIRON_TEST__` is set (the headless harness sets it via
`addInitScript` before boot). No effect on normal runs.

See `tools/README.md` for the reproducibility + profiling harness.
