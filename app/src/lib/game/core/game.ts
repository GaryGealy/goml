import { HIGH_SYMPATHY } from './constants';
import { INTRUDERS } from './intruders';
import { DEFAULT_LAWN_ROWS, parseLawn, rotateCW } from './lawn';
import {
	applyMeterEvent,
	coolAfterWave,
	isLawnDestroyed,
	isWary,
	newMeters,
	type Meters
} from './meters';
import { armedness, newWaveScore, scoreEvent, type WaveScore } from './scoring';
import { activeIntruders, newSim, spawnIntruder, stepSim, type SimState } from './sim';
import type { ContraptionKind, Dir, Placed, SimEvent } from './types';
import { unlockedThrough, WAVES } from './waves';

export type Phase = 'build' | 'wave' | 'waveResult' | 'campaignEnd' | 'gameOver';

export interface WaveResult {
	cleared: boolean;
	score: WaveScore;
	par: number;
	cooled: number;
}

export interface Game {
	phase: Phase;
	waveIndex: number;
	sim: SimState;
	meters: Meters;
	waveScore: WaveScore;
	/** Sum of cleared waves' scores. */
	campaignScore: number;
	waveTime: number;
	spawned: number;
	/** High-sympathy intruders this wave, and the ids of those who got hurt. */
	highSympathyTotal: number;
	highSympathyHurt: Set<number>;
	/** Meters as they stood when the wave began, restored on a par failure. */
	checkpoint: Meters;
	lastResult: WaveResult | null;
}

export function newGame(lawnRows: string[] = DEFAULT_LAWN_ROWS): Game {
	const meters = newMeters();
	return {
		phase: 'build',
		waveIndex: 0,
		sim: newSim(parseLawn(lawnRows)),
		meters,
		waveScore: newWaveScore(),
		campaignScore: 0,
		waveTime: 0,
		spawned: 0,
		highSympathyTotal: 0,
		highSympathyHurt: new Set(),
		checkpoint: { ...meters },
		lastResult: null
	};
}

export function available(g: Game): ContraptionKind[] {
	return unlockedThrough(g.waveIndex);
}

export function placedCount(g: Game): number {
	return g.sim.placed.filter(Boolean).length;
}

/** Build phase only: put a contraption into an empty slot, facing north. */
export function placeContraption(
	g: Game,
	slot: number,
	kind: ContraptionKind,
	facing: Dir = 'N'
): boolean {
	if (g.phase !== 'build' || g.sim.placed[slot] !== null || !available(g).includes(kind))
		return false;
	g.sim.placed[slot] = { kind, facing, busyFor: 0, holding: null } satisfies Placed;
	return true;
}

export function removeContraption(g: Game, slot: number): boolean {
	if (g.phase !== 'build' || !g.sim.placed[slot]) return false;
	g.sim.placed[slot] = null;
	return true;
}

/** Rotation is the wiring, and it stays live during a wave. */
export function rotateContraption(g: Game, slot: number): boolean {
	const p = g.sim.placed[slot];
	if (!p || (g.phase !== 'build' && g.phase !== 'wave')) return false;
	p.facing = rotateCW(p.facing);
	return true;
}

export function startWave(g: Game): boolean {
	if (g.phase !== 'build') return false;
	g.phase = 'wave';
	g.waveTime = 0;
	g.spawned = 0;
	g.waveScore = newWaveScore();
	g.highSympathyTotal = 0;
	g.highSympathyHurt = new Set();
	g.checkpoint = { ...g.meters };
	g.sim.intruders = [];
	return true;
}

function track(g: Game, e: SimEvent): void {
	if (e.type === 'spawned' && INTRUDERS[e.kind].sympathy >= HIGH_SYMPATHY) g.highSympathyTotal++;
	if (
		(e.type === 'harmed' || e.type === 'chainCompleted') &&
		INTRUDERS[e.kind].sympathy >= HIGH_SYMPATHY
	) {
		g.highSympathyHurt.add(e.intruderId);
	}
}

function endWave(g: Game): void {
	const wave = WAVES[g.waveIndex];
	const cleared = g.waveScore.total >= wave.par;
	const cooled = coolAfterWave(g.meters, g.highSympathyTotal, g.highSympathyHurt.size);
	g.lastResult = { cleared, score: g.waveScore, par: wave.par, cooled };
	g.sim.intruders = [];
	for (const p of g.sim.placed) if (p) Object.assign(p, { busyFor: 0, holding: null });
	g.phase = 'waveResult';
}

/** Advance a running wave by `dt` seconds of game time. */
export function tick(g: Game, dt: number): SimEvent[] {
	if (g.phase !== 'wave') return [];
	const wave = WAVES[g.waveIndex];
	const events: SimEvent[] = [];
	g.waveTime += dt;
	while (g.spawned < wave.roster.length && wave.roster[g.spawned].at <= g.waveTime) {
		const s = wave.roster[g.spawned++];
		spawnIntruder(g.sim, s.kind, s.from, s.to, events);
	}
	events.push(...stepSim(g.sim, dt, { wary: isWary(g.meters) }));
	const armed = armedness(placedCount(g));
	for (const e of events) {
		track(g, e);
		applyMeterEvent(g.meters, e);
		scoreEvent(g.waveScore, e, armed);
	}
	if (isLawnDestroyed(g.meters)) {
		g.phase = 'gameOver';
	} else if (g.spawned === wave.roster.length && activeIntruders(g.sim).length === 0) {
		endWave(g);
	}
	return events;
}

/** From the result screen: next wave if par was met, otherwise replay this one from its checkpoint. */
export function continueAfterResult(g: Game): void {
	if (g.phase !== 'waveResult' || !g.lastResult) return;
	if (g.lastResult.cleared) {
		g.campaignScore += g.lastResult.score.total;
		g.waveIndex++;
		g.phase = g.waveIndex >= WAVES.length ? 'campaignEnd' : 'build';
	} else {
		g.meters = { ...g.checkpoint };
		g.phase = 'build';
	}
}
