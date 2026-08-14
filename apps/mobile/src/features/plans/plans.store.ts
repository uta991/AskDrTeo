import { create } from 'zustand';
import { api } from '@/api/client';

export interface PlanPrice {
  id: string;
  currency: string;
  amountMinor: number;
  interval: 'MONTH' | 'YEAR' | 'ONE_TIME';
  intervalCount: number;
}

export interface PlanFeature {
  key: string;
  name: string;
  value: string | null;
  unit: string | null;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isFree: boolean;
  trialDays: number;
  badge: string | null;
  colorHex: string | null;
  highlight: boolean;
  prices: PlanPrice[];
  features: PlanFeature[];
}

interface PlansState {
  plans: Plan[];
  loading: boolean;
  load: () => Promise<void>;
}

export const usePlans = create<PlansState>((set) => ({
  plans: [],
  loading: false,

  async load() {
    set({ loading: true });
    try {
      set({ plans: await api<Plan[]>('/plans', { auth: false }) });
    } finally {
      set({ loading: false });
    }
  },
}));

/** თეთრებიდან ტექსტად: 1990 → „19.90 ₾" */
export function formatPrice(amountMinor: number, currency: string): string {
  const symbol = currency === 'GEL' ? '₾' : currency;
  return `${(amountMinor / 100).toFixed(2)} ${symbol}`;
}
