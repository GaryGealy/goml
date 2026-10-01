import type { Cell } from './types';
import { cellIndex, inBounds, isWalkable, type Lawn } from './lawn';

/**
 * Eight-way neighbours. Order only breaks exact ties, but it must stay fixed for determinism.
 */
export const NEIGHBORS: Cell[] = [
  { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
];

/** A diagonal move is legal only when both orthogonal cells it squeezes between are walkable. */
function canMove(lawn: Lawn, from: Cell, d: Cell): boolean {
  const to = { x: from.x + d.x, y: from.y + d.y };
  if (!isWalkable(lawn, to)) return false;
  if (d.x !== 0 && d.y !== 0) {
    return isWalkable(lawn, { x: from.x + d.x, y: from.y }) && isWalkable(lawn, { x: from.x, y: from.y + d.y });
  }
  return true;
}

/**
 * Steps-to-destination for every cell (-1 = unreachable), by breadth-first search
 * outward from `dest`. Cells in `avoid` (cell indices) are never entered.
 * Intruders have a destination, not a route: they re-read this field from wherever they stand.
 */
export function distanceField(lawn: Lawn, dest: Cell, avoid: ReadonlySet<number> = new Set()): Int32Array {
  const field = new Int32Array(lawn.width * lawn.height).fill(-1);
  field[cellIndex(lawn, dest)] = 0;
  const queue: Cell[] = [dest];
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head];
    const d = field[cellIndex(lawn, c)];
    for (const n of NEIGHBORS) {
      const to = { x: c.x + n.x, y: c.y + n.y };
      if (!inBounds(lawn, to)) continue;
      const i = cellIndex(lawn, to);
      if (field[i] !== -1 || avoid.has(i)) continue;
      // Moves are symmetric, so "can walk from `to` back to `c`" is the same test.
      if (!canMove(lawn, c, n)) continue;
      field[i] = d + 1;
      queue.push(to);
    }
  }
  return field;
}

/**
 * The neighbour that gets closest to the destination, or null if nothing is closer than here.
 * Ties go to the neighbour nearest `dest` in a straight line, so walkers take the beeline
 * across the grass rather than an equally short dogleg along the sidewalk.
 */
export function nextStep(lawn: Lawn, field: Int32Array, from: Cell, dest: Cell): Cell | null {
  const here = field[cellIndex(lawn, from)];
  let best: Cell | null = null;
  let bestDist = here < 0 ? Infinity : here;
  let bestLine = Infinity;
  for (const n of NEIGHBORS) {
    if (!canMove(lawn, from, n)) continue;
    const to = { x: from.x + n.x, y: from.y + n.y };
    const d = field[cellIndex(lawn, to)];
    if (d < 0 || d > bestDist || (d === bestDist && best === null)) continue;
    const line = (dest.x - to.x) ** 2 + (dest.y - to.y) ** 2;
    if (d < bestDist || line < bestLine) {
      best = to;
      bestDist = d;
      bestLine = line;
    }
  }
  return best;
}
