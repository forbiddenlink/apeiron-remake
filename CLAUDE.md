# apeiron-remake

A remake of the arcade game Apeiron (Centipede-style) built with React + Vite. All
assets are procedural: no image or audio files - sprites come from
`ProceduralSprites`, audio from `AudioSynth`/`Music`. Deterministic fixed-timestep
engine (`Engine.tick(dt)` at a fixed 1/60 step) so a seeded run renders bit-identical
pixels, which backs a real pixel-diff regression gate. Repo:
github.com/forbiddenlink/apeiron-remake.

See `ARCHITECTURE.md` for the full design-invariant contract and subsystem ownership
table (frozen destination doc: code wins on disagreement, doc gets flagged not
trusted). See `tools/README.md` for the headless reproducibility/profiling harness in
full detail; this file only summarizes both.

## Stack

- React 19 + Vite, TypeScript, `type: module`
- Rendering: 2D canvas (`ProceduralSprites.ts`, `BackgroundEffects.ts`), sprites
  pre-rendered from 3D models with `three` (`render3d/SpriteBaker.ts`), `sparticles`
  for particle FX (Enhanced mode overlay), custom WebAudio in `AudioSynth` (SFX) and
  `Music` (music)
- Testing: Vitest (gameplay logic), Playwright + `pixelmatch`/`pngjs` (visual
  regression harness in `tools/`)
- Biome for lint/format
- pnpm (`pnpm-lock.yaml`, `pnpm-workspace.yaml`)

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

pnpm icons            # regenerate public/ favicon, app icons and social card from the game's own art
pnpm balance          # bot simulation: survival, score and spawn rates per mode
```

## Layout

- `src/game/` - engine and gameplay subsystems (`Engine.ts` orchestrator, `Grid.ts`,
  `Player.ts`, `Centipede.ts`, `Enemies.ts`, `UFO.ts`, `PowerUp.ts`, `RNG.ts`,
  `GameConfig.ts`/`Constants.ts`/`GameMode.ts` for tuning, `Music.ts`, `Cheats.ts`,
  `HighScores.ts`, `RunStats.ts`, `Gamepad.ts`, `SidebarRenderer.ts`)
- `src/components/` - `ApeironCanvas.tsx` (canvas + test seam), `Menu.tsx`,
  `Options.tsx`, `panels/` (shared `Panel`, info panels, `SpriteIcon`), `ui.ts`
- `src/settings.ts` - settings type, defaults, load/save
- `lib/particles.ts` - shared particle helper
- `tests/` - one Vitest file per gameplay rule (`centipede.poison`, `flea.density`,
  `player.movement`, `wave.composition`, etc.). `engine.lifecycle.test.ts` runs the
  real `Engine` against `tests/helpers/fakeDom.ts` (a canvas that swallows draws)
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
- Seeds: a normal run picks a random seed (`Engine.seed`); under
  `window.__APEIRON_TEST__` it is always `0xc0ffee`. `startNewGame(seed)` replays a
  specific field (daily challenge). Settings and scores are not read or written
  under the harness.
- The canvas backing store is `800x592` times `Engine.setPixelRatio` (device pixel
  ratio times the fit-to-window scale). Draw code works in logical pixels. The
  harness runs at DPR 1 and scale 1, so capture sizes are unchanged.
- Pentipede segments are drawn and hit-tested at an interpolated position
  (`Centipede.segmentPixel`); grid logic still uses whole cells.
- Grid: the field is 25 x 25 cells of 16 units (400 x 400 field units), drawn
  scaled by `Engine.fieldScale` (1.48) to fill the 592-pixel playfield. Gameplay
  code, sprites and hitboxes all work in field units; only `Engine.draw` and
  `MouseInput` know about the scale. Speeds carry `GRID_RATIO` (25/37) so crossing
  times match the old 37-column field.
- Backdrops: `render3d/BackdropBaker.ts` relights the flat theme textures as
  terrain, same async-bake-with-fallback pattern as the sprites.
- `pnpm balance` runs a bot over 12 seeds per mode and prints survival, score and
  spawn rates. The bot is weak (Larry kills it), so use it to compare a change
  before and after, not as an absolute difficulty measure.
- 3D sprites: `src/game/render3d/SpriteBaker.ts` builds each character as a
  three.js model and bakes it into a 2D atlas over the first frames after boot.
  The game only ever blits tiles; three.js never runs during play. Until a tile is
  baked (or where WebGL is missing, or with Options > 3D sprites off) the 2D
  `ProceduralSprites` draw instead, so both paths must keep working. The harness
  and CI skip the bake (software WebGL takes about 25 s) and so cover the 2D
  sprites only; `tools/bake-probe.mjs` times the bake headless.
- After any gameplay or render change the committed `tools/baselines/*.png` no
  longer match: regenerate with `pnpm run vr:baseline` on the machine that owns them.
- Gameplay logic must stay a pure function of (previous state, seeded RNG, input) -
  no wall-clock reads inside `Engine.tick`. `Math.random()` is tolerated only in
  non-gameplay cosmetic paths.

## Claude-specific

The `visual-regression-gate` skill was built for this repo's harness (and future
arcade builds); reach for it when adding new capture shots, extending determinism
overrides, or hardening the pixel-diff/frame-time gates.
