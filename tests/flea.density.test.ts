import { describe, it, expect } from 'vitest';
import { Grid, Mushroom } from '../src/game/Grid';
import { DENSITY, COLS, ROWS, PLAYER_ROWS } from '../src/game/Constants';

function countMushesInPlayerRows(grid: Grid){
  const start = ROWS-PLAYER_ROWS;
  let n=0; for (let r=start;r<ROWS;r++){ for (let c=0;c<COLS;c++){ if (grid.get(c,r)) n++; } }
  return n;
}

describe('Flea density heuristic', () => {
  it('detects low mushroom density in player rows', () => {
    const g = new Grid(COLS, ROWS);
    // ensure fewer than threshold
    const need = Math.max(0, DENSITY.PLAYER_ROWS_MIN_MUSHES - 1);
    for (let i=0;i<need;i++){ g.set(i, ROWS-1, new Mushroom(i, ROWS-1)); }
    const n = countMushesInPlayerRows(g);
    expect(n).toBeLessThan(DENSITY.PLAYER_ROWS_MIN_MUSHES);
  });
});
