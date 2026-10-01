const KEY = 'gomy.save.v1';

export interface Save {
	bestCampaignScore: number;
	/** Highest wave number (1-based) reached. */
	furthestWave: number;
}

type KV = Pick<Storage, 'getItem' | 'setItem'>;

const EMPTY: Save = { bestCampaignScore: 0, furthestWave: 0 };

/** Storage can be missing or throw (private windows, blocked site data). The game must run anyway. */
export function loadSave(storage: KV | undefined): Save {
	try {
		const raw = storage?.getItem(KEY);
		if (!raw) return { ...EMPTY };
		const parsed = JSON.parse(raw) as Partial<Save>;
		return {
			bestCampaignScore: Number(parsed.bestCampaignScore) || 0,
			furthestWave: Number(parsed.furthestWave) || 0
		};
	} catch {
		return { ...EMPTY };
	}
}

export function recordRun(save: Save, campaignScore: number, waveReached: number): Save {
	return {
		bestCampaignScore: Math.max(save.bestCampaignScore, campaignScore),
		furthestWave: Math.max(save.furthestWave, waveReached)
	};
}

export function writeSave(storage: KV | undefined, save: Save): void {
	try {
		storage?.setItem(KEY, JSON.stringify(save));
	} catch {
		// Best effort only.
	}
}
