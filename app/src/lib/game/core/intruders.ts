import type { IntruderKind, IntruderSpec } from './types';

/** The intruder roster for this prototype. Data, not logic. */
export const INTRUDERS: Record<IntruderKind, IntruderSpec> = {
	// The founding grievance: slow, and the dog does real damage.
	dogWalker: {
		kind: 'dogWalker',
		name: 'Dog Walker',
		speed: 0.8,
		sympathy: 2,
		lawnDamagePerSecond: 0.5
	},
	kid: { kind: 'kid', name: 'Kid', speed: 1.6, sympathy: 9, lawnDamagePerSecond: 0.25 }
};
