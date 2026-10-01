import { CHAIN_STAGE_LAWN_DAMAGE, MAX_CHAIN, SENSOR_COOLDOWN } from './constants';
import { CONTRAPTIONS } from './contraptions';
import { INTRUDERS } from './intruders';
import { cellIndex, isProperty, sameCell, slotAt, type Lawn } from './lawn';
import { emissionCells, isReceiver, pushDistance, resolvePush, signalTarget } from './propagation';
import { distanceField, nextStep } from './steering';
import type { Cell, Intruder, IntruderKind, Placed, SimEvent } from './types';

export interface SimState {
  lawn: Lawn;
  /** One entry per lawn slot. */
  placed: (Placed | null)[];
  intruders: Intruder[];
  nextId: number;
}

export interface StepOptions {
  /** High heat: intruders steer around visible contraptions when they can. */
  wary: boolean;
}

export function newSim(lawn: Lawn): SimState {
  return { lawn, placed: lawn.slots.map(() => null), intruders: [], nextId: 1 };
}

export function spawnIntruder(sim: SimState, kind: IntruderKind, from: Cell, to: Cell, events: SimEvent[] = []): Intruder {
  const it: Intruder = {
    id: sim.nextId++, kind, cell: { ...from }, next: null, progress: 0, destination: { ...to },
    status: 'walking', wet: false, chainLength: 0, visited: [],
  };
  sim.intruders.push(it);
  events.push({ type: 'spawned', intruderId: it.id, kind });
  return it;
}

function findIntruder(sim: SimState, id: number): Intruder | undefined {
  return sim.intruders.find((i) => i.id === id);
}

function isIdle(p: Placed): boolean {
  return p.busyFor <= 0 && p.holding === null;
}

/** Can `slot` take this intruder as the next stage right now? */
function canReceive(sim: SimState, slot: number, it: Intruder): boolean {
  const p = sim.placed[slot];
  return isReceiver(p) && isIdle(p) && !it.visited.includes(slot) && it.chainLength < MAX_CHAIN;
}

/**
 * Take an intruder into a contraption's stage. `handed` = delivered by the previous stage.
 * The intruder stays where it stands: on the slot when it stepped or was pushed there,
 * anywhere in the emission when a signal woke the contraption.
 */
function beginStage(sim: SimState, slot: number, it: Intruder, handed: boolean, events: SimEvent[]): void {
  const p = sim.placed[slot] as Placed;
  if (!handed) {
    it.chainLength = 0;
    it.visited = [];
  }
  it.chainLength++;
  it.visited.push(slot);
  it.status = 'held';
  it.next = null;
  it.progress = 0;
  p.holding = it.id;
  p.busyFor = CONTRAPTIONS[p.kind].stageSeconds;
  events.push({ type: 'stageStarted', slot, intruderId: it.id, chainLength: it.chainLength });
  if (it.chainLength >= 2) events.push({ type: 'dragged', amount: CHAIN_STAGE_LAWN_DAMAGE });
}

function finish(it: Intruder, how: 'deflected' | 'chained', events: SimEvent[]): void {
  it.status = 'gone';
  if (it.chainLength >= 2) {
    events.push({ type: 'chainCompleted', intruderId: it.id, kind: it.kind, length: it.chainLength });
  }
  if (how === 'deflected') events.push({ type: 'deflected', intruderId: it.id, kind: it.kind });
}

/** A stage's timer ran out: apply its effect and push the intruder on. */
function completeStage(sim: SimState, slot: number, events: SimEvent[]): void {
  const p = sim.placed[slot] as Placed;
  const it = p.holding === null ? undefined : findIntruder(sim, p.holding);
  p.holding = null;
  if (!it) return;
  const output = CONTRAPTIONS[p.kind].output;
  if (output === 'fluid') it.wet = true;
  if (output === 'hazard') events.push({ type: 'harmed', intruderId: it.id, kind: it.kind });
  const r = resolvePush(sim.lawn, it.cell, p.facing, pushDistance(p, it.wet), (s) => canReceive(sim, s, it));
  it.cell = { ...r.end };
  if (r.outcome === 'deflected') {
    finish(it, 'deflected', events);
  } else if (r.outcome === 'handed') {
    beginStage(sim, r.handedTo, it, true, events);
  } else if (it.chainLength >= 2) {
    // A real chain ran its course: they flee, humiliated.
    finish(it, 'chained', events);
  } else {
    // A single shove. They pick themselves up and carry on toward their destination.
    it.status = 'walking';
    it.chainLength = 0;
    it.visited = [];
  }
}

