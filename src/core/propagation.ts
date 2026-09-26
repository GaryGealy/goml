import type { Cell, Dir, Placed } from './types';
import { CONTRAPTIONS } from './contraptions';
import { MAX_CHAIN, WET_SLIDE_BONUS } from './constants';
import { isWalkable, slotAt, stepCell, terrainAt, type Lawn } from './lawn';

export type PushOutcome = 'deflected' | 'handed' | 'released';

export interface PushResult {
  /** Cells passed through, not including the start. */
  path: Cell[];
  end: Cell;
  outcome: PushOutcome;
  /** Slot the intruder was handed into, or -1. */
  handedTo: number;
}

/**
 * Displace an intruder `distance` cells along `dir`. Solid terrain stops the push short.
 * Landing on sidewalk means they are off the property: deflected. Passing over a slot
 * that `canReceive` accepts hands them into that contraption: the next chain stage.
 * Shared by the simulation and the preview so the two can never disagree.
 */
export function resolvePush(
  lawn: Lawn, from: Cell, dir: Dir, distance: number, canReceive: (slot: number) => boolean,
): PushResult {
  const path: Cell[] = [];
  let cur = from;
  for (let i = 0; i < distance; i++) {
    const next = stepCell(cur, dir);
    if (!isWalkable(lawn, next)) break;
    cur = next;
    path.push(cur);
    if (terrainAt(lawn, cur) === 'sidewalk') return { path, end: cur, outcome: 'deflected', handedTo: -1 };
    const s = slotAt(lawn, cur);
    if (s >= 0 && canReceive(s)) return { path, end: cur, outcome: 'handed', handedTo: s };
  }
  return { path, end: cur, outcome: 'released', handedTo: -1 };
}

/** How far a contraption shoves someone, including the slide a wet intruder gets from kinetic tools. */
export function pushDistance(placed: Placed, wet: boolean): number {
  const spec = CONTRAPTIONS[placed.kind];
  return spec.push + (spec.output === 'kinetic' && wet ? WET_SLIDE_BONUS : 0);
}

/** Cells a contraption's emission covers: its own slot, then `range` cells ahead until something solid. */
export function emissionCells(lawn: Lawn, origin: Cell, dir: Dir, range: number): Cell[] {
  const cells = [origin];
  let cur = origin;
  for (let i = 0; i < range; i++) {
    cur = stepCell(cur, dir);
    if (!isWalkable(lawn, cur)) break;
    cells.push(cur);
  }
  return cells;
}

/** The first contraption a signal from `slot` reaches, or -1. Signals pass over empty slots. */
export function signalTarget(lawn: Lawn, placed: (Placed | null)[], slot: number): number {
  const p = placed[slot];
  if (!p) return -1;
  const cells = emissionCells(lawn, lawn.slots[slot], p.facing, CONTRAPTIONS[p.kind].range);
  for (const c of cells.slice(1)) {
    const s = slotAt(lawn, c);
    if (s >= 0 && placed[s]) return s;
  }
  return -1;
}

/** True if a contraption in this slot can take an intruder into a stage (sensors cannot). */
export function isReceiver(placed: Placed | null | undefined): placed is Placed {
  return !!placed && CONTRAPTIONS[placed.kind].output !== 'signal';
}

export interface ChainTrace {
  /** Slots the intruder passes through, in order. Empty if the start slot cannot hold anyone. */
  stages: number[];
  /** Every cell the intruder occupies, starting at the first slot. */
  path: Cell[];
  outcome: 'deflected' | 'released' | 'none';
  /** Stages whose contraption is a hazard. */
  hazards: number;
}

/**
 * Dry-run the transport chain an intruder would take if it stepped onto `startSlot`
 * right now, assuming every contraption is idle. Pure — used for the pre-commit preview.
 */
export function traceChain(lawn: Lawn, placed: (Placed | null)[], startSlot: number): ChainTrace {
  const start = lawn.slots[startSlot];
  const trace: ChainTrace = { stages: [], path: [start], outcome: 'none', hazards: 0 };
  if (!isReceiver(placed[startSlot])) return trace;
  let slot = startSlot;
  let wet = false;
  for (;;) {
    const p = placed[slot] as Placed;
    const spec = CONTRAPTIONS[p.kind];
    trace.stages.push(slot);
    if (spec.output === 'fluid') wet = true;
    if (spec.output === 'hazard') trace.hazards++;
    const r = resolvePush(lawn, lawn.slots[slot], p.facing, pushDistance(p, wet), (s) =>
      isReceiver(placed[s]) && !trace.stages.includes(s) && trace.stages.length < MAX_CHAIN,
    );
    trace.path.push(...r.path);
    if (r.outcome !== 'handed') {
      trace.outcome = r.outcome;
      return trace;
    }
    slot = r.handedTo;
  }
}
