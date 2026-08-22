import { create } from 'zustand';
import { api } from '@/api/client';

export interface Appointment {
  id: string;
  preferredAt: string;
  scheduledAt: string | null;
  status: 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'CANCELED' | 'DONE';
  reason: string | null;
  staffNote: string | null;
  usedFreeVisit: boolean;
  child: { id: string; firstName: string } | null;
}

export interface VisitQuota {
  limit: number;
  used: number;
  remaining: number;
}

interface AppointmentsState {
  items: Appointment[];
  quota: VisitQuota;
  loading: boolean;
  error: string | null;
  notice: string | null;
  load: () => Promise<void>;
  request: (input: { preferredAt: string; childId?: string; reason?: string }) => Promise<void>;
  cancel: (id: string) => Promise<void>;
}

/** ვიზიტის ჯავშანი და პაკეტის თვიური უფასო ვიზიტი. */
export const useAppointments = create<AppointmentsState>((set, get) => ({
  items: [],
  quota: { limit: 0, used: 0, remaining: 0 },
  loading: false,
  error: null,
  notice: null,

  async load() {
    set({ loading: true, error: null });
    try {
      const [items, quota] = await Promise.all([
        api<Appointment[]>('/appointments'),
        api<VisitQuota>('/appointments/quota'),
      ]);
      set({ items, quota });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'ვერ ჩაიტვირთა' });
    } finally {
      set({ loading: false });
    }
  },

  async request(input) {
    set({ error: null, notice: null });
    try {
      await api('/appointments', { method: 'POST', body: input });
      set({ notice: 'მოთხოვნა გაიგზავნა — დადასტურებას შეტყობინებით მიიღებთ' });
      await get().load();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'მოთხოვნა ვერ გაიგზავნა' });
    }
  },

  async cancel(id) {
    await api(`/appointments/${id}/cancel`, { method: 'PATCH' }).catch(() => undefined);
    await get().load();
  },
}));
