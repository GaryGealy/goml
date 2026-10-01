import { describe, expect, it } from 'vitest';
import { cellIndex, parseLawn } from '../src/core/lawn';
import { distanceField, nextStep } from '../src/core/steering';

function walk(rows: string[], from: { x: number; y: number }, to: { x: number; y: number }, avoid = new Set<number>()) {
  const lawn = parseLawn(rows);
  const field = distanceField(lawn, to, avoid);
  const path = [from];
  let cur = from;
  for (let i = 0; i < 50; i++) {
    const n = nextStep(lawn, field, cur, to);
    if (!n) break;
    path.push(n);
    cur = n;
  }
  return path;
}

describe('steering', () => {
  it('cuts diagonally across the lawn rather than following the sidewalk', () => {
    const rows = ['=....=', '=....=', '=....=', '======'];
    const path = walk(rows, { x: 0, y: 2 }, { x: 5, y: 0 });
    expect(path.at(-1)).toEqual({ x: 5, y: 0 });
    expect(path).toHaveLength(6); // Chebyshev distance 5, plus the start
    expect(path.slice(1, -1).every((c) => c.x >= 1 && c.x <= 4)).toBe(true);
  });

  it('takes the straight line across the grass when the sidewalk dogleg is equally short', () => {
    const rows = ['======', '=....=', '======'];
    const path = walk(rows, { x: 0, y: 1 }, { x: 5, y: 1 });
    expect(path.every((c) => c.y === 1)).toBe(true);
  });

  it('walks around trees and never squeezes diagonally past a corner', () => {
    const rows = ['.....', '..T..', '.....'];
    const path = walk(rows, { x: 1, y: 1 }, { x: 3, y: 1 });
    expect(path.some((c) => c.x === 2 && c.y === 1)).toBe(false);
    expect(path.at(-1)).toEqual({ x: 3, y: 1 });
  });

  it('routes around avoided cells when a detour exists', () => {
    const rows = ['.....', '.....', '.....'];
    const lawn = parseLawn(rows);
    const avoid = new Set([cellIndex(lawn, { x: 2, y: 1 })]);
    const path = walk(rows, { x: 0, y: 1 }, { x: 4, y: 1 }, avoid);
    expect(path.some((c) => c.x === 2 && c.y === 1)).toBe(false);
    expect(path.at(-1)).toEqual({ x: 4, y: 1 });
  });

  it('marks walled-off cells unreachable and returns no step from them', () => {
    const lawn = parseLawn(['.#.', '.#.', '.#.']);
    const field = distanceField(lawn, { x: 2, y: 1 });
    expect(field[cellIndex(lawn, { x: 0, y: 1 })]).toBe(-1);
    expect(nextStep(lawn, field, { x: 0, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });
});
