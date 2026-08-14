import { create } from 'zustand';
import { api } from '@/api/client';

export interface Entitlement {
  key: string;
  name: string;
  type: 'BOOLEAN' | 'LIMIT' | 'ACCESS';
  enabled: boolean;
  value: string | null;
  unit: string | null;
}

export interface EntitlementSnapshot {
  planCode: string | null;
  planName: string | null;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | null;
  periodEnd: string | null;
  features: Record<string, Entitlement>;
}

interface EntitlementsState {
  snapshot: EntitlementSnapshot | null;
  loading: boolean;
  load: () => Promise<void>;
  reset: () => void;
  /** ფუნქცია ხელმისაწვდომია თუ არა — ეკრანები ამით მალავენ ღილაკებს */
  can: (featureKey: string) => boolean;
}

export const useEntitlements = create<EntitlementsState>((set, get) => ({
  snapshot: null,
  loading: false,

  async load() {
    set({ loading: true });
    try {
      set({ snapshot: await api<EntitlementSnapshot>('/me/entitlements') });
    } finally {
      set({ loading: false });
    }
  },

  reset() {
    set({ snapshot: null });
  },

  can(featureKey) {
    return get().snapshot?.features[featureKey]?.enabled ?? false;
  },
}));

/**
 * უფასო პაკეტზეა თუ არა მომხმარებელი.
 *
 * `isFree` ველს backend არ აბრუნებს — პაკეტის კოდით ვასკვნით, რომ
 * კლიენტში ფასების ლოგიკა არ გავიმეოროთ.
 */
export function useIsFreePlan(): boolean {
  const snapshot = useEntitlements((s) => s.snapshot);
  return snapshot?.planCode === 'free';
}
