import { create } from 'zustand';
import { api } from '@/api/client';
import { isFresh } from '../freshness';

export interface Concentration {
  label: string;
  mg: number;
  ml: number;
}

export interface AgeBand {
  untilMonths: number;
  mg: number;
  label: string;
}

export interface Medication {
  id: string;
  slug: string;
  name: string;
  dosingType: 'PER_KG' | 'BY_AGE';
  mgPerKgMin: number | null;
  mgPerKgMax: number | null;
  ageBands: AgeBand[] | null;
  intervalHoursMin: number;
  intervalHoursMax: number;
  maxDailyMg: number;
  minAgeMonths: number;
  minWeightKg: number;
  concentrations: Concentration[];
  note?: string | null;
}

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
