import { create } from 'zustand';
import { api } from '@/api/client';

export interface GrowthPoint {
  id: string;
  measuredAt: string;
  ageMonths: number;
  weightKg: number | null;
  heightCm: number | null;
  headCm: number | null;
}

interface GrowthState {
  points: GrowthPoint[];
  loading: boolean;
  error: string | null;
  load: (childId: string) => Promise<void>;
  add: (childId: string, entry: { weightKg?: number; heightCm?: number; headCm?: number }) => Promise<void>;
  remove: (childId: string, entryId: string) => Promise<void>;
}

/** ზრდის დინამიკა — გაზომვები და მათი ისტორია. */
export const useGrowth = create<GrowthState>((set, get) => ({
  points: [],
  loading: false,
  error: null,

  async load(childId) {
    set({ loading: true, error: null });
    try {
      set({ points: await api<GrowthPoint[]>(`/children/${childId}/growth`) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'ვერ ჩაიტვირთა' });
    } finally {
      set({ loading: false });
    }
  },

  async add(childId, entry) {
    set({ error: null });
    try {
      await api(`/children/${childId}/growth`, {
        method: 'POST',
        body: { measuredAt: new Date().toISOString(), ...entry },
      });
      await get().load(childId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'შენახვა ვერ მოხერხდა' });
    }
  },

  async remove(childId, entryId) {
    await api(`/children/${childId}/growth/${entryId}`, { method: 'DELETE' }).catch(() => undefined);
    await get().load(childId);
  },
}));
