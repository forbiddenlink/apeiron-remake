
# Copilot Instructions for Apeiron Remake

## Project Overview
- **Apeiron Remake** is an exact-feel, deterministic clone of Ambrosia's classic Mac game *Apeiron* (Centipede-style), built with React + TypeScript and rendered on a single HTML5 Canvas. All visuals and audio are generated procedurally in code, no external assets or public folder.
- The authoritative contract is `ARCHITECTURE.md` (design invariants, subsystem ownership, frozen: code wins on disagreement). See also `README.md` for setup and `tools/README.md` for the reproducibility/profiling harness.

## Architecture & Patterns
- **Deterministic Engine:** `src/game/Engine.ts` implements a fixed-timestep accumulator loop (60Hz), grid-quantized logic, and manages all entity updates, spawns, collisions, and HUD rendering.
- **Entities:** Player, centipede, spider, flea, scorpion, and mushrooms are implemented as classes in `src/game/`. They interact via the engine and a grid (`Grid.ts`).
- **Procedural Art & SFX:** All sprites (`src/game/ProceduralSprites.ts`) and sound (`src/game/AudioSynth.ts`) are generated at runtime. No image/audio files are used or allowed.
- **Single Canvas:** The game is rendered to a single `<canvas>` via `ApeironCanvas.tsx`.
- **Minimal React state for gameplay:** gameplay state lives entirely in the engine, not React - `ApeironCanvas.tsx` only mounts and bridges to it. UI-only components (`Menu.tsx`, `Options.tsx`, `ConfigTuner.tsx`) do use `useState`/`useEffect` for their own local UI state.

## Developer Workflows
- **Install:** `pnpm install`
- **Dev Server:** `pnpm dev` (Vite, strict port 5173)
- **Build:** `pnpm build` (outputs to `dist/`)
- **Test:** `pnpm test` (Vitest)
- **No Service Workers:** No PWA/service worker/manifest; if you see unrelated content, clear browser cache and unregister service workers.

## Project Conventions
- **Procedural Everything:** All graphics and audio are generated in code. Do not add static assets or public files.
- **Performance:** Avoid per-frame allocations in hot paths. Use object pools (e.g., for bullets).
- **Strict Constants:** All gameplay constants (grid size, speeds, scoring, spawn timers) are defined in `Constants.ts` and must match the spec.
- **Testing:** Core mechanics (splitting, poison dive, flea density, spider proximity, extra life) should be covered by Vitest tests.

## Key Files & Structure
- `src/game/Engine.ts` — main game loop, entity management, collisions, HUD
- `src/game/ProceduralSprites.ts` — all drawing routines (crisp, minimalist)
- `src/game/AudioSynth.ts` — sound effect synthesis (WebAudio)
- `src/components/ApeironCanvas.tsx` — React bridge to the engine
- `src/game/Constants.ts` — all gameplay constants
- `vite.config.ts` — Vite config, strict port

## Example: Adding a New Enemy
1. Implement the class in `src/game/Enemies.ts`
2. Add update/draw logic in `Engine.ts`
3. Add procedural art in `ProceduralSprites.ts`

## Troubleshooting
- If you see an unrelated site (e.g., "space tourism"), clear browser cache and unregister service workers.
- If port conflicts occur, kill all node processes and restart the dev server.

---
**For all gameplay, scoring, and architecture details, see `ARCHITECTURE.md`.**
