# Headless harness — reproducibility, regression, profiling

Ported from the engineering discipline in `mshumer/Claude-of-Duty` (not its 3D
rendering). Because the Apeiron engine is deterministic + fixed-timestep, a
seeded run renders **bit-identical** pixels, so we get a hard pixel-diff
regression gate rather than soft assertions.

## How determinism works (`lib/determinism.js`)

Injected via Playwright `addInitScript` **before** app boot — zero engine edits:

- `Math.random` → seeded mulberry32 (neutralizes all cosmetic RNG call sites)
- `performance.now` / `Date.now` → a virtual clock we advance by hand
- `requestAnimationFrame` → a manual queue; `window.__apeironPump(n)` advances
  exactly `n` fixed `1/60` frames (one tick each)
- `AudioContext` → universal no-op Proxy (headless has no audio device)

`profile.mjs` uses `installProfiler` instead: leaves the clock REAL and records
true per-frame deltas (seeds RNG only) so the timing is honest.

## Commands

```bash
pnpm run build && pnpm run vr:serve   # serve dist on :4173 (one terminal)

pnpm run vr:baseline   # (re)generate tools/baselines/*.png  — commit these
pnpm run vr:gate       # capture fresh + pixel-diff vs baselines; non-zero on drift
pnpm run vr:profile    # real frame-time distribution (p50/p95/p99/worst + boot stall)
pnpm run vr:playtest   # scripted smoke: hold fire, sweep, assert invariants, fail on console errors
pnpm run vr:capture -- --out /tmp/x.png --play --frames 240   # one ad-hoc shot
```

Point at a different server with `APEIRON_URL=... pnpm run vr:gate` or `--url`.

## Workflow

1. Change gameplay/render. Run `pnpm run vr:gate`.
2. **Unintended** pixel drift → a regression. Inspect `tools/artifacts/<shot>.diff.png`.
3. **Intended** visual change → review the new look, then
   `node tools/gate.mjs --update` (or `pnpm run vr:baseline`) and commit the
   updated baselines in the same PR as the change.

Shots are defined in `lib/shots.js` (name, seed, play?, frame-count). Add one
whenever you want a new game state under regression coverage.

## Reading the profile

`vr:profile` reports the DISTRIBUTION, not an average — a healthy p50 can hide a
multi-hundred-ms stall. The `warmup` line is the worst boot frame (lazy
module/compile cost), excluded from steady-state percentiles but surfaced so it
can't hide. Current boot stall ~2s is a real optimization target.

## Where each piece runs

- **`vr:gate` (pixel diff) is a LOCAL developer tool.** Canvas text/anti-aliasing
  is OS + font specific, so committed baselines only match the machine that
  minted them. Run the gate on your own Mac before committing render/gameplay
  changes; the committed `tools/baselines/*.png` are that machine's reference.
  Don't run the pixel gate in CI against these — a different runner will diff.
- **CI runs the environment-INDEPENDENT gates**: `typecheck` + `test` + `build`
  (`.github/workflows/ci.yml`) and the **playtest smoke**
  (`.github/workflows/runtime-smoke.yml`), which asserts invariants and fails on
  console errors — no pixel compare, so it's safe cross-runner.
- `tools/artifacts/` is git-ignored (run outputs). `tools/baselines/` is committed.
- If a teammate on a different OS needs the gate, they regenerate baselines on
  their machine (`pnpm run vr:baseline`) — treat baselines as per-environment.
