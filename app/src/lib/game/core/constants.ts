// Every tuning value lives here. All numbers are first-pass prototype guesses —
// see the spec's "Tuning (for prototyping)" open questions.

/** Fixed simulation step, seconds. */
export const SIM_DT = 1 / 20;

/**
 * Default tuning. Gameplay code reads the live values from TUNING at the moment of use,
 * so the /play debug panel can change them mid-game.
 */
export const DEFAULT_TUNING = Object.freeze({
	/** Lawn damage at which the run ends. */
	LAWN_MAX: 100,
	/** Self-inflicted lawn damage per chain stage beyond the first (the drag across the grass). */
	CHAIN_STAGE_LAWN_DAMAGE: 1.5,

	/** Chain score per stage is (SYMPATHY_PIVOT - sympathy) * CHAIN_POINTS — negative above the pivot. */
	SYMPATHY_PIVOT: 6,
	CHAIN_POINTS: 10,
	/** Mercy score is sympathy * armedness * MERCY_POINTS. */
	MERCY_POINTS: 10,
	/** Placed contraptions at which the lawn counts as fully armed for mercy scoring. */
	ARMED_FULL: 6,
	/** Chains shorter than this are a shove, not a chain, and score nothing. */
	MIN_SCORING_CHAIN: 2,
	/** Hard cap on stages in one chain. */
	MAX_CHAIN: 12,

	HEAT_MAX: 100,
	/** Heat per chain stage per sympathy point. */
	HEAT_PER_STAGE: 1,
	/** Heat per sympathy point when a hazard hits someone. */
	HAZARD_HEAT: 1,
	/** Sympathy at or above which an intruder counts toward restraint cooling. */
	HIGH_SYMPATHY: 7,
	/** Heat removed at wave end for perfect restraint. */
	COOL_MAX: 25,
	/** Heat at which intruders start steering around visible contraptions. */
	WARY_HEAT: 40,

	/** Extra cells a kinetic push carries a wet intruder. */
	WET_SLIDE_BONUS: 1,
	/** Seconds a motion sensor waits before it can fire again. */
	SENSOR_COOLDOWN: 1.5,

	/** Payoff camera: chains reaching this many stages slow the whole game uniformly. */
	PAYOFF_MIN_STAGES: 4,
	PAYOFF_TIME_SCALE: 0.35,
	PAYOFF_SECONDS: 1.2,
	/** Real seconds after a payoff before another can fire. */
	PAYOFF_SUPPRESS: 5
});

export type TuningKey = keyof typeof DEFAULT_TUNING;
export type Tuning = Record<TuningKey, number>;

/** The live values. Mutate only through applyTuning/resetTuning in tuning.ts. */
export const TUNING: Tuning = { ...DEFAULT_TUNING };
