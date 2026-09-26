# Apeiron Remake

A remake of the arcade game Apeiron (Centipede-style), built with React + Vite. All
assets are procedural: no image or audio files - sprites come from
`ProceduralSprites`, audio from `AudioSynth`/`MusicSynth`. No live URL on file.

## Features

- Deterministic fixed-timestep engine tuned for classic Apeiron mechanics
- Procedural pixel art (no image files)
- WebAudio synthesized SFX (no audio files)
- Mouse-first controls with keyboard fallback
- `Classic`/`Enhanced` gameplay mode toggle (`Classic` default)
- Classic score/life rules in `Classic` mode (extra life every 20,000 points, up to 8 lives)
- Classic yummies (guided, diamond, machine gun, shield, lock, house cleaning, extra man)

## Controls

- Mouse: move in player zone
- Mouse click (or Space): fire
- Arrow keys: keyboard movement fallback
- P or CapsLock: pause / resume
- Esc (while playing): abort run to title
- Space (title/game over): start a new run
- Options > Gameplay Mode: switch `Classic` / `Enhanced`

## Quickstart

```bash
pnpm install
pnpm dev              # vite, strict port 5173
```

Open the printed local URL (<http://localhost:5173>). If you see another site, clear
your browser cache and unregister any service workers.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` / `build` / `preview` | Vite dev server / production build / preview |
| `pnpm check` | typecheck + test + build |
| `pnpm test` / `test:watch` | Vitest |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm biome:check` / `biome:fix` | Biome lint/format |
| `pnpm run vr:baseline` / `vr:gate` / `vr:capture` / `vr:profile` / `vr:playtest` | Visual regression harness, see [tools/README.md](tools/README.md) |

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) - design-invariant contract and subsystem ownership
- [tools/README.md](tools/README.md) - visual regression / reproducibility harness
