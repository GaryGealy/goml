import type { ContraptionKind, ContraptionSpec } from './types';

/** The contraption registry. Data, not logic. */
export const CONTRAPTIONS: Record<ContraptionKind, ContraptionSpec> = {
	leafBlower: {
		kind: 'leafBlower',
		name: 'Leaf Blower',
		output: 'kinetic',
		range: 2,
		push: 3,
		stageSeconds: 0.3
	},
	springGnome: {
		kind: 'springGnome',
		name: 'Spring-Loaded Gnome',
		output: 'kinetic',
		range: 0,
		push: 2,
		stageSeconds: 0.9
	},
	sprinkler: {
		kind: 'sprinkler',
		name: 'Sprinkler',
		output: 'fluid',
		range: 2,
		push: 1,
		stageSeconds: 0.5
	},
	rake: { kind: 'rake', name: 'Rake', output: 'hazard', range: 0, push: 1, stageSeconds: 0.4 },
	motionSensor: {
		kind: 'motionSensor',
		name: 'Motion Sensor',
		output: 'signal',
		range: 4,
		push: 0,
		stageSeconds: 0
	}
};
