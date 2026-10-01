import { describe, expect, it } from 'vitest';
import {
	DEFAULT_LAWN_ROWS,
	isProperty,
	isWalkable,
	parseLawn,
	rotateCW,
	slotAt,
	stepCell,
	terrainAt
} from '../core/lawn';

describe('parseLawn', () => {
	it('reads terrain and slots in reading order', () => {
		const lawn = parseLawn(['=o.', '#.o']);
		expect(lawn.width).toBe(3);
		expect(lawn.height).toBe(2);
		expect(lawn.slots).toEqual([
			{ x: 1, y: 0 },
			{ x: 2, y: 1 }
		]);
		expect(slotAt(lawn, { x: 2, y: 1 })).toBe(1);
		expect(slotAt(lawn, { x: 0, y: 0 })).toBe(-1);
		expect(terrainAt(lawn, { x: 0, y: 1 })).toBe('house');
	});

	it('rejects ragged rows and unknown characters', () => {
		expect(() => parseLawn(['...', '..'])).toThrow(/row 1/);
		expect(() => parseLawn(['.?.'])).toThrow(/unknown/);
	});

	it('parses the default lawn with 13 slots', () => {
		const lawn = parseLawn(DEFAULT_LAWN_ROWS);
		expect(lawn.width).toBe(12);
		expect(lawn.height).toBe(9);
		expect(lawn.slots).toHaveLength(13);
	});
});

describe('cell rules', () => {
	const lawn = parseLawn(['=.T', '#o=']);
	it('treats lawn and sidewalk as walkable, everything else and out of bounds as solid', () => {
		expect(isWalkable(lawn, { x: 0, y: 0 })).toBe(true);
		expect(isWalkable(lawn, { x: 1, y: 1 })).toBe(true);
		expect(isWalkable(lawn, { x: 2, y: 0 })).toBe(false);
		expect(isWalkable(lawn, { x: 0, y: 1 })).toBe(false);
		expect(isWalkable(lawn, { x: -1, y: 0 })).toBe(false);
	});
	it('counts only lawn as property', () => {
		expect(isProperty(lawn, { x: 1, y: 0 })).toBe(true);
		expect(isProperty(lawn, { x: 0, y: 0 })).toBe(false);
	});
	it('rotates clockwise and steps along a facing', () => {
		expect(rotateCW('N')).toBe('E');
		expect(rotateCW('W')).toBe('N');
		expect(stepCell({ x: 2, y: 2 }, 'S', 3)).toEqual({ x: 2, y: 5 });
	});
});
