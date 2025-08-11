import { describe, it, expect } from 'vitest';
import { Grid, Mushroom } from '../src/game/Grid';
import { Centipede } from '../src/game/Centipede';
import { COLS } from '../src/game/Constants';

// Helper to step the centipede by N whole cells
function stepCells(c: Centipede, grid: Grid, n: number){
  for(let i=0;i<n;i++){ (c as any).step(grid); }
}

describe('Centipede poison dive', () => {
  it('dives vertically when encountering a poisoned mushroom ahead until bottom enemy boundary', () => {
    const grid = new Grid();
    const c = new Centipede(3, 1);
    const head = c.segments[0];
    head.c = 5; head.r = 2; head.dir = 1;
    // place poisoned mushroom directly in front of head path
    grid.set(6, 2, Object.assign(new Mushroom(6,2), { poisoned: true }));

    // one step should engage dive and move down one row
    stepCells(c, grid, 1);
    expect(c.segments[0].r).toBe(3);

    // continue stepping; should keep moving down (no horizontal advance)
    const startR = c.segments[0].r;
    stepCells(c, grid, 5);
    expect(c.segments[0].r).toBeGreaterThan(startR);
  });
});
