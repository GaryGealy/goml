import { describe, expect, it } from 'vitest';
import {
	available,
	continueAfterResult,
	newGame,
	placeContraption,
	removeContraption,
	rotateContraption,
	startWave,
	tick,
	type Game
} from '../core/game';
import { TUNING } from '../core/constants';
import { unlockedThrough, WAVES } from '../core/waves';

function playOut(g: Game, maxSeconds = 120): void {
	for (let t = 0; t < maxSeconds && g.phase === 'wave'; t += 0.05) tick(g, 0.05);
}

/** A wave-1 machine on the default lawn: blower -> blower -> rake catches the row-5 walkers in a 3-stage chain. */
function armWaveOne(g: Game): void {
	placeContraption(g, 8, 'leafBlower', 'E'); // (6,5) -> (9,5)
	placeContraption(g, 9, 'leafBlower', 'N'); // (9,5) -> (9,3)
	placeContraption(g, 5, 'rake', 'E'); //       (9,3) -> (10,3), released
	placeContraption(g, 7, 'leafBlower', 'W'); // (2,5) -> sidewalk: deflect
}

describe('build phase', () => {
	it('only allows unlocked contraptions into empty slots', () => {
		const g = newGame();
		expect(available(g)).toEqual(['leafBlower', 'rake']);
		expect(placeContraption(g, 0, 'sprinkler')).toBe(false);
		expect(placeContraption(g, 0, 'rake')).toBe(true);
		expect(placeContraption(g, 0, 'leafBlower')).toBe(false);
		expect(removeContraption(g, 0)).toBe(true);
		expect(g.sim.placed[0]).toBeNull();
	});

	it('rotates during build and during a wave, but places only during build', () => {
		const g = newGame();
		placeContraption(g, 0, 'rake');
		expect(rotateContraption(g, 0)).toBe(true);
		expect(g.sim.placed[0]?.facing).toBe('E');
		startWave(g);
		expect(rotateContraption(g, 0)).toBe(true);
		expect(g.sim.placed[0]?.facing).toBe('S');
		expect(placeContraption(g, 1, 'rake')).toBe(false);
	});

	it('unlocks contraptions wave by wave', () => {
		expect(unlockedThrough(3)).toEqual([
			'leafBlower',
			'rake',
			'sprinkler',
			'springGnome',
			'motionSensor'
		]);
	});
});

describe('waves', () => {
	it('spawns the whole roster and ends the wave when everyone is handled', () => {
		const g = newGame();
		startWave(g);
		playOut(g);
		expect(g.phase).toBe('waveResult');
		expect(g.sim.intruders).toHaveLength(0);
	});

	it('fails par with an empty yard and replays the wave from its checkpoint', () => {
		const g = newGame();
		startWave(g);
		playOut(g);
		expect(g.lastResult?.cleared).toBe(false);
		expect(g.meters.lawnByIntruders).toBeGreaterThan(0);
		continueAfterResult(g);
		expect(g.phase).toBe('build');
		expect(g.waveIndex).toBe(0);
		expect(g.meters.lawnByIntruders).toBe(0);
	});

	it('clears wave 1 with a working machine and moves on', () => {
		const g = newGame();
		armWaveOne(g);
		startWave(g);
		playOut(g);
		expect(g.lastResult?.cleared).toBe(true);
		expect(g.waveScore.longestChain).toBe(3);
		continueAfterResult(g);
		expect(g.phase).toBe('build');
		expect(g.waveIndex).toBe(1);
		expect(g.campaignScore).toBeGreaterThanOrEqual(WAVES[0].par);
	});

	it('ends the run when the lawn is destroyed', () => {
		const g = newGame();
		startWave(g);
		g.meters.lawnByIntruders = TUNING.LAWN_MAX - 0.01;
		playOut(g);
		expect(g.phase).toBe('gameOver');
	});

	it('reaches the campaign end after the last wave', () => {
		const g = newGame();
		g.waveIndex = WAVES.length - 1;
		g.phase = 'waveResult';
		g.lastResult = {
			cleared: true,
			score: { total: 500, chain: 500, mercy: 0, longestChain: 3 },
			par: 450,
			cooled: 0
		};
		continueAfterResult(g);
		expect(g.phase).toBe('campaignEnd');
	});
});

describe('heat over a wave', () => {
	it('cools at wave end only in proportion to restraint toward kids', () => {
		const g = newGame();
		g.waveIndex = 2; // School's Out: all kids
		g.meters.heat = 30;
		startWave(g);
		playOut(g); // empty yard: nobody hurt
		expect(g.lastResult?.cooled).toBe(25);
		expect(g.meters.heat).toBe(5);
	});
});
