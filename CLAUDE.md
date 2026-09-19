# apeiron-remake

A remake of the arcade game Apeiron (Centipede-style) built with React + Vite. All
assets are procedural: no image or audio files - sprites come from
`ProceduralSprites`, audio from `AudioSynth`/`MusicSynth`. Deterministic fixed-timestep
engine (`Engine.tick(dt)` at a fixed 1/60 step) so a seeded run renders bit-identical
pixels, which backs a real pixel-diff regression gate. Repo:
github.com/forbiddenlink/apeiron-remake.

See `ARCHITECTURE.md` for the full design-invariant contract and subsystem ownership
table (frozen destination doc: code wins on disagreement, doc gets flagged not
trusted). See `tools/README.md` for the headless reproducibility/profiling harness in
full detail; this file only summarizes both.

## Stack

- React 19 + Vite, TypeScript, `type: module`
- Rendering: 2D canvas (`ProceduralSprites.ts`, `BackgroundEffects.ts`), `sparticles`
  for particle FX, `howler` for audio (alongside the custom `AudioSynth`/`MusicSynth`)
- Testing: Vitest (gameplay logic), Playwright + `pixelmatch`/`pngjs` (visual
  regression harness in `tools/`)
- Biome for lint/format
- pnpm (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) - the README's `npm install`/
  `npm run` quickstart commands are stale; use pnpm

## Commands

```bash
pnpm install
pnpm dev              # vite, strict port 5173
pnpm build
pnpm preview
pnpm check            # typecheck && test && build
pnpm test             # vitest run
pnpm test:watch
pnpm typecheck        # tsc --noEmit
pnpm biome:check
pnpm biome:fix

# visual regression harness (see tools/README.md)
pnpm run build && pnpm run vr:serve   # serve dist on :4173, one terminal
pnpm run vr:baseline                  # (re)generate tools/baselines/*.png, commit these
pnpm run vr:gate                      # capture + pixel-diff vs baselines; local-machine only
pnpm run vr:profile                   # real frame-time distribution (p50/p95/p99/worst)
pnpm run vr:playtest                  # scripted smoke test, fails on console errors
```

## Layout

- `src/game/` - engine and gameplay subsystems (`Engine.ts` orchestrator, `Grid.ts`,
  `Player.ts`, `Centipede.ts`, `Enemies.ts`, `UFO.ts`, `PowerUp.ts`, `RNG.ts`,
  `GameConfig.ts`/`Constants.ts`/`GameMode.ts`/`ConfigManager.ts` for tuning)
- `src/components/` - `ApeironCanvas.tsx` (canvas + test seam), `Menu.tsx`,
  `Options.tsx`, `ConfigTuner.tsx`, `DebugControls.tsx`, `effects/`
- `src/hooks/` - `useAudio.ts`, `useParticles.ts`
- `lib/particles.ts` - shared particle helper
- `tests/` - one Vitest file per gameplay rule (`centipede.poison`, `flea.density`,
  `player.movement`, `wave.composition`, etc.)
- `tools/` - headless harness: `capture.mjs`, `baseline.mjs`, `gate.mjs` (pixel diff),
  `profile.mjs` (frame-time distribution), `playtest.mjs` (scripted smoke),
  `lib/determinism.js` (seeds `Math.random`, fakes the clock and rAF, no-ops
  `AudioContext`), `lib/shots.js` (named capture scenarios)
- `tools/baselines/` - committed, per-machine reference PNGs (canvas
  text/anti-aliasing is OS+font specific)
- `tools/artifacts/` - git-ignored run output
- `docs/plans/` - planning docs

## Env vars

`APEIRON_URL` - overrides the target server for the `vr:*` harness scripts (defaults
to the local preview server).

## Gotchas

- `vr:gate` (pixel diff) is a local developer tool, not CI-safe: baselines only match
  the machine that generated them. CI instead runs `typecheck` + `test` + `build` and
  a separate environment-independent playtest smoke workflow with no pixel compare.
- The test seam (`window.__apeironEngine`) is exposed only when
  `window.__APEIRON_TEST__` is set by the headless harness before boot; it has no
  effect on normal runs.
- Gameplay logic must stay a pure function of (previous state, seeded RNG, input) -
  no wall-clock reads inside `Engine.tick`. `Math.random()` is tolerated only in
  non-gameplay cosmetic paths.

## Claude-specific

The `visual-regression-gate` skill was built for this repo's harness (and future
arcade builds); reach for it when adding new capture shots, extending determinism
overrides, or hardening the pixel-diff/frame-time gates.
