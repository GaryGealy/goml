import type { Cell, ContraptionKind, IntruderKind } from './types';

export interface SpawnEntry {
	kind: IntruderKind;
	/** Seconds after the wave starts. */
	at: number;
	from: Cell;
	to: Cell;
}

export interface WaveDef {
	name: string;
	/** The homeowner's sign for this wave. The voice never escalates. */
	sign: string;
	/** Score floor that clears the wave. */
	par: number;
	/** Contraptions that become available from this wave on. */
	unlocks: ContraptionKind[];
	roster: SpawnEntry[];
}

// Routes across DEFAULT_LAWN_ROWS: sidewalk columns x=0 and x=11, sidewalk row y=8.
const R = {
	swToNe: { from: { x: 0, y: 7 }, to: { x: 11, y: 2 } },
	wToE: { from: { x: 0, y: 5 }, to: { x: 11, y: 5 } },
	nwToSe: { from: { x: 0, y: 3 }, to: { x: 11, y: 6 } },
	seToNw: { from: { x: 11, y: 7 }, to: { x: 0, y: 2 } },
	eToSw: { from: { x: 11, y: 4 }, to: { x: 0, y: 6 } },
	sToNe: { from: { x: 2, y: 8 }, to: { x: 11, y: 3 } },
	sToNw: { from: { x: 9, y: 8 }, to: { x: 0, y: 4 } }
};

const e = (kind: IntruderKind, at: number, route: { from: Cell; to: Cell }): SpawnEntry => ({
	kind,
	at,
	...route
});

export const WAVES: WaveDef[] = [
	{
		name: 'Keep Off the Grass',
		sign: 'PLEASE KEEP OFF THE GRASS. THANK YOU.',
		par: 100,
		unlocks: ['leafBlower', 'rake'],
		roster: [
			e('dogWalker', 0, R.wToE),
			e('dogWalker', 6, R.swToNe),
			e('dogWalker', 12, R.wToE),
			e('dogWalker', 18, R.seToNw)
		]
	},
	{
		name: 'Mixed Company',
		sign: 'FRIENDLY REMINDER: THIS IS A LAWN, NOT A SHORTCUT.',
		par: 150,
		unlocks: ['sprinkler'],
		roster: [
			e('dogWalker', 0, R.wToE),
			e('kid', 4, R.sToNe),
			e('dogWalker', 8, R.nwToSe),
			e('kid', 12, R.eToSw),
			e('dogWalker', 16, R.swToNe)
		]
	},
	{
		name: "School's Out",
		sign: 'CHILDREN ARE WELCOME TO ENJOY THE LAWN FROM THE SIDEWALK.',
		par: 250,
		unlocks: ['springGnome'],
		roster: [
			e('kid', 0, R.wToE),
			e('kid', 3, R.sToNe),
			e('kid', 6, R.eToSw),
			e('kid', 9, R.swToNe),
			e('kid', 12, R.sToNw),
			e('kid', 15, R.nwToSe)
		]
	},
	{
		name: 'Rush Hour',
		sign: 'Posted to Nextdoor: "Does anyone\'s HOA actually enforce anything? Asking for a neighbor."',
		par: 300,
		unlocks: ['motionSensor'],
		roster: [
			e('dogWalker', 0, R.wToE),
			e('kid', 2, R.sToNe),
			e('dogWalker', 4, R.seToNw),
			e('dogWalker', 6, R.nwToSe),
			e('kid', 8, R.eToSw),
			e('dogWalker', 10, R.swToNe),
			e('kid', 12, R.sToNw),
			e('dogWalker', 14, R.wToE)
		]
	},
	{
		name: 'The Whole Block',
		sign: 'PLEASE BE CONSIDERATE OF OTHERS.',
		par: 450,
		unlocks: [],
		roster: [
			e('dogWalker', 0, R.wToE),
			e('dogWalker', 1.5, R.seToNw),
			e('kid', 3, R.sToNe),
			e('dogWalker', 4.5, R.nwToSe),
			e('kid', 6, R.eToSw),
			e('dogWalker', 7.5, R.swToNe),
			e('kid', 9, R.sToNw),
			e('dogWalker', 10.5, R.wToE),
			e('kid', 12, R.swToNe),
			e('dogWalker', 13.5, R.eToSw),
			e('kid', 15, R.wToE),
			e('dogWalker', 16.5, R.sToNe)
		]
	}
];

/** The last note, whatever happened. */
export const CAMPAIGN_END_NOTE =
	'Note taped to the door: "The grass by the mailbox is still not right."';

/** Every contraption available by wave `waveIndex`, in unlock order. */
export function unlockedThrough(waveIndex: number): ContraptionKind[] {
	return WAVES.slice(0, waveIndex + 1).flatMap((w) => w.unlocks);
}
