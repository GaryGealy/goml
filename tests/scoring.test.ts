import { describe, expect, it } from 'vitest';
import { armedness, chainHeat, chainScore, mercyScore, newWaveScore, scoreEvent, waveCooling } from '../src/core/scoring';

describe('chain score', () => {
  it('pays stages x inverted sympathy', () => {
    expect(chainScore(3, 2)).toBe(120); // dog walker: 3 * (6 - 2) * 10
  });
  it('goes negative on sympathetic targets', () => {
    expect(chainScore(3, 9)).toBe(-90);
  });
  it('pays nothing for a single shove', () => {
    expect(chainScore(1, 0)).toBe(0);
    expect(chainHeat(1, 9)).toBe(0);
  });
});

describe('mercy score', () => {
  it('scales with sympathy and how armed the lawn is', () => {
    expect(mercyScore(9, armedness(6))).toBe(90);
    expect(mercyScore(9, armedness(3))).toBe(45);
  });
  it('pays a pacifist with an empty yard nothing', () => {
    expect(mercyScore(9, armedness(0))).toBe(0);
  });
  it('caps armedness at 1', () => {
    expect(armedness(20)).toBe(1);
  });
});

describe('wave cooling', () => {
  it('is full for perfect restraint, zero for none, and zero when nobody sympathetic came', () => {
    expect(waveCooling(4, 0)).toBe(25);
    expect(waveCooling(4, 4)).toBe(0);
    expect(waveCooling(4, 2)).toBe(12.5);
    expect(waveCooling(0, 0)).toBe(0);
  });
});

describe('scoreEvent', () => {
  it('routes chains and deflections into one total', () => {
    const ws = newWaveScore();
    expect(scoreEvent(ws, { type: 'chainCompleted', intruderId: 1, kind: 'dogWalker', length: 4 }, 1)).toBe(160);
    expect(scoreEvent(ws, { type: 'deflected', intruderId: 2, kind: 'kid' }, 0.5)).toBe(45);
    expect(scoreEvent(ws, { type: 'crossed', intruderId: 3, kind: 'kid' }, 1)).toBe(0);
    expect(ws).toEqual({ total: 205, chain: 160, mercy: 45, longestChain: 4 });
  });
});
