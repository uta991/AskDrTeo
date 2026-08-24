import { create } from 'zustand';
import { api } from '@/api/client';
import { isFresh } from '../freshness';

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
  load: (force?: boolean) => Promise<void>;
  loadedAt?: number;
}

export const usePlans = create<PlansState>((set, get) => ({
  plans: [],
  loading: false,

  async load(force) {
    if (!force && isFresh(get().loadedAt)) return;

    set({ loading: true });
    try {
      set({ plans: await api<Plan[]>('/plans', { auth: false }), loadedAt: Date.now() });
    } finally {
      set({ loading: false });
    }
  },
}));

/** თეთრებიდან ტექსტად: 1990 → „19.90 ₾" */
export function formatPrice(amountMinor: number, currency: string): string {
  const symbol = currency === 'GEL' ? '₾' : currency;
  const amount = amountMinor / 100;

  // მრგვალი თანხა თეთრების გარეშე (199 ₾), არამრგვალი ორი ნიშნით (19.98 ₾)
  return `${amountMinor % 100 === 0 ? amount.toFixed(0) : amount.toFixed(2)} ${symbol}`;
}
