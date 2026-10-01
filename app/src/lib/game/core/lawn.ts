import type { Cell, Dir, Terrain } from './types';

export interface Lawn {
	width: number;
	height: number;
	/** Row-major, index = y * width + x. */
	terrain: Terrain[];
	/** Fixed contraption slots, in reading order. Slot index = position in this array. */
	slots: Cell[];
	/** Cell index -> slot index, -1 where there is no slot. */
	slotByCell: number[];
}

const TERRAIN_CHARS: Record<string, Terrain> = {
	'.': 'lawn',
	o: 'lawn',
	'=': 'sidewalk',
	'#': 'house',
	D: 'door',
	T: 'tree'
};

/**
 * Parse an ASCII lawn. `.` lawn, `o` lawn with a slot, `=` sidewalk (off-property),
 * `#` house, `D` door, `T` tree. All rows must be the same width.
 */
export function parseLawn(rows: string[]): Lawn {
	const height = rows.length;
	const width = rows[0].length;
	const terrain: Terrain[] = [];
	const slots: Cell[] = [];
	const slotByCell: number[] = [];
	rows.forEach((row, y) => {
		if (row.length !== width)
			throw new Error(`lawn row ${y} is ${row.length} wide, expected ${width}`);
		[...row].forEach((ch, x) => {
			const t = TERRAIN_CHARS[ch];
			if (!t) throw new Error(`unknown lawn char '${ch}' at ${x},${y}`);
			terrain.push(t);
			if (ch === 'o') {
				slotByCell.push(slots.length);
				slots.push({ x, y });
			} else {
				slotByCell.push(-1);
			}
		});
	});
	return { width, height, terrain, slots, slotByCell };
}

/** The prototype's single lawn. House and door along the top, sidewalk on three sides. */
export const DEFAULT_LAWN_ROWS = [
	'=##########=',
	'=#####D####=',
	'=..o...o..o=',
	'=.o..o...o.=',
	'=...T..o...=',
	'=.o...o..o.=',
	'=..o..o..T.=',
	'=....o.....=',
	'============'
];

export const DIR_VECTORS: Record<Dir, Cell> = {
	N: { x: 0, y: -1 },
	E: { x: 1, y: 0 },
	S: { x: 0, y: 1 },
	W: { x: -1, y: 0 }
};

const CLOCKWISE: Record<Dir, Dir> = { N: 'E', E: 'S', S: 'W', W: 'N' };

export function rotateCW(d: Dir): Dir {
	return CLOCKWISE[d];
}

export function stepCell(c: Cell, d: Dir, n = 1): Cell {
	const v = DIR_VECTORS[d];
	return { x: c.x + v.x * n, y: c.y + v.y * n };
}

export function sameCell(a: Cell, b: Cell): boolean {
	return a.x === b.x && a.y === b.y;
}

export function inBounds(lawn: Lawn, c: Cell): boolean {
	return c.x >= 0 && c.y >= 0 && c.x < lawn.width && c.y < lawn.height;
}

export function cellIndex(lawn: Lawn, c: Cell): number {
	return c.y * lawn.width + c.x;
}

/** Terrain at a cell; out of bounds reads as `house` (solid). */
export function terrainAt(lawn: Lawn, c: Cell): Terrain {
	return inBounds(lawn, c) ? lawn.terrain[cellIndex(lawn, c)] : 'house';
}

export function isWalkable(lawn: Lawn, c: Cell): boolean {
	const t = terrainAt(lawn, c);
	return t === 'lawn' || t === 'sidewalk';
}

export function isProperty(lawn: Lawn, c: Cell): boolean {
	return terrainAt(lawn, c) === 'lawn';
}

export function slotAt(lawn: Lawn, c: Cell): number {
	return inBounds(lawn, c) ? lawn.slotByCell[cellIndex(lawn, c)] : -1;
}
