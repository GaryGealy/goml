import { describe, expect, it } from 'vitest';
import { loadSave, recordRun, writeSave } from '../src/ui/save';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('save', () => {
  it('round-trips and keeps the best values', () => {
    const s = memoryStorage();
    writeSave(s, recordRun(loadSave(s), 300, 2));
    writeSave(s, recordRun(loadSave(s), 120, 3));
    expect(loadSave(s)).toEqual({ bestCampaignScore: 300, furthestWave: 3 });
  });
  it('survives missing, corrupt, or throwing storage', () => {
    expect(loadSave(undefined)).toEqual({ bestCampaignScore: 0, furthestWave: 0 });
    expect(loadSave({ getItem: () => '{nope', setItem: () => {} })).toEqual({ bestCampaignScore: 0, furthestWave: 0 });
    const throwing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadSave(throwing)).toEqual({ bestCampaignScore: 0, furthestWave: 0 });
    expect(() => writeSave(throwing, { bestCampaignScore: 1, furthestWave: 1 })).not.toThrow();
  });
});
