import { describe, expect, it } from 'vitest';
import { applyMeterEvent, coolAfterWave, isLawnDestroyed, isWary, lawnDamage, newMeters } from '../src/core/meters';

describe('meters', () => {
  it('splits lawn damage between intruders and the player', () => {
    const m = newMeters();
    applyMeterEvent(m, { type: 'trampled', amount: 3 });
    applyMeterEvent(m, { type: 'dragged', amount: 1.5 });
    expect(m.lawnByIntruders).toBe(3);
    expect(m.lawnBySelf).toBe(1.5);
    expect(lawnDamage(m)).toBe(4.5);
  });

  it('destroys the lawn at 100', () => {
    const m = newMeters();
    applyMeterEvent(m, { type: 'trampled', amount: 99 });
    expect(isLawnDestroyed(m)).toBe(false);
    applyMeterEvent(m, { type: 'dragged', amount: 1 });
    expect(isLawnDestroyed(m)).toBe(true);
  });

  it('heats up on chains and hazards against sympathetic targets, and turns wary at 40', () => {
    const m = newMeters();
    applyMeterEvent(m, { type: 'chainCompleted', intruderId: 1, kind: 'kid', length: 3 }); // 27
    expect(m.heat).toBe(27);
    expect(isWary(m)).toBe(false);
    applyMeterEvent(m, { type: 'harmed', intruderId: 1, kind: 'kid' }); // +9
    applyMeterEvent(m, { type: 'harmed', intruderId: 2, kind: 'kid' }); // +9
    expect(m.heat).toBe(45);
    expect(isWary(m)).toBe(true);
  });

  it('barely heats up for hunting dog walkers', () => {
    const m = newMeters();
    applyMeterEvent(m, { type: 'chainCompleted', intruderId: 1, kind: 'dogWalker', length: 3 });
    expect(m.heat).toBe(6);
  });

  it('cools at wave end by restraint and never below zero', () => {
    const m = newMeters();
    m.heat = 10;
    expect(coolAfterWave(m, 2, 0)).toBe(25);
    expect(m.heat).toBe(0);
  });
});
