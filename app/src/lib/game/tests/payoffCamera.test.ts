import { describe, expect, it } from 'vitest';
import { PayoffCamera } from '../render/payoffCamera';

describe('PayoffCamera', () => {
	it('slows time for 4+ stage chains, then suppresses repeats', () => {
		const cam = new PayoffCamera();
		expect(cam.onStage(3, 0)).toBe(false);
		expect(cam.timeScale(0)).toBe(1);
		expect(cam.onStage(4, 10)).toBe(true);
		expect(cam.timeScale(10.5)).toBe(0.35);
		expect(cam.timeScale(11.3)).toBe(1);
		expect(cam.onStage(5, 12)).toBe(false); // inside the suppression window
		expect(cam.onStage(5, 15.1)).toBe(true);
	});
});
