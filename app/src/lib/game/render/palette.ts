import type { ContraptionKind, IntruderKind, OutputType } from '../core/types';

/** One colour per connection type. The type must be legible at a glance, in flight and at rest. */
export const OUTPUT_COLORS: Record<OutputType, string> = {
	signal: '#f2b705',
	kinetic: '#2f6fed',
	fluid: '#17a2c9',
	hazard: '#d62839'
};

export const CONTRAPTION_GLYPHS: Record<ContraptionKind, string> = {
	leafBlower: 'B',
	springGnome: 'G',
	sprinkler: 'S',
	rake: 'R',
	motionSensor: 'M'
};

export const INTRUDER_GLYPHS: Record<IntruderKind, string> = {
	dogWalker: '🐕',
	kid: '🧒'
};

/** Body colour and letter under the emoji, so intruders stay legible where emoji fonts are missing. */
export const INTRUDER_BODIES: Record<IntruderKind, { color: string; letter: string }> = {
	dogWalker: { color: '#8b5a2b', letter: 'D' },
	kid: { color: '#ff7eb6', letter: 'K' }
};

export const TERRAIN_COLORS = {
	lawnA: '#6fbf4a',
	lawnB: '#67b545',
	sidewalk: '#d9d4c7',
	house: '#b5654a',
	door: '#5a3222',
	tree: '#2f6b2a',
	slot: 'rgba(255,255,255,0.35)'
};
