import { TUNING } from './constants';
import { INTRUDERS } from './intruders';
import type { SimEvent } from './types';

/** Transport chain score: stages x inverted sympathy. Negative on sympathetic targets. */
export function chainScore(length: number, sympathy: number): number {
	if (length < TUNING.MIN_SCORING_CHAIN) return 0;
	return length * (TUNING.SYMPATHY_PIVOT - sympathy) * TUNING.CHAIN_POINTS;
}

/** 0..1 — how armed the lawn is. An empty yard earns no credit for mercy. */
export function armedness(placedCount: number): number {
	return Math.min(1, placedCount / TUNING.ARMED_FULL);
}

/** Mercy score for deflecting someone off the property. */
export function mercyScore(sympathy: number, armed: number): number {
	return Math.round(sympathy * armed * TUNING.MERCY_POINTS);
}

export function chainHeat(length: number, sympathy: number): number {
	if (length < TUNING.MIN_SCORING_CHAIN) return 0;
	return length * sympathy * TUNING.HEAT_PER_STAGE;
}

export function hazardHeat(sympathy: number): number {
	return sympathy * TUNING.HAZARD_HEAT;
}

/** Heat removed at wave end, in proportion to how few high-sympathy intruders were hurt. */
export function waveCooling(highSympathyTotal: number, highSympathyHurt: number): number {
	if (highSympathyTotal === 0) return 0;
	return TUNING.COOL_MAX * (1 - highSympathyHurt / highSympathyTotal);
}

export interface WaveScore {
	total: number;
	chain: number;
	mercy: number;
	longestChain: number;
}

export function newWaveScore(): WaveScore {
	return { total: 0, chain: 0, mercy: 0, longestChain: 0 };
}

/** Apply one simulation event to the wave score. Returns the points it was worth (for floating text). */
export function scoreEvent(ws: WaveScore, e: SimEvent, armed: number): number {
	if (e.type === 'chainCompleted') {
		const pts = chainScore(e.length, INTRUDERS[e.kind].sympathy);
		ws.chain += pts;
		ws.total += pts;
		ws.longestChain = Math.max(ws.longestChain, e.length);
		return pts;
	}
	if (e.type === 'deflected') {
		const pts = mercyScore(INTRUDERS[e.kind].sympathy, armed);
		ws.mercy += pts;
		ws.total += pts;
		return pts;
	}
	return 0;
}
