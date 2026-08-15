import { describe, it, expect } from 'vitest';
import { Grid, Mushroom } from '../src/game/Grid';
import { Centipede } from '../src/game/Centipede';
import { COLS, ROWS, PLAYER_ROWS } from '../src/game/Constants';

function stepOnce(centipede: Centipede, grid: Grid) {
  (centipede as any).step(grid);
}

// Canon Apeiron/Centipede: the centipede descends into the player zone and, once it
// reaches the bottom row, weaves inside the bottom band (reversing vertical direction)
// until it is killed. It does NOT teleport back to the top. Every bottom-touch still
// raises the touchdown signal so the engine can apply reinforcement pressure.
describe('Centipede touchdown weave', () => {
  const bottomRow = ROWS - 1;
  const ascendFloor = ROWS - PLAYER_ROWS - 1;

  it('signals touchdown when it reaches the bottom row and stays near the bottom (no teleport)', () => {
    const grid = new Grid();
    const centipede = new Centipede(4, 1);
    const head = centipede.segments[0];

    head.c = COLS - 1;
    head.r = bottomRow - 1;
    head.dir = 1;

    stepOnce(centipede, grid);

    // Reversing at the right edge drops it onto the bottom row, not row 0.
    expect(centipede.segments[0].r).toBe(bottomRow);
    expect(centipede.consumeTouchdown()).toBe(true);
    expect(centipede.consumeTouchdown()).toBe(false);
  });

  it('bounces back up after touchdown instead of wrapping to the top', () => {
    const grid = new Grid();
    const centipede = new Centipede(4, 1);
    const head = centipede.segments[0];

    // Land on the bottom row, moving right, sitting against the right edge.
    head.c = COLS - 1;
    head.r = bottomRow - 1;
    head.dir = 1;
    stepOnce(centipede, grid); // -> bottom row, dir flips to -1, vertical dir now up

    // Next edge/wall contact should move it UP one row, never to row 0.
    head.c = 0;
    head.dir = -1;
    stepOnce(centipede, grid);

    expect(centipede.segments[0].r).toBe(bottomRow - 1);
    expect(centipede.segments[0].r).toBeGreaterThanOrEqual(ascendFloor);
  });

  it('also signals touchdown when a poison dive reaches the bottom row', () => {
    const grid = new Grid();
    const centipede = new Centipede(3, 1);
    const head = centipede.segments[0];

    head.c = 5;
    head.r = bottomRow - 1;
    head.dir = 1;
    grid.set(6, bottomRow - 1, Object.assign(new Mushroom(6, bottomRow - 1), { poisoned: true }));

    stepOnce(centipede, grid);

    expect(centipede.segments[0].r).toBe(bottomRow);
    expect(centipede.consumeTouchdown()).toBe(true);
  });
});
