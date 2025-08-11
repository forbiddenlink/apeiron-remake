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

- Deterministic fixed-timestep engine (Centipede/Apeiron mechanics)
- Procedural pixel art (no image files)
- WebAudio synthesized SFX (no audio files)
- Lives, extra lives @ 12k, spider/flea/scorpion, poisoned mushrooms, dive, HUD, level flow.

## Controls

- Left/Right: Move
- Space: Fire
- R: Restart after Game Over

## Tests

```powershell
# one-shot test run (recommended for CI and terminals that should exit)
npm run test

# watch mode (interactive, press q to quit)
npm run test:watch
```
