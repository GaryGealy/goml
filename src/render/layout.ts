import type { Cell } from '../core/types';

export interface Layout {
  cell: number;
  originX: number;
  originY: number;
}

/** Fit a grid into a canvas, centred, with square cells. */
export function fitLayout(canvasW: number, canvasH: number, cols: number, rows: number): Layout {
  const cell = Math.floor(Math.min(canvasW / cols, canvasH / rows));
  return { cell, originX: Math.floor((canvasW - cell * cols) / 2), originY: Math.floor((canvasH - cell * rows) / 2) };
}

export function cellCenter(l: Layout, c: Cell): { x: number; y: number } {
  return { x: l.originX + (c.x + 0.5) * l.cell, y: l.originY + (c.y + 0.5) * l.cell };
}

/** Canvas pixel -> cell, or null outside the grid. */
export function pixelToCell(l: Layout, px: number, py: number, cols: number, rows: number): Cell | null {
  const x = Math.floor((px - l.originX) / l.cell);
  const y = Math.floor((py - l.originY) / l.cell);
  return x >= 0 && y >= 0 && x < cols && y < rows ? { x, y } : null;
}
