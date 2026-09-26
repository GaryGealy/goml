import { INTRUDERS } from './intruders';
import { traceChain, type ChainTrace } from './propagation';
import { armedness, chainHeat, chainScore, hazardHeat, mercyScore } from './scoring';
import type { Game } from './game';
import { placedCount } from './game';
import type { IntruderKind } from './types';

export interface KindPreview {
  kind: IntruderKind;
  score: number;
  heat: number;
}

export interface SlotPreview {
  trace: ChainTrace;
  perKind: KindPreview[];
}

/**
 * What would happen to each intruder kind that stepped onto `slot` right now.
 * Heat must be visible before the player commits — this is that visibility.
 */
export function previewSlot(g: Game, slot: number): SlotPreview {
  const trace = traceChain(g.sim.lawn, g.sim.placed, slot);
  const armed = armedness(placedCount(g));
  const length = trace.stages.length;
  const perKind = (Object.keys(INTRUDERS) as IntruderKind[]).map((kind) => {
    const { sympathy } = INTRUDERS[kind];
    const score = chainScore(length, sympathy) + (trace.outcome === 'deflected' ? mercyScore(sympathy, armed) : 0);
    const heat = chainHeat(length, sympathy) + trace.hazards * hazardHeat(sympathy);
    return { kind, score, heat };
  });
  return { trace, perKind };
}
