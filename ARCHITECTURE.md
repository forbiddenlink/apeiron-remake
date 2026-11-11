# Apeiron Remake — Architecture Contract

Snapshot as of 2026-11-10. This is the agent/contributor contract: subsystem
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
3. **All assets procedural.** No image or audio files in the game — sprites come
   from `ProceduralSprites`, audio from `AudioSynth`/`Music`. The sidebar logo is
   drawn in code. (`public/` still holds the favicon and social card.)
4. **One hit, one life.** `Engine.loseLife` starts a shatter freeze; nothing can
   hit again until the freeze and the post-respawn invulnerable window are over.
5. **Per-run seed.** `Engine.seed` is random in normal play and fixed under the
   harness. Everything in a run derives from it.

## Subsystems & ownership

| Subsystem    | Files                                                                                           | Owns                                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orchestrator | `Engine.ts`                                                                                     | game loop, mode state machine, scoring, spawn scheduling, collision dispatch                                                                             |
| Field        | `Grid.ts`                                                                                       | mushroom grid, cell occupancy, reflective/psychedelic flags                                                                                              |
| Player       | `Player.ts`                                                                                     | movement state, bullets, power-up effects, ADS/fire cadence                                                                                              |
| Centipede    | `Centipede.ts`                                                                                  | segment chain, descent, splitting, touchdown                                                                                                             |
| Enemies      | `Enemies.ts`                                                                                    | Spider = Larry the Scobster (chase, proximity score), Flea (mushroom drop), Gecko (poison)                                                               |
| UFO          | `UFO.ts`                                                                                        | bonus UFO behavior                                                                                                                                       |
| Power-ups    | `PowerUp.ts`                                                                                    | yummy lifecycle, fall, collect/miss                                                                                                                      |
| Render       | `ProceduralSprites.ts`, `BackgroundEffects.ts`, `SidebarRenderer.ts`, `render3d/SpriteBaker.ts` | 2D canvas draw of every entity, backdrop and the score panel. Characters are 3D models baked to a sprite atlas at boot, with the 2D drawings as fallback |
| FX           | `ParticleSystem.ts`, `SparticleEffects.ts`                                                      | impact/trail/explosion particles, DOM overlay                                                                                                            |
| Audio        | `AudioSynth.ts`, `Music.ts`                                                                     | synthesized SFX (one master gain) + step-sequenced music                                                                                                 |
| Input        | `MouseInput.ts`, engine key set, `Cheats.ts`                                                    | pointer-first (mouse, touch, pen, optional pointer lock) + keyboard and gamepad (`Gamepad.ts`); cheat words while paused                                 |
| Config       | `GameConfig.ts`, `Constants.ts`, `GameMode.ts`, `ConfigManager.ts`                              | tuning, classic/enhanced rules, weapons                                                                                                                  |
| Rules        | `LifeRules.ts`                                                                                  | extra-life thresholds, life accounting                                                                                                                   |
| Meta         | `HighScores.ts`, `RunStats.ts`, `src/settings.ts`                                               | top-10 table, daily seed, per-run counters, saved options                                                                                                |
| UI           | `App.tsx`, `components/Menu.tsx`, `components/Options.tsx`, `components/panels/`                | menus and panels; one overlay at a time, and the engine ignores keys while one is open (`Engine.setUiBlocked`)                                           |

## Cross-subsystem vocabulary

- **score events** — only `Engine.addScore` mutates `score`; combo/chain
  multipliers live in `Engine.updateScoring`.
- **life events** — `Engine.loseLife` is the single sink and `Engine.finishDeath`
  the single respawn/game-over point; extra-life awards go through `LifeRules` /
  `nextExtraLife`.
- **spawn events** — enemy spawns are timer-driven in `Engine` using seeded
  `randRange`; entities never self-spawn.
- **touchdown** — `Centipede.consumeTouchdown()` is drained each tick by the
  engine, which applies `getTouchdownRules(mode)`.

## Test seam

`ApeironCanvas` exposes `window.__apeironEngine` only when
`window.__APEIRON_TEST__` is set (the headless harness sets it via
`addInitScript` before boot). No effect on normal runs.

See `tools/README.md` for the reproducibility + profiling harness.