/** A contraption woken by a signal grabs the first walking intruder in its emission. */
function fireBySignal(sim: SimState, slot: number, events: SimEvent[]): void {
  const p = sim.placed[slot];
  if (!isReceiver(p) || !isIdle(p)) return;
  const cells = emissionCells(sim.lawn, sim.lawn.slots[slot], p.facing, CONTRAPTIONS[p.kind].range);
  for (const c of cells) {
    const it = sim.intruders.find((i) => i.status === 'walking' && sameCell(i.cell, c));
    if (it) {
      beginStage(sim, slot, it, false, events);
      return;
    }
  }
  p.busyFor = CONTRAPTIONS[p.kind].stageSeconds;
  events.push({ type: 'dryFire', slot });
}

function tickContraptions(sim: SimState, dt: number, events: SimEvent[]): void {
  // Collect first, then resolve, so a contraption activated this tick is not also ticked this tick.
  const done: number[] = [];
  sim.placed.forEach((p, slot) => {
    if (!p || p.busyFor <= 0) return;
    p.busyFor = Math.max(0, p.busyFor - dt);
    if (p.busyFor === 0 && p.holding !== null) done.push(slot);
  });
  for (const slot of done) completeStage(sim, slot, events);
}

function tickSensors(sim: SimState, events: SimEvent[]): void {
  sim.placed.forEach((p, slot) => {
    if (!p || CONTRAPTIONS[p.kind].output !== 'signal' || p.busyFor > 0) return;
    const at = sim.lawn.slots[slot];
    const near = sim.intruders.some(
      (i) => i.status === 'walking' && Math.abs(i.cell.x - at.x) + Math.abs(i.cell.y - at.y) <= 1,
    );
    if (!near) return;
    p.busyFor = SENSOR_COOLDOWN;
    const target = signalTarget(sim.lawn, sim.placed, slot);
    if (target < 0) return;
    events.push({ type: 'signal', from: slot, to: target });
    fireBySignal(sim, target, events);
  });
}

function contraptionCells(sim: SimState): Set<number> {
  const cells = new Set<number>();
  sim.placed.forEach((p, slot) => {
    if (p) cells.add(cellIndex(sim.lawn, sim.lawn.slots[slot]));
  });
  return cells;
}

function tickWalkers(sim: SimState, dt: number, opts: StepOptions, events: SimEvent[]): void {
  const fields = new Map<string, Int32Array>();
  const avoid = opts.wary ? contraptionCells(sim) : new Set<number>();
  const field = (dest: Cell, useAvoid: boolean) => {
    const key = `${dest.x},${dest.y},${useAvoid}`;
    let f = fields.get(key);
    if (!f) {
      f = distanceField(sim.lawn, dest, useAvoid ? avoid : undefined);
      fields.set(key, f);
    }
    return f;
  };
  let trampled = 0;
  for (const it of sim.intruders) {
    if (it.status !== 'walking') continue;
    const spec = INTRUDERS[it.kind];
    if (isProperty(sim.lawn, it.cell)) trampled += spec.lawnDamagePerSecond * dt;
    if (!it.next) {
      it.next = nextStep(sim.lawn, field(it.destination, opts.wary), it.cell, it.destination);
      // Wary but boxed in: they hold their nose and walk past the contraption anyway.
      if (!it.next && opts.wary) it.next = nextStep(sim.lawn, field(it.destination, false), it.cell, it.destination);
      if (!it.next) continue;
    }
    it.progress += spec.speed * dt;
    if (it.progress < 1) continue;
    it.cell = it.next;
    it.next = null;
    it.progress = 0;
    if (sameCell(it.cell, it.destination)) {
      it.status = 'gone';
      events.push({ type: 'crossed', intruderId: it.id, kind: it.kind });
      continue;
    }
    const slot = slotAt(sim.lawn, it.cell);
    if (slot >= 0 && canReceive(sim, slot, it)) beginStage(sim, slot, it, false, events);
  }
  if (trampled > 0) events.push({ type: 'trampled', amount: trampled });
}

/** Advance the simulation by `dt` seconds. Mutates `sim`; returns what happened. */
export function stepSim(sim: SimState, dt: number, opts: StepOptions): SimEvent[] {
  const events: SimEvent[] = [];
  tickContraptions(sim, dt, events);
  tickSensors(sim, events);
  tickWalkers(sim, dt, opts, events);
  return events;
}

/** Everyone still on the board (walking or mid-chain). */
export function activeIntruders(sim: SimState): Intruder[] {
  return sim.intruders.filter((i) => i.status !== 'gone');
}
