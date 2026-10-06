import { describe, expect, it } from 'vitest';
import { TUNING } from '../core/constants';
import { newGame, placeContraption } from '../core/game';
import { DEFAULT_LAWN_ROWS, parseLawn, sameCell, slotAt } from '../core/lawn';
import { predictRoute, predictWaveRoutes } from '../core/routes';
import { newSim, spawnIntruder, stepSim } from '../core/sim';
import type { Cell } from '../core/types';
import { WAVES } from '../core/waves';

/** Run the real simulation for one walker and record every cell it stands on. */
function simulatedWalk(from: Cell, to: Cell): Cell[] {
	const sim = newSim(parseLawn(DEFAULT_LAWN_ROWS));
	const it = spawnIntruder(sim, 'dogWalker', from, to);
	const cells = [{ ...it.cell }];
	for (let i = 0; i < 20000 && it.status !== 'gone'; i++) {
		stepSim(sim, 0.05, { wary: false });
		if (!sameCell(cells[cells.length - 1], it.cell)) cells.push({ ...it.cell });
	}
	return cells;
}

describe('route preview', () => {
	it('matches the cells the simulation actually walks, for every route in the campaign', () => {
		const lawn = parseLawn(DEFAULT_LAWN_ROWS);
		const placed = lawn.slots.map(() => null);
		for (const wave of WAVES) {
			for (const s of wave.roster) {
				const r = predictRoute(lawn, placed, s.from, s.to, false);
				expect(r.path).toEqual(simulatedWalk(s.from, s.to));
				expect(r.caughtSlot).toBe(-1);
			}
		}
	});

	it('stops where a contraption catches the walker', () => {
		const g = newGame();
		const [first] = predictWaveRoutes(g);
		const slotCell = first.path.find((c) => slotAt(g.sim.lawn, c) >= 0)!;
		const slot = slotAt(g.sim.lawn, slotCell);
		placeContraption(g, slot, 'rake');
		const [after] = predictWaveRoutes(g);
		expect(after.caughtSlot).toBe(slot);
		expect(after.path.at(-1)).toEqual(slotCell);
	});

	it('marks where a walker trips a motion sensor, and keeps walking', () => {
		const g = newGame();
		g.waveIndex = 3; // motion sensor unlocked
		const [first] = predictWaveRoutes(g);
		const slotCell = first.path.find((c) => slotAt(g.sim.lawn, c) >= 0)!;
		placeContraption(g, slotAt(g.sim.lawn, slotCell), 'motionSensor');
		const [after] = predictWaveRoutes(g);
		expect(after.caughtSlot).toBe(-1);
		expect(after.sensorTrips.length).toBeGreaterThan(0);
		expect(after.path.at(-1)).toEqual(WAVES[3].roster[0].to);
	});

	it('wary walkers route around contraptions when they can', () => {
		const g = newGame();
		const [first] = predictWaveRoutes(g);
		const slotCell = first.path.find((c) => slotAt(g.sim.lawn, c) >= 0)!;
		placeContraption(g, slotAt(g.sim.lawn, slotCell), 'rake');
		g.meters.heat = TUNING.WARY_HEAT;
		const [wary] = predictWaveRoutes(g);
		expect(wary.wary).toBe(true);
		expect(wary.caughtSlot).toBe(-1);
		expect(wary.path.some((c) => sameCell(c, slotCell))).toBe(false);
	});

	it('lists the current wave in spawn order with kind and timing', () => {
		const g = newGame();
		const routes = predictWaveRoutes(g);
		expect(routes.map((r) => [r.kind, r.at])).toEqual(WAVES[0].roster.map((s) => [s.kind, s.at]));
	});
});
