import { TUNING } from '../core/constants';

/**
 * Uniform slow motion when a long chain fires. Everything slows together, so it is
 * balance-neutral spectacle — except for the extra reaction time, which is what the long chain buys.
 * Times are real (wall-clock) seconds.
 */
export class PayoffCamera {
	private until = -Infinity;
	private suppressedUntil = -Infinity;

	onStage(chainLength: number, now: number): boolean {
		if (chainLength < TUNING.PAYOFF_MIN_STAGES || now < this.suppressedUntil) return false;
		this.until = now + TUNING.PAYOFF_SECONDS;
		this.suppressedUntil = now + TUNING.PAYOFF_SUPPRESS;
		return true;
	}

	timeScale(now: number): number {
		return now < this.until ? TUNING.PAYOFF_TIME_SCALE : 1;
	}
}
