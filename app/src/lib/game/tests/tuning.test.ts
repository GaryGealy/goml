import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_TUNING, TUNING } from '../core/constants';
import { INTRUDERS } from '../core/intruders';
import { chainScore } from '../core/scoring';
import {
	applyTuning,
	changedValues,
	currentValue,
	defaultValue,
	loadTuning,
	resetTuning,
	saveTuning,
	setValue,
	TUNING_SPECS
} from '../tuning';

function memoryStorage() {
	const m = new Map<string, string>();
	return {
		getItem: (k: string) => m.get(k) ?? null,
		setItem: (k: string, v: string) => void m.set(k, v),
		removeItem: (k: string) => void m.delete(k),
		size: () => m.size
	};
}

afterEach(() => resetTuning());

describe('tuning', () => {
	it('every spec starts at its default, inside its slider range', () => {
		for (const s of TUNING_SPECS) {
			const v = currentValue(s.id);
			expect(v).toBe(defaultValue(s.id));
			expect(v).toBeGreaterThanOrEqual(s.min);
			expect(v).toBeLessThanOrEqual(s.max);
		}
	});

	it('covers every TUNING key', () => {
		const ids = new Set(TUNING_SPECS.map((s) => s.id));
		for (const key of Object.keys(DEFAULT_TUNING)) expect(ids.has(key as never)).toBe(true);
	});

	it('changes take effect in gameplay code immediately', () => {
		const before = chainScore(3, 2);
		setValue('CHAIN_POINTS', DEFAULT_TUNING.CHAIN_POINTS * 2);
		expect(chainScore(3, 2)).toBe(before * 2);
		setValue('dogWalker.sympathy', 5);
		expect(INTRUDERS.dogWalker.sympathy).toBe(5);
	});

	it('clamps to the slider range and ignores junk', () => {
		setValue('LAWN_MAX', 1e9);
		expect(TUNING.LAWN_MAX).toBe(300);
		applyTuning({ LAWN_MAX: Number.NaN, nope: 3 } as never);
		expect(TUNING.LAWN_MAX).toBe(300);
	});

	it('reset restores every default, including intruder stats', () => {
		applyTuning({ HEAT_MAX: 50, 'kid.speed': 4 });
		resetTuning();
		expect(changedValues()).toEqual({});
		expect(INTRUDERS.kid.speed).toBe(defaultValue('kid.speed'));
	});

	it('saves only changed values and round-trips through storage', () => {
		const s = memoryStorage();
		applyTuning({ WARY_HEAT: 60, 'kid.lawnDamagePerSecond': 1 });
		saveTuning(s);
		resetTuning();
		loadTuning(s);
		expect(changedValues()).toEqual({ WARY_HEAT: 60, 'kid.lawnDamagePerSecond': 1 });
		resetTuning();
		saveTuning(s);
		expect(s.size()).toBe(0);
	});

	it('survives missing, corrupt, or throwing storage', () => {
		expect(() => loadTuning(undefined)).not.toThrow();
		loadTuning({ getItem: () => '{nope', setItem: () => {}, removeItem: () => {} });
		const throwing = () => {
			throw new Error('denied');
		};
		loadTuning({ getItem: throwing, setItem: throwing, removeItem: throwing });
		saveTuning({ getItem: throwing, setItem: throwing, removeItem: throwing });
		expect(changedValues()).toEqual({});
	});
});
