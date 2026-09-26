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

  it('is knocked out of the field when shot', () => {
    const p = new PowerUp(32, CELL, 'guided', () => 0.5);
    p.deflect();

    for (let i = 0; i < 30; i++) {
      p.update(1 / 60);
    }

    expect(p.active).toBe(false);
  });

  it('uses the supplied random source for its visual phase', () => {
    const a = new PowerUp(32, 32, 'guided', () => 0.25);
    const b = new PowerUp(32, 32, 'guided', () => 0.25);

    a.update(1 / 60);
    b.update(1 / 60);

    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
  });
});
