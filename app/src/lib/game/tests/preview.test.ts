import { describe, expect, it } from 'vitest';
import { newGame, placeContraption } from '../core/game';
import { previewSlot } from '../core/preview';

describe('previewSlot', () => {
	it('shows score and heat per intruder kind before the machine fires', () => {
		const g = newGame();
		placeContraption(g, 8, 'leafBlower', 'E');
		placeContraption(g, 9, 'leafBlower', 'N');
		placeContraption(g, 5, 'rake', 'E');
		const p = previewSlot(g, 8);
		expect(p.trace.stages).toEqual([8, 9, 5]);
		const dog = p.perKind.find((k) => k.kind === 'dogWalker');
		const kid = p.perKind.find((k) => k.kind === 'kid');
		expect(dog).toEqual({ kind: 'dogWalker', score: 120, heat: 8 }); // 3*2 chain + 2 rake
		expect(kid).toEqual({ kind: 'kid', score: -90, heat: 36 }); // 3*9 chain + 9 rake
	});

	it('adds mercy for a deflection, scaled by how armed the lawn is', () => {
		const g = newGame();
		placeContraption(g, 7, 'leafBlower', 'W'); // (2,5) blows onto the west sidewalk
		const kid = previewSlot(g, 7).perKind.find((k) => k.kind === 'kid');
		expect(kid).toEqual({ kind: 'kid', score: 15, heat: 0 }); // 9 * (1/6) * 10, rounded
	});
});
