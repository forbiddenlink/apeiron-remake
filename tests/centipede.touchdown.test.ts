import { describe, it, expect } from 'vitest';
import { Grid, Mushroom } from '../src/game/Grid';
import { Centipede } from '../src/game/Centipede';
import { COLS, ROWS, PLAYER_ROWS } from '../src/game/Constants';

function stepOnce(centipede: Centipede, grid: Grid) {
  (centipede as any).step(grid);
}

describe('Centipede touchdown signal', () => {
  it('signals touchdown when reaching the bottom enemy row and wrapping to top', () => {
    const grid = new Grid();
    const centipede = new Centipede(4, 1);
    const maxEnemyRow = ROWS - PLAYER_ROWS - 1;
    const head = centipede.segments[0];

    head.c = COLS - 1;
    head.r = maxEnemyRow - 1;
    head.dir = 1;

    stepOnce(centipede, grid);

    expect(centipede.segments[0].r).toBe(0);
    expect(centipede.consumeTouchdown()).toBe(true);
    expect(centipede.consumeTouchdown()).toBe(false);
  });

  it('also signals touchdown when a poison dive reaches the bottom row', () => {
    const grid = new Grid();
    const centipede = new Centipede(3, 1);
    const maxEnemyRow = ROWS - PLAYER_ROWS - 1;
    const head = centipede.segments[0];

    head.c = 5;
    head.r = maxEnemyRow - 1;
    head.dir = 1;
    grid.set(6, maxEnemyRow - 1, Object.assign(new Mushroom(6, maxEnemyRow - 1), { poisoned: true }));

    stepOnce(centipede, grid);

    expect(centipede.segments[0].r).toBe(0);
    expect(centipede.consumeTouchdown()).toBe(true);
  });
});
