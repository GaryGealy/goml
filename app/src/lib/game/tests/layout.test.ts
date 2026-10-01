import { describe, expect, it } from 'vitest';
import { cellCenter, fitLayout, pixelToCell } from '../render/layout';

describe('layout', () => {
	it('fits square cells and centres the grid', () => {
		const l = fitLayout(1300, 900, 12, 9);
		expect(l.cell).toBe(100);
		expect(l.originX).toBe(50);
		expect(l.originY).toBe(0);
	});
	it('round-trips a cell through pixels', () => {
		const l = fitLayout(1200, 900, 12, 9);
		const c = cellCenter(l, { x: 3, y: 4 });
		expect(pixelToCell(l, c.x, c.y, 12, 9)).toEqual({ x: 3, y: 4 });
		expect(pixelToCell(l, -5, 10, 12, 9)).toBeNull();
	});
});
