import { create } from 'zustand';
import { api } from '@/api/client';

export interface VaccinationRow {
  vaccineId: string;
  code: string;
  name: string;
  description: string | null;
  ageMonths: number;
  doseNumber: number;
  dueAt: string;
  daysLeft: number;
  status: 'DONE' | 'DUE' | 'SOON' | 'UPCOMING';
  doneAt: string | null;
}

interface VaccinationsState {
  rows: VaccinationRow[];
  loading: boolean;
  error: string | null;
  /** ისტორიის შევსების შემდეგ რამდენი აცრა დარჩა */
  missing: number | null;
  load: (childId: string, history?: boolean) => Promise<void>;
  toggle: (childId: string, vaccineId: string, done: boolean) => Promise<void>;
  saveHistory: (childId: string, doneVaccineIds: string[]) => Promise<void>;
  reset: () => void;
}

/**
 * აცრების კალენდარი.
 *
 * ვადა ბავშვის დაბადების თარიღიდან ითვლება სერვერზე — აპლიკაცია
 * მხოლოდ ხატავს, რომ ორ ადგილას ორი განსხვავებული თარიღი არ გაჩნდეს.
 */
export const useVaccinations = create<VaccinationsState>((set, get) => ({
  rows: [],
  loading: false,
  error: null,
  missing: null,

  async load(childId, history = false) {
    set({ loading: true, error: null });
    try {
      const path = `/children/${childId}/vaccinations${history ? '/history' : ''}`;
      set({ rows: await api<VaccinationRow[]>(path) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'ვერ ჩაიტვირთა' });
    } finally {
      set({ loading: false });
    }
  },

  async toggle(childId, vaccineId, done) {
    set((state) => ({
      rows: state.rows.map((row) =>
        row.vaccineId === vaccineId
          ? { ...row, doneAt: done ? new Date().toISOString() : null, status: done ? 'DONE' : row.status }
          : row,
      ),
    }));

    await api(`/children/${childId}/vaccinations/${vaccineId}`, {
      method: 'PATCH',
      body: { doneAt: done ? new Date().toISOString() : undefined },
    }).catch(() => undefined);
  },

  async saveHistory(childId, doneVaccineIds) {
    set({ error: null });
    try {
      const result = await api<{ saved: number; missing: number }>(
        `/children/${childId}/vaccinations/history`,
        { method: 'POST', body: { doneVaccineIds } },
      );
      set({ missing: result.missing });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'შენახვა ვერ მოხერხდა' });
    }
  },

  reset() {
    set({ rows: [], missing: null, error: null });
  },
}));
