import { describe, expect, it } from 'vitest';
import { parseLawn } from '../src/core/lawn';
import { emissionCells, pushDistance, resolvePush, signalTarget, traceChain } from '../src/core/propagation';
import type { ContraptionKind, Dir, Placed } from '../src/core/types';

const put = (kind: ContraptionKind, facing: Dir): Placed => ({ kind, facing, busyFor: 0, holding: null });

describe('resolvePush', () => {
  const lawn = parseLawn(['=.....=']);
  const none = () => false;
  it('moves the full distance over open lawn and releases', () => {
    const r = resolvePush(lawn, { x: 1, y: 0 }, 'E', 3, none);
    expect(r.outcome).toBe('released');
    expect(r.end).toEqual({ x: 4, y: 0 });
    expect(r.path).toHaveLength(3);
  });
  it('deflects the moment the intruder reaches the sidewalk', () => {
    const r = resolvePush(lawn, { x: 2, y: 0 }, 'W', 5, none);
    expect(r.outcome).toBe('deflected');
    expect(r.end).toEqual({ x: 0, y: 0 });
  });
  it('stops short at solid terrain', () => {
    const walled = parseLawn(['...T.']);
    const r = resolvePush(walled, { x: 0, y: 0 }, 'E', 4, none);
    expect(r.end).toEqual({ x: 2, y: 0 });
    expect(r.outcome).toBe('released');
  });
  it('hands the intruder into the first receiving slot on the way', () => {
    const slotted = parseLawn(['.o.o.']);
    const r = resolvePush(slotted, { x: 0, y: 0 }, 'E', 4, (s) => s === 1);
    expect(r.outcome).toBe('handed');
    expect(r.handedTo).toBe(1);
    expect(r.end).toEqual({ x: 3, y: 0 });
  });
});

describe('emission and signals', () => {
  it('covers the origin plus range cells, stopping at solid terrain', () => {
    const lawn = parseLawn(['....T.']);
    expect(emissionCells(lawn, { x: 1, y: 0 }, 'E', 5)).toHaveLength(3);
  });
  it('finds the first placed contraption within signal range, skipping empty slots', () => {
    const lawn = parseLawn(['o.oo..']);
    const placed = [put('motionSensor', 'E'), null, put('rake', 'N')];
    expect(signalTarget(lawn, placed, 0)).toBe(2);
  });
  it('adds a wet slide only to kinetic pushes', () => {
    expect(pushDistance(put('leafBlower', 'E'), true)).toBe(4);
    expect(pushDistance(put('rake', 'E'), true)).toBe(1);
  });
});

describe('traceChain', () => {
  // slots: 0 at (2,1), 1 at (5,1), 2 at (5,3)
  const lawn = parseLawn([
    '=======',
    '=.o..o=',
    '=.....=',
    '=....o=',
    '=======',
  ]);
  it('follows a blower into a gnome into a rake and reports where it ends', () => {
    const placed = [put('leafBlower', 'E'), put('springGnome', 'S'), put('rake', 'W')];
    const t = traceChain(lawn, placed, 0);
    expect(t.stages).toEqual([0, 1, 2]);
    expect(t.hazards).toBe(1);
    expect(t.outcome).toBe('released');
    expect(t.path.at(-1)).toEqual({ x: 4, y: 3 });
  });
  it('deflects off the property when the last stage faces the sidewalk', () => {
    const placed = [put('leafBlower', 'E'), put('springGnome', 'N'), null];
    const t = traceChain(lawn, placed, 0);
    expect(t.stages).toEqual([0, 1]);
    expect(t.outcome).toBe('deflected');
  });
  it('never revisits a slot, so facing contraptions cannot loop forever', () => {
    const loop = parseLawn(['.o.o.']);
    const t = traceChain(loop, [put('springGnome', 'E'), put('springGnome', 'W')], 0);
    expect(t.stages).toEqual([0, 1]);
    expect(t.outcome).toBe('released');
  });
  it('returns an empty trace for sensors and empty slots', () => {
    expect(traceChain(lawn, [put('motionSensor', 'E'), null, null], 0).outcome).toBe('none');
    expect(traceChain(lawn, [null, null, null], 0).stages).toEqual([]);
  });
});
