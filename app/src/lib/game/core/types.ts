export type Dir = 'N' | 'E' | 'S' | 'W';

export interface Cell {
  x: number;
  y: number;
}

/** What a lawn cell is made of. Only `lawn` is property; `sidewalk` is off-property but walkable. */
export type Terrain = 'lawn' | 'sidewalk' | 'house' | 'door' | 'tree';

export type OutputType = 'signal' | 'kinetic' | 'fluid' | 'hazard';

export type ContraptionKind = 'leafBlower' | 'springGnome' | 'sprinkler' | 'rake' | 'motionSensor';

export interface ContraptionSpec {
  kind: ContraptionKind;
  name: string;
  output: OutputType;
  /** Cells beyond its own slot that its emission reaches (signal travel, or target search when signalled). */
  range: number;
  /** Cells an affected intruder is displaced in the facing direction. 0 for signal. */
  push: number;
  /** How long the intruder is held in this stage before the push resolves. */
  stageSeconds: number;
}

/** A contraption sitting in a slot. */
export interface Placed {
  kind: ContraptionKind;
  facing: Dir;
  /** Seconds until the current stage (or sensor cooldown) ends. 0 = idle. */
  busyFor: number;
  /** Intruder currently held in this stage, if any. */
  holding: number | null;
}

export type IntruderKind = 'dogWalker' | 'kid';

export interface IntruderSpec {
  kind: IntruderKind;
  name: string;
  /** Cells per second. */
  speed: number;
  /** 0 (fair game) to 10 (maximum). How bad it is to trap them. */
  sympathy: number;
  /** Lawn damage per second while walking on lawn. */
  lawnDamagePerSecond: number;
}

export type IntruderStatus = 'walking' | 'held' | 'gone';

export interface Intruder {
  id: number;
  kind: IntruderKind;
  cell: Cell;
  /** Cell being walked toward, or null when about to choose one. */
  next: Cell | null;
  /** 0..1 progress from `cell` to `next`. */
  progress: number;
  destination: Cell;
  status: IntruderStatus;
  wet: boolean;
  /** Stages in the current transport chain. 0 when not in one. */
  chainLength: number;
  /** Slots already visited in the current chain; a chain never revisits a slot. */
  visited: number[];
}

export type SimEvent =
  | { type: 'spawned'; intruderId: number; kind: IntruderKind }
  | { type: 'trampled'; amount: number }
  | { type: 'dragged'; amount: number }
  | { type: 'stageStarted'; slot: number; intruderId: number; chainLength: number }
  | { type: 'dryFire'; slot: number }
  | { type: 'signal'; from: number; to: number }
  | { type: 'harmed'; intruderId: number; kind: IntruderKind }
  | { type: 'chainCompleted'; intruderId: number; kind: IntruderKind; length: number }
  | { type: 'deflected'; intruderId: number; kind: IntruderKind }
  | { type: 'crossed'; intruderId: number; kind: IntruderKind };
