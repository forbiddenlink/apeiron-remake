import { describe, it, expect } from 'vitest';
import { Player } from '../src/game/Player';
import { TIMERS } from '../src/game/Constants';

function activeCount(p: Player){ return p.bullets.filter(b=>b.active).length; }

describe('Player firing rules', () => {
  it('limits to one bullet when not in autofire', () => {
    const p = new Player();
    const keys = new Set<string>(['Space']);
    // initial fire
    p.update(0, keys);
    expect(activeCount(p)).toBe(1);
    // after normal cooldown, still one because single-shot rule while first is active
    p.update(TIMERS.FIRE_COOLDOWN, keys);
    expect(activeCount(p)).toBe(1);
    // deactivate current bullet and allow another shot
    const b = p.bullets.find(bb=>bb.active)!;
    b.y = -9; // will be culled next update
    p.update(0.016, new Set());
    expect(activeCount(p)).toBe(0);
    p.update(TIMERS.FIRE_COOLDOWN, keys);
    expect(activeCount(p)).toBe(1);
  });

  it('allows multiple bullets with autofire active', () => {
    const p = new Player();
    const keys = new Set<string>(['Space']);
    p.autofireTime = 0.5;
    // fire a few times across autofire cooldowns
    p.update(0, keys); // first shot
    p.update(TIMERS.AUTOFIRE_COOLDOWN, keys); // second shot
    p.update(TIMERS.AUTOFIRE_COOLDOWN, keys); // third shot
    expect(activeCount(p)).toBeGreaterThanOrEqual(2);
  });
});
