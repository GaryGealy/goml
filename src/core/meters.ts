import { HEAT_MAX, LAWN_MAX, WARY_HEAT } from './constants';
import { INTRUDERS } from './intruders';
import { chainHeat, hazardHeat, waveCooling } from './scoring';
import type { SimEvent } from './types';

/** The two opposed meters. Lawn damage is split by who caused it. */
export interface Meters {
  /** Damage intruders did by walking on the grass. */
  lawnByIntruders: number;
  /** Damage the player chose: intruders dragged through chains. */
  lawnBySelf: number;
  heat: number;
}

export function newMeters(): Meters {
  return { lawnByIntruders: 0, lawnBySelf: 0, heat: 0 };
}

export function lawnDamage(m: Meters): number {
  return m.lawnByIntruders + m.lawnBySelf;
}

export function isLawnDestroyed(m: Meters): boolean {
  return lawnDamage(m) >= LAWN_MAX;
}

/** Word has gotten around: intruders steer around visible contraptions. */
export function isWary(m: Meters): boolean {
  return m.heat >= WARY_HEAT;
}

function addHeat(m: Meters, amount: number): void {
  m.heat = Math.max(0, Math.min(HEAT_MAX, m.heat + amount));
}

/** Consume one simulation event. Meters own no rules about how the event was produced. */
export function applyMeterEvent(m: Meters, e: SimEvent): void {
  switch (e.type) {
    case 'trampled':
      m.lawnByIntruders += e.amount;
      break;
    case 'dragged':
      m.lawnBySelf += e.amount;
      break;
    case 'chainCompleted':
      addHeat(m, chainHeat(e.length, INTRUDERS[e.kind].sympathy));
      break;
    case 'harmed':
      addHeat(m, hazardHeat(INTRUDERS[e.kind].sympathy));
      break;
  }
}

/** Restraint-scaled cooling at wave end. There is no passive decay. */
export function coolAfterWave(m: Meters, highSympathyTotal: number, highSympathyHurt: number): number {
  const amount = waveCooling(highSympathyTotal, highSympathyHurt);
  addHeat(m, -amount);
  return amount;
}
