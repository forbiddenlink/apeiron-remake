# Apeiron Classic Recreation Design (2026-02-17)

## Goal
Recreate classic Mac **Apeiron/Apeiron X** as closely as practical in this web codebase, while keeping visual/audio presentation enhanced and modernized.

## Verified Classic Facts (Research)
Primary references used:
- Game manual/FAQ mirror with controls, enemies, points, and powerups: https://discmaster.textfiles.com/file/25603/Archive%20of%20Apple%20Win3.1%20Mac%20DOS5%20Linux%20and%20more_CD-ROM.iso/mac/Mac%20Games/Action/Apeiron.sit/Apeiron%20Guide.txt
- Macintosh Repository overview (historical context/versioning): https://www.macintoshrepository.org/2077-apeiron-x
- ATPM review (contemporary gameplay description): https://www.atpm.com/8.11/apeiron.shtml
- MobyGames review notes on modernized Centipede mechanics and presentation: https://www.mobygames.com/game/14252/apeiron/reviews/
- OverClocked ReMix review with named enemy/bonus references: https://ocremix.org/review/487/apeiron-original-soundtrack

Key mechanics confirmed from the guide:
- Extra life every **20,000** points; max **8 lives**.
- Enemy score values include Pentipede segments/head, Groucho/Flea, Gordon/Gecko, and proximity-based Larry/Scobster scores.
- If multiple fleas are on-screen, flea scores increase in powers of two for consecutive kills.
- Mouse aiming/movement and rapid mouse-click firing were core control expectations.
- `P` and `Caps Lock` are pause controls; `Esc` aborts current game from pause state.
- Pentipede touchdown at the bottom row is a danger event that can bring more enemies.
- Yummies include weapon/defense effects and utility effects (for example lock/house-cleaning/extra man).
- Manual point table includes poison-mushroom hits and spaceship random-value scoring windows.

## Classic Rule Matrix
- Lives:
  - Start at 3.
  - +1 every 20,000 points.
  - Cap at 8 total lives.
- Controls:
  - Mouse movement and click-to-fire are first-class.
  - Keyboard fallback remains available in this remake for accessibility.
- Enemy points:
  - Body segment: 10
  - Head segment: 100
  - Flea: 200 (doubles when multiple fleas are active and killed in sequence)
  - Gecko/Scorpion: 1500
  - Spider/Scobster: proximity-tiered (300/600/900 family)
  - Spaceship: variable random value within the manual range
- Mushroom points:
  - Regular mushroom hit: 1
  - Poison mushroom hit: 5
- Yummies:
  - Guided shot
  - Diamond (pass-through mushrooms)
  - Machine gun
  - Shield
  - Lock (retain powers after death)
  - House-cleaning (clear bottom/player-zone mushrooms)
  - Extra man

## Current State (Now)
Implemented in this pass:
- Build restored and tests restored to green.
- Codebase compatibility layer added around fractured config migration.
- Classic scoring updates:
  - `SCORE.SCORPION = 1500`
  - `EXTRA_LIFE_STEP = 20000`
  - Extra-life cap at 8 lives in runtime awarding logic.
  - Flea kill value now scales with concurrent-flea streak behavior.
- Input behavior moved to **mouse-first with keyboard fallback** to better match classic play feel.
- Mouse vectoring bug fixed so cursor movement now correctly drives the player in classic-style targeting.
- Keyboard control parity updated: `P` or `CapsLock` toggles pause, `Esc` aborts to title while playing or paused.
- Modern score inflation removed from runtime scoring:
  - no combo/chain multiplier stack
  - no modern level-end perfect/speed/flawless bonus package
- Classic-style Yummy behaviors now wired:
  - lock carry-over on death
  - house-cleaning immediate clear in player zone
  - extra-man immediate life award (capped at 8)
  - guided/machine-gun/shield/diamond effect paths retained
- Pentipede touchdown signal now triggers reinforcement pressure:
  - new centipede spawn (bounded by total segment cap),
  - plus occasional "friend" spawn (spider/flea/scorpion) with short cooldown.
- Enemy movement pass simplified to classic-style readable motion patterns (removed non-classic burst/chase timers and async `setTimeout` behavior).
- Gameplay profile split is now implemented:
  - `Classic` (default): faithful scoring and pacing rules.
  - `Enhanced`: modern combo/chain/level bonus scoring and tighter enemy pacing windows.
  - Runtime switch is exposed in Options as `Gameplay Mode`.

## Known Gaps vs Classic
- Falling mushroom behavior is implemented (spawn/fall/pop scoring and player hazard), but level-by-level tuning against original pacing still needs calibration.
- Some modern visual/audio flourishes remain enabled (kept intentionally as enhancement layer).
- Exact enemy spawn windows and movement amplitudes still need side-by-side calibration against original gameplay footage.

## Next Implementation Pass (Recommended)
1. Add regression tests for:
   - extra-life thresholds and max-lives cap,
   - flea score doubling chain,
   - classic-friendly powerup behavior,
   - mode-specific scoring and pacing.
2. Tune spawn timing and speed curves to match observed classic pacing.
3. Keep modern visuals/sound as presentation-only enhancements (no gameplay drift in Classic profile).
