import { describe, expect, it } from 'vitest';
import { parseLawn } from '../src/core/lawn';
import { newSim, spawnIntruder, stepSim, type SimState } from '../src/core/sim';
import type { ContraptionKind, Dir, SimEvent } from '../src/core/types';

const DT = 0.05;

function place(sim: SimState, slot: number, kind: ContraptionKind, facing: Dir) {
  sim.placed[slot] = { kind, facing, busyFor: 0, holding: null };
}

/** Run until nobody is left or the time limit hits; return every event. */
function run(sim: SimState, seconds: number, wary = false): SimEvent[] {
  const all: SimEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    all.push(...stepSim(sim, DT, { wary }));
    if (sim.intruders.every((i) => i.status === 'gone')) break;
  }
  return all;
}

const types = (events: SimEvent[]) => events.map((e) => e.type).filter((t) => t !== 'trampled');

describe('walking', () => {
  it('walks across and exits as crossed, trampling the lawn on the way', () => {
    const sim = newSim(parseLawn(['=....=']));
    spawnIntruder(sim, 'kid', { x: 0, y: 0 }, { x: 5, y: 0 });
    const events = run(sim, 10);
    expect(types(events)).toEqual(['crossed']);
    const trampled = events.filter((e) => e.type === 'trampled').reduce((s, e) => s + (e as { amount: number }).amount, 0);
    expect(trampled).toBeGreaterThan(0);
  });
});

describe('transport chains', () => {
  // Slots: 0 at (1,1), 1 at (4,1), 2 at (4,3). Walkers beeline east along row 1.
  const rows = [
    '======',
    '=o..o=',
    '=....=',
    '=...o=',
    '======',
  ];

  it('hands a walker down blower -> gnome -> rake and scores a 3-stage chain', () => {
    const sim = newSim(parseLawn(rows));
    place(sim, 0, 'leafBlower', 'E');
    place(sim, 1, 'springGnome', 'S');
    place(sim, 2, 'rake', 'N');
    spawnIntruder(sim, 'dogWalker', { x: 0, y: 1 }, { x: 5, y: 1 });
    const events = run(sim, 20);
    const stages = events.filter((e) => e.type === 'stageStarted').map((e) => (e as { slot: number }).slot);
    expect(stages).toEqual([0, 1, 2]);
    expect(events).toContainEqual({ type: 'harmed', intruderId: 1, kind: 'dogWalker' });
    expect(events).toContainEqual({ type: 'chainCompleted', intruderId: 1, kind: 'dogWalker', length: 3 });
    expect(events.filter((e) => e.type === 'dragged')).toHaveLength(2);
  });

  it('deflects off the property when the last stage faces the sidewalk', () => {
    const sim = newSim(parseLawn(rows));
    place(sim, 0, 'leafBlower', 'E');
    place(sim, 1, 'springGnome', 'N');
    spawnIntruder(sim, 'kid', { x: 0, y: 1 }, { x: 5, y: 1 });
    const events = run(sim, 20);
    expect(events).toContainEqual({ type: 'chainCompleted', intruderId: 1, kind: 'kid', length: 2 });
    expect(events).toContainEqual({ type: 'deflected', intruderId: 1, kind: 'kid' });
  });

  it('a single shove is not a chain: the walker gets up and carries on', () => {
    const sim = newSim(parseLawn(rows));
    place(sim, 0, 'rake', 'S');
    spawnIntruder(sim, 'kid', { x: 0, y: 1 }, { x: 5, y: 1 });
    const events = run(sim, 20);
    expect(types(events)).toEqual(['stageStarted', 'harmed', 'crossed']);
  });

  it('holds a slot for the stage duration, so a second walker passes over a busy contraption', () => {
    const sim = newSim(parseLawn(['=o...=']));
    place(sim, 0, 'springGnome', 'N'); // faces the house wall: pushes nowhere
    const a = spawnIntruder(sim, 'kid', { x: 0, y: 0 }, { x: 5, y: 0 });
    const b = spawnIntruder(sim, 'kid', { x: 0, y: 0 }, { x: 5, y: 0 });
    b.progress = -0.3; // a step behind
    const events = run(sim, 20);
    const started = events.filter((e) => e.type === 'stageStarted').map((e) => (e as { intruderId: number }).intruderId);
    expect(started).toEqual([a.id]);
  });

  it('gives a wet intruder an extra cell of slide from kinetic pushes', () => {
    // sprinkler at (1,0) pushes 1 east onto the blower at (2,0); blower pushes 3+1 = 4 east to (6,0).
    const sim = newSim(parseLawn(['.oo.....']));
    place(sim, 0, 'sprinkler', 'E');
    place(sim, 1, 'leafBlower', 'E');
    const it = spawnIntruder(sim, 'dogWalker', { x: 0, y: 0 }, { x: 7, y: 0 });
    run(sim, 3);
    expect(it.wet).toBe(true);
    expect(it.status).toBe('gone');
    expect(it.cell).toEqual({ x: 6, y: 0 });
  });
});

describe('signals', () => {
  it('a motion sensor wakes the blower it faces, which grabs the walker in its emission', () => {
    const lawn = parseLawn([
      '=======',
      '=..o..=', // slot 0 (3,1): blower facing S, emission (3,1) (3,2) (3,3)
      '=.....=',
      '=.....=', // the kid walks this row
      '=..o..=', // slot 1 (3,4): sensor facing N, signal reaches the blower
      '=======',
    ]);
    const sim = newSim(lawn);
    place(sim, 0, 'leafBlower', 'S');
    place(sim, 1, 'motionSensor', 'N');
    spawnIntruder(sim, 'kid', { x: 0, y: 3 }, { x: 6, y: 3 });
    const events = run(sim, 10);
    expect(types(events)).toEqual(['signal', 'stageStarted', 'deflected']);
    expect(events).toContainEqual({ type: 'signal', from: 1, to: 0 });
  });

  it('a signal with nobody in the emission dry-fires', () => {
    const sim = newSim(parseLawn(['=o.o=', '=...=', '=====']));
    place(sim, 0, 'motionSensor', 'E');
    place(sim, 1, 'leafBlower', 'N');
    spawnIntruder(sim, 'kid', { x: 0, y: 1 }, { x: 4, y: 1 });
    expect(types(run(sim, 10))).toEqual(['signal', 'dryFire', 'crossed']);
  });
});

describe('wariness', () => {
  it('wary walkers route around contraptions they could otherwise step on', () => {
    const rows = ['=.....=', '=..o..=', '=.....=', '======='];
    const straight = newSim(parseLawn(rows));
    place(straight, 0, 'rake', 'N');
    spawnIntruder(straight, 'kid', { x: 0, y: 1 }, { x: 6, y: 1 });
    expect(types(run(straight, 20, false))).toContain('stageStarted');

    const wary = newSim(parseLawn(rows));
    place(wary, 0, 'rake', 'N');
    spawnIntruder(wary, 'kid', { x: 0, y: 1 }, { x: 6, y: 1 });
    expect(types(run(wary, 20, true))).toEqual(['crossed']);
  });
});
