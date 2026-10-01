import { DEFAULT_TUNING, TUNING, type TuningKey } from './core/constants';
import { INTRUDERS } from './core/intruders';
import type { IntruderKind } from './core/types';

/** Intruder stats the debug panel can tune. */
export const INTRUDER_STATS = ['speed', 'sympathy', 'lawnDamagePerSecond'] as const;
export type IntruderStat = (typeof INTRUDER_STATS)[number];

/** Tunable id: a TUNING key, or `<intruderKind>.<stat>`. */
export type TuningId = TuningKey | `${IntruderKind}.${IntruderStat}`;

export interface TuningSpec {
	id: TuningId;
	label: string;
	group: string;
	min: number;
	max: number;
	step: number;
}

const k = (id: TuningKey, label: string, group: string, min: number, max: number, step: number) =>
	({ id, label, group, min, max, step }) satisfies TuningSpec;

/** Slider metadata, in panel order. Ranges are wide on purpose: this is for exploring. */
export const TUNING_SPECS: TuningSpec[] = [
	k('LAWN_MAX', 'Lawn max (run ends)', 'Lawn & chains', 20, 300, 5),
	k('CHAIN_STAGE_LAWN_DAMAGE', 'Lawn damage per extra stage', 'Lawn & chains', 0, 10, 0.25),
	k('MIN_SCORING_CHAIN', 'Min scoring chain', 'Lawn & chains', 1, 6, 1),
	k('MAX_CHAIN', 'Max chain', 'Lawn & chains', 2, 30, 1),
	k('SYMPATHY_PIVOT', 'Sympathy pivot', 'Scoring', 0, 10, 0.5),
	k('CHAIN_POINTS', 'Chain points', 'Scoring', 0, 50, 1),
	k('MERCY_POINTS', 'Mercy points', 'Scoring', 0, 50, 1),
	k('ARMED_FULL', 'Fully armed at', 'Scoring', 1, 15, 1),
	k('HEAT_MAX', 'Heat max', 'Heat', 20, 300, 5),
	k('HEAT_PER_STAGE', 'Heat per stage × sympathy', 'Heat', 0, 5, 0.1),
	k('HAZARD_HEAT', 'Hazard heat × sympathy', 'Heat', 0, 5, 0.1),
	k('HIGH_SYMPATHY', 'High sympathy at', 'Heat', 0, 10, 1),
	k('COOL_MAX', 'Max restraint cooling', 'Heat', 0, 100, 1),
	k('WARY_HEAT', 'Wary at heat', 'Heat', 0, 300, 5),
	k('WET_SLIDE_BONUS', 'Wet slide bonus (cells)', 'Contraptions', 0, 5, 1),
	k('SENSOR_COOLDOWN', 'Sensor cooldown (s)', 'Contraptions', 0, 10, 0.1),
	k('PAYOFF_MIN_STAGES', 'Payoff at stages', 'Payoff camera', 2, 15, 1),
	k('PAYOFF_TIME_SCALE', 'Payoff time scale', 'Payoff camera', 0.05, 1, 0.05),
	k('PAYOFF_SECONDS', 'Payoff seconds', 'Payoff camera', 0, 5, 0.1),
	k('PAYOFF_SUPPRESS', 'Payoff cooldown (s)', 'Payoff camera', 0, 30, 0.5),
	...(Object.keys(INTRUDERS) as IntruderKind[]).flatMap((kind) => {
		const group = INTRUDERS[kind].name;
		return [
			{ id: `${kind}.speed`, label: 'Speed (cells/s)', group, min: 0.1, max: 5, step: 0.1 },
			{ id: `${kind}.sympathy`, label: 'Sympathy', group, min: 0, max: 10, step: 1 },
			{
				id: `${kind}.lawnDamagePerSecond`,
				label: 'Lawn damage/s',
				group,
				min: 0,
				max: 5,
				step: 0.05
			}
		] satisfies TuningSpec[];
	})
];

const SPEC_BY_ID = new Map(TUNING_SPECS.map((s) => [s.id, s]));

/** Captured before anything can change them, so reset is exact. */
const DEFAULTS: Record<string, number> = {
	...DEFAULT_TUNING,
	...Object.fromEntries(
		(Object.keys(INTRUDERS) as IntruderKind[]).flatMap((kind) =>
			INTRUDER_STATS.map((stat) => [`${kind}.${stat}`, INTRUDERS[kind][stat]])
		)
	)
};

export type TuningValues = Partial<Record<TuningId, number>>;

export function defaultValue(id: TuningId): number {
	return DEFAULTS[id];
}

export function currentValue(id: TuningId): number {
	if (id in TUNING) return TUNING[id as TuningKey];
	const [kind, stat] = id.split('.') as [IntruderKind, IntruderStat];
	return INTRUDERS[kind][stat];
}

/** Set one value, clamped to its slider range. Unknown ids and non-numbers are ignored. */
export function setValue(id: TuningId, value: number): void {
	const spec = SPEC_BY_ID.get(id);
	if (!spec || typeof value !== 'number' || !Number.isFinite(value)) return;
	const v = Math.min(spec.max, Math.max(spec.min, value));
	if (id in TUNING) {
		TUNING[id as TuningKey] = v;
	} else {
		const [kind, stat] = id.split('.') as [IntruderKind, IntruderStat];
		INTRUDERS[kind][stat] = v;
	}
}

export function applyTuning(values: TuningValues): void {
	for (const [id, v] of Object.entries(values)) setValue(id as TuningId, v as number);
}

export function resetTuning(): void {
	for (const spec of TUNING_SPECS) setValue(spec.id, DEFAULTS[spec.id]);
}

/** Only the values that differ from defaults: what you'd paste back into the source. */
export function changedValues(): TuningValues {
	const out: TuningValues = {};
	for (const spec of TUNING_SPECS) {
		const v = currentValue(spec.id);
		if (v !== DEFAULTS[spec.id]) out[spec.id] = v;
	}
	return out;
}

const KEY = 'gomy.tuning.v1';
type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Storage can be missing or throw (private windows, blocked site data). Tuning is best effort. */
export function loadTuning(storage: KV | undefined): void {
	try {
		const raw = storage?.getItem(KEY);
		if (raw) applyTuning(JSON.parse(raw) as TuningValues);
	} catch {
		// Ignore corrupt or unavailable storage.
	}
}

export function saveTuning(storage: KV | undefined): void {
	try {
		const changed = changedValues();
		if (Object.keys(changed).length) storage?.setItem(KEY, JSON.stringify(changed));
		else storage?.removeItem(KEY);
	} catch {
		// Best effort only.
	}
}
