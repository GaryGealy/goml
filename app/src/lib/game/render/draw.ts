import { CONTRAPTIONS } from '../core/contraptions';
import type { Game } from '../core/game';
import { INTRUDERS } from '../core/intruders';
import { DIR_VECTORS, terrainAt } from '../core/lawn';
import type { ChainTrace } from '../core/propagation';
import type { Cell, Dir, Intruder } from '../core/types';
import { cellCenter, type Layout } from './layout';
import {
	CONTRAPTION_GLYPHS,
	INTRUDER_BODIES,
	INTRUDER_GLYPHS,
	OUTPUT_COLORS,
	TERRAIN_COLORS
} from './palette';

export interface Floater {
	text: string;
	cell: Cell;
	born: number;
	color: string;
}

export interface View {
	hoverSlot: number;
	trace: ChainTrace | null;
	floaters: Floater[];
}

const FLOATER_SECONDS = 1.4;

function drawTerrain(ctx: CanvasRenderingContext2D, g: Game, l: Layout): void {
	const { lawn } = g.sim;
	for (let y = 0; y < lawn.height; y++) {
		for (let x = 0; x < lawn.width; x++) {
			const t = terrainAt(lawn, { x, y });
			const px = l.originX + x * l.cell;
			const py = l.originY + y * l.cell;
			ctx.fillStyle =
				t === 'lawn' || t === 'tree'
					? (x + y) % 2
						? TERRAIN_COLORS.lawnA
						: TERRAIN_COLORS.lawnB
					: t === 'sidewalk'
						? TERRAIN_COLORS.sidewalk
						: t === 'door'
							? TERRAIN_COLORS.door
							: TERRAIN_COLORS.house;
			ctx.fillRect(px, py, l.cell, l.cell);
			if (t === 'tree') {
				ctx.fillStyle = TERRAIN_COLORS.tree;
				ctx.beginPath();
				ctx.arc(px + l.cell / 2, py + l.cell / 2, l.cell * 0.42, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}
	ctx.setLineDash([4, 4]);
	ctx.strokeStyle = TERRAIN_COLORS.slot;
	ctx.lineWidth = 2;
	for (const s of lawn.slots) {
		const c = cellCenter(l, s);
		ctx.beginPath();
		ctx.arc(c.x, c.y, l.cell * 0.38, 0, Math.PI * 2);
		ctx.stroke();
	}
	ctx.setLineDash([]);
}

function drawFacing(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	facing: Dir,
	size: number
): void {
	const v = DIR_VECTORS[facing];
	const tip = { x: x + v.x * size * 0.62, y: y + v.y * size * 0.62 };
	const base = { x: x + v.x * size * 0.3, y: y + v.y * size * 0.3 };
	const side = { x: -v.y * size * 0.18, y: v.x * size * 0.18 };
	ctx.fillStyle = '#ffffff';
	ctx.strokeStyle = '#1b1b1b';
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(tip.x, tip.y);
	ctx.lineTo(base.x + side.x, base.y + side.y);
	ctx.lineTo(base.x - side.x, base.y - side.y);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

function drawContraptions(
	ctx: CanvasRenderingContext2D,
	g: Game,
	l: Layout,
	view: View,
	now: number
): void {
	g.sim.placed.forEach((p, slot) => {
		if (!p) return;
		const spec = CONTRAPTIONS[p.kind];
		const c = cellCenter(l, g.sim.lawn.slots[slot]);
		const half = l.cell * 0.34;
		const busy = p.busyFor > 0;
		const pulse = busy ? 1 + 0.08 * Math.sin(now * 30) : 1;
		ctx.fillStyle = OUTPUT_COLORS[spec.output];
		ctx.strokeStyle = slot === view.hoverSlot ? '#ffffff' : '#1b1b1b';
		ctx.lineWidth = slot === view.hoverSlot ? 3 : 2;
		ctx.beginPath();
		ctx.roundRect(c.x - half * pulse, c.y - half * pulse, half * 2 * pulse, half * 2 * pulse, 6);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#ffffff';
		ctx.font = `bold ${Math.round(l.cell * 0.3)}px system-ui, sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(CONTRAPTION_GLYPHS[p.kind], c.x, c.y);
		drawFacing(ctx, c.x, c.y, p.facing, l.cell);
	});
}

function drawTrace(ctx: CanvasRenderingContext2D, l: Layout, trace: ChainTrace | null): void {
	if (!trace || trace.path.length < 2) return;
	ctx.strokeStyle =
		trace.outcome === 'deflected' ? 'rgba(255,255,255,0.9)' : 'rgba(255,230,120,0.95)';
	ctx.lineWidth = 4;
	ctx.setLineDash([8, 6]);
	ctx.beginPath();
	trace.path.forEach((cell, i) => {
		const c = cellCenter(l, cell);
		if (i === 0) ctx.moveTo(c.x, c.y);
		else ctx.lineTo(c.x, c.y);
	});
	ctx.stroke();
	ctx.setLineDash([]);
	const end = cellCenter(l, trace.path[trace.path.length - 1]);
	ctx.fillStyle = trace.outcome === 'deflected' ? '#ffffff' : '#ffe678';
	ctx.beginPath();
	ctx.arc(end.x, end.y, l.cell * 0.12, 0, Math.PI * 2);
	ctx.fill();
}

function intruderPosition(l: Layout, it: Intruder): { x: number; y: number } {
	const a = cellCenter(l, it.cell);
	if (!it.next) return a;
	const b = cellCenter(l, it.next);
	return { x: a.x + (b.x - a.x) * it.progress, y: a.y + (b.y - a.y) * it.progress };
}

function drawIntruders(ctx: CanvasRenderingContext2D, g: Game, l: Layout, now: number): void {
	for (const it of g.sim.intruders) {
		if (it.status === 'gone') continue;
		const pos = intruderPosition(l, it);
		const wobble = it.status === 'held' ? Math.sin(now * 40 + it.id) * l.cell * 0.06 : 0;
		const r = l.cell * 0.3;
		if (it.wet) {
			ctx.strokeStyle = OUTPUT_COLORS.fluid;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.arc(pos.x + wobble, pos.y, r + 3, 0, Math.PI * 2);
			ctx.stroke();
		}
		const body = INTRUDER_BODIES[it.kind];
		ctx.fillStyle = body.color;
		ctx.strokeStyle = '#1b1b1b';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(pos.x + wobble, pos.y, r, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = '#ffffff';
		ctx.font = `bold ${Math.round(l.cell * 0.26)}px system-ui, sans-serif`;
		ctx.fillText(body.letter, pos.x + wobble, pos.y);
		ctx.font = `${Math.round(l.cell * 0.4)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
		ctx.fillText(INTRUDER_GLYPHS[it.kind], pos.x + wobble, pos.y);
		// Sympathy badge: consequence, shown plainly, never editorialized.
		const s = INTRUDERS[it.kind].sympathy;
		ctx.fillStyle = s >= 7 ? '#ff7eb6' : '#8a8a8a';
		ctx.beginPath();
		ctx.arc(pos.x + r * 0.8, pos.y - r * 0.8, l.cell * 0.11, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#ffffff';
		ctx.font = `bold ${Math.round(l.cell * 0.14)}px system-ui, sans-serif`;
		ctx.fillText(String(s), pos.x + r * 0.8, pos.y - r * 0.8);
	}
}

function drawFloaters(ctx: CanvasRenderingContext2D, l: Layout, view: View, now: number): void {
	view.floaters = view.floaters.filter((f) => now - f.born < FLOATER_SECONDS);
	for (const f of view.floaters) {
		const age = (now - f.born) / FLOATER_SECONDS;
		const c = cellCenter(l, f.cell);
		ctx.font = `bold ${Math.round(l.cell * 0.28)}px system-ui, sans-serif`;
		// Keep the text on the canvas when the event happened at the edge.
		const halfW = ctx.measureText(f.text).width / 2 + 4;
		c.x = Math.max(halfW, Math.min(ctx.canvas.width - halfW, c.x));
		ctx.globalAlpha = 1 - age;
		ctx.fillStyle = f.color;
		ctx.strokeStyle = '#1b1b1b';
		ctx.lineWidth = 3;
		ctx.textAlign = 'center';
		ctx.strokeText(f.text, c.x, c.y - age * l.cell);
		ctx.fillText(f.text, c.x, c.y - age * l.cell);
		ctx.globalAlpha = 1;
	}
}

export function drawFrame(
	ctx: CanvasRenderingContext2D,
	g: Game,
	l: Layout,
	view: View,
	now: number
): void {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	drawTerrain(ctx, g, l);
	drawTrace(ctx, l, view.trace);
	drawContraptions(ctx, g, l, view, now);
	drawIntruders(ctx, g, l, now);
	drawFloaters(ctx, l, view, now);
}
