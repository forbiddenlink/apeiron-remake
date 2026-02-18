import { describe, expect, it } from 'vitest';
import { CELL, ROWS } from '../src/game/Constants';
import { PowerUp } from '../src/game/PowerUp';

describe('PowerUp lifecycle', () => {
  it('deactivates when it drifts below the playfield', () => {
    const p = new PowerUp(32, ROWS * CELL - 4, 'guided', () => 0.5);
    expect(p.active).toBe(true);

    for (let i = 0; i < 120; i++) {
      p.update(1 / 60);
    }

    expect(p.active).toBe(false);
  });
});
