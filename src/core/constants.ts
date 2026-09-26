// Every tuning value lives here. All numbers are first-pass prototype guesses —
// see the spec's "Tuning (for prototyping)" open questions.

/** Fixed simulation step, seconds. */
export const SIM_DT = 1 / 20;

/** Lawn damage at which the run ends. */
export const LAWN_MAX = 100;
/** Self-inflicted lawn damage per chain stage beyond the first (the drag across the grass). */
export const CHAIN_STAGE_LAWN_DAMAGE = 1.5;

/** Chain score per stage is (SYMPATHY_PIVOT - sympathy) * CHAIN_POINTS — negative above the pivot. */
export const SYMPATHY_PIVOT = 6;
export const CHAIN_POINTS = 10;
/** Mercy score is sympathy * armedness * MERCY_POINTS. */
export const MERCY_POINTS = 10;
/** Placed contraptions at which the lawn counts as fully armed for mercy scoring. */
export const ARMED_FULL = 6;
/** Chains shorter than this are a shove, not a chain, and score nothing. */
export const MIN_SCORING_CHAIN = 2;
/** Hard cap on stages in one chain. */
export const MAX_CHAIN = 12;

export const HEAT_MAX = 100;
/** Heat per chain stage per sympathy point. */
export const HEAT_PER_STAGE = 1;
/** Heat per sympathy point when a hazard hits someone. */
export const HAZARD_HEAT = 1;
/** Sympathy at or above which an intruder counts toward restraint cooling. */
export const HIGH_SYMPATHY = 7;
/** Heat removed at wave end for perfect restraint. */
export const COOL_MAX = 25;
/** Heat at which intruders start steering around visible contraptions. */
export const WARY_HEAT = 40;

/** Extra cells a kinetic push carries a wet intruder. */
export const WET_SLIDE_BONUS = 1;
/** Seconds a motion sensor waits before it can fire again. */
export const SENSOR_COOLDOWN = 1.5;

/** Payoff camera: chains reaching this many stages slow the whole game uniformly. */
export const PAYOFF_MIN_STAGES = 4;
export const PAYOFF_TIME_SCALE = 0.35;
export const PAYOFF_SECONDS = 1.2;
/** Real seconds after a payoff before another can fire. */
export const PAYOFF_SUPPRESS = 5;
