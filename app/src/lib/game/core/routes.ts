import { CONTRAPTIONS } from './contraptions';
import type { Game } from './game';
import { cellIndex, sameCell, slotAt, type Lawn } from './lawn';
import { isWary } from './meters';
import { isReceiver } from './propagation';
import { distanceField, nextStep } from './steering';
import type { Cell, IntruderKind, Placed } from './types';
import { WAVES } from './waves';

export interface RoutePreview {
	kind: IntruderKind;
	/** Seconds after the wave starts. */
	at: number;
	/** Every cell walked, start to end. */
	path: Cell[];
	/** Slot whose contraption grabs them (the walk ends there), or -1 if they cross untouched. */
	caughtSlot: number;
	/** Indices into `path` where the walker passes close enough to set off a motion sensor. */
	sensorTrips: number[];
	/** Predicted with wary steering (heat at or above the wary threshold). */
	wary: boolean;
}

/**
 * Walk one intruder from `from` to `to` with the simulation's own steering rules, until a
 * contraption grabs them or they leave. Exact for an undisturbed walk: once a chain shoves
 * someone, they re-route from wherever they land, which no preview can know in advance.
 */
export function predictRoute(
	lawn: Lawn,
	placed: (Placed | null)[],
	from: Cell,
	to: Cell,
	wary: boolean
): Omit<RoutePreview, 'kind' | 'at' | 'wary'> {
	const avoid = new Set<number>();
	if (wary) placed.forEach((p, slot) => p && avoid.add(cellIndex(lawn, lawn.slots[slot])));
	const plain = distanceField(lawn, to);
	const field = wary ? distanceField(lawn, to, avoid) : plain;
	const sensors = lawn.slots.filter(
		(_, slot) => placed[slot] && CONTRAPTIONS[placed[slot].kind].output === 'signal'
	);
	const nearSensor = (c: Cell) =>
		sensors.some((s) => Math.abs(c.x - s.x) + Math.abs(c.y - s.y) <= 1);

	const path: Cell[] = [{ ...from }];
	const sensorTrips: number[] = nearSensor(from) ? [0] : [];
	let cur = from;
	// Each step strictly shortens the distance field, so this bound is never reached in practice.
	for (let i = 0; i < lawn.width * lawn.height; i++) {
		let next = nextStep(lawn, field, cur, to);
		// Wary but boxed in: they hold their nose and walk past the contraption anyway.
		if (!next && wary) next = nextStep(lawn, plain, cur, to);
		if (!next) break;
		path.push(next);
		cur = next;
		if (nearSensor(cur)) sensorTrips.push(path.length - 1);
		if (sameCell(cur, to)) break;
		const slot = slotAt(lawn, cur);
		if (slot >= 0 && isReceiver(placed[slot])) return { path, caughtSlot: slot, sensorTrips };
	}
	return { path, caughtSlot: -1, sensorTrips };
}

/** Every intruder in the current wave, in spawn order, as they would walk in right now. */
export function predictWaveRoutes(g: Game): RoutePreview[] {
	const wave = WAVES[Math.min(g.waveIndex, WAVES.length - 1)];
	const wary = isWary(g.meters);
	return wave.roster.map((s) => ({
		kind: s.kind,
		at: s.at,
		wary,
		...predictRoute(g.sim.lawn, g.sim.placed, s.from, s.to, wary)
	}));
}
