import { create } from 'zustand';
import { api } from '@/api/client';
import { isFresh } from '../freshness';

// ტიპები საერთო პაკეტიდან — გამოთვლაც იქვეა
export type { AgeBand, Concentration, Medication } from '@askdrteo/dosing';
import type { Medication } from '@askdrteo/dosing';

interface MedicationsState {
  medications: Medication[];
  loading: boolean;
  loadedAt?: number;
  load: (force?: boolean) => Promise<void>;
}

export const useMedications = create<MedicationsState>((set, get) => ({
  medications: [],
  loading: false,

  async load(force) {
    if (!force && isFresh(get().loadedAt)) return;

    set({ loading: true });
    try {
      set({ medications: await api<Medication[]>('/medications'), loadedAt: Date.now() });
    } finally {
      set({ loading: false });
    }
  },
}));
