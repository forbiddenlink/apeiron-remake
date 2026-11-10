# Apeiron Remake

A remake of the arcade game Apeiron (Centipede-style), built with React + Vite. All
assets are procedural: no image or audio files - sprites come from
`ProceduralSprites`, audio from `AudioSynth`/`Music`. Live at <https://apeiron-remake.vercel.app/>.

## Features

- Deterministic fixed-timestep engine tuned for classic Apeiron mechanics. Every run
  has its own seed; the same seed replays the same field and enemy schedule
- Procedural art (no image files in the game): characters are 3D models built in code
  and baked to sprites at boot, with flat 2D drawings as a fallback and an Options toggle
- WebAudio synthesized SFX and music
- Mouse, touch and pen through pointer events, keyboard, and gamepad. Optional captured
  mouse mode (pointer lock) for the original's relative-movement feel
- Sharp on Retina displays; the window frame scales to fit the viewport
- `Classic`/`Enhanced` gameplay mode toggle (`Classic` default)
- Classic score/life rules in `Classic` mode (extra life every 20,000 points, up to 8 lives)
- Classic yummies (guided, diamond, machine gun, shield, lock, house cleaning, extra man,
  multiplier), dropped by destroyed mushrooms as in the original
- Reflecting mushrooms in late waves (toggle in Options)
- One hit costs one life: shatter freeze, then a short invulnerable respawn
- Auto-pause when the tab or window loses focus
- Daily challenge (one shared seed per day), local top-10 table, run stats on game over
- How to Play, Meet the Vermin, High Scores and About panels
- Reduce Flashing option (on by default when the OS asks for reduced motion)
- The original's cheat words, typed while paused with Caps Lock
- Slowly drifting light on the backdrops (toggle in Options)
- Settings saved in the browser

## Controls

- Mouse or finger: move in player zone
- Click, hold or touch (or Space): fire
- Arrow keys: keyboard movement fallback
- P or CapsLock: pause / resume
- Esc (while playing): abort run to title
- Space (title/game over): start a new run
- Options > Style and rules: switch `Classic` / `Enhanced`

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
| `pnpm balance` | Bot simulation: prints survival, score and spawn rates per mode |
| `pnpm icons` | Regenerate `public/` favicon, app icons and social card from the game's own art |
| `pnpm run vr:baseline` / `vr:gate` / `vr:capture` / `vr:profile` / `vr:playtest` | Visual regression harness, see [tools/README.md](tools/README.md) |

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) - design-invariant contract and subsystem ownership
- [tools/README.md](tools/README.md) - visual regression / reproducibility harness
