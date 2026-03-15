# Apeiron Remake v0.3 (All Code: Procedural Sprites + Synth SFX)

## Quickstart

```powershell
# install deps
npm install

# start dev server (Vite, strict port 5173)
npm run dev
```

Open the printed local URL (<http://localhost:5173>). If you see another site, clear your browser cache and unregister any service workers.

## What’s included

- Deterministic fixed-timestep engine tuned for classic Apeiron mechanics
- Procedural pixel art (no image files)
- WebAudio synthesized SFX (no audio files)
- Mouse-first controls with keyboard fallback
- `Classic`/`Enhanced` gameplay mode toggle (`Classic` default)
- Classic score/life rules in `Classic` mode (extra life every 20,000 points, up to 8 lives)
- Classic yummies (guided, diamond, machine gun, shield, lock, house cleaning, extra man)

## Controls

- Mouse: Move in player zone
- Mouse click (or Space): Fire
- Arrow keys: Keyboard movement fallback
- P or CapsLock: Pause / Resume
- Esc (while playing or paused): Abort run to title
- Space (title/game over): Start a new run
- Options > Gameplay Mode: switch `Classic` / `Enhanced`

## Tests

```powershell
# one-shot test run (recommended for CI and terminals that should exit)
npm run test

# watch mode (interactive, press q to quit)
npm run test:watch
```
