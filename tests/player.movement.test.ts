import { describe, it, expect } from 'vitest';
import { Player } from '../src/game/Player';
import { GRID } from '../src/game/GameConfig';

describe('Player movement', () => {
  it('can move both up and down from spawn', () => {
    const p = new Player();
    const startY = p.y;

    p.update(0.08, new Set<string>(['ArrowUp']));
    expect(p.y).toBeLessThan(startY);

    const afterUp = p.y;
    p.update(0.08, new Set<string>(['ArrowDown']));
    expect(p.y).toBeGreaterThan(afterUp);
  });

  it('stays inside vertical player bounds', () => {
    const p = new Player();
    const minY = (GRID.ROWS - GRID.PLAYER_ROWS) * GRID.CELL;
    const maxY = (GRID.ROWS - 1) * GRID.CELL - p.h - 2;

    p.update(10, new Set<string>(['ArrowUp']));
    expect(p.y).toBe(minY);

    p.update(10, new Set<string>(['ArrowDown']));
    expect(p.y).toBe(maxY);
  });
});
