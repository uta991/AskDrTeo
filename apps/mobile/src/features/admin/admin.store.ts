import { create } from 'zustand';
import { api } from '@/api/client';
import { isFresh } from '../freshness';

export interface Overview {
  users: { total: number; parents: number; staff: number; newThisMonth: number };
  children: number;
  subscriptions: { active: number; paid: number; free: number };
  content: { news: number; videos: number };
}

export interface PlanRevenue {
  planCode: string;
  planName: string;
  subscribers: number;
  monthlyRevenueMinor: number;
}

export interface Financial {
  currency: string;
  allTime: { revenueMinor: number; payments: number };
  thisMonth: { revenueMinor: number; payments: number };
  refundedMinor: number;
  pendingPayments: number;
  mrrMinor: number;
  planBreakdown: PlanRevenue[];
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: 'PARENT' | 'OPERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  status: string;
  createdAt: string;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string | null;
    plan: { id: string; code: string; name: string; isFree: boolean };
  } | null;
}

export interface NewsPost {
  id: string;
  title: string;
  body: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  notifiedCount: number;
  publishedAt: string | null;
  /** ვიდეო ჯერ მუშავდება — მზადყოფნისას სიახლე თავად გამოქვეყნდება */
  publishAfterVideo: boolean;
  video: { id: string; title: string } | null;
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'DISCOUNT' | 'FREE_PLAN';
  discountPercent: number | null;
  freeDays: number | null;
  validUntil: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  isActive: boolean;
  plan: { code: string; name: string } | null;
}


interface AdminState {
  overview: Overview | null;
  financial: Financial | null;
  users: AdminUser[];
  usersTotal: number;
  staff: AdminUser[];
  news: NewsPost[];
  promos: PromoCode[];
  loading: boolean;
  /** ბოლო წარმატებული ჩატვირთვის დრო, სექციების მიხედვით */
  loadedAt: Partial<Record<'dashboard' | 'users' | 'staff' | 'news' | 'promos', number>>;

  loadDashboard: (force?: boolean) => Promise<void>;
  loadUsers: (search?: string, force?: boolean) => Promise<void>;
  loadStaff: (force?: boolean) => Promise<void>;
  createStaff: (input: CreateStaffInput) => Promise<void>;
  setPassword: (userId: string, password: string) => Promise<void>;
  deleteAccount: (userId: string, isStaff: boolean) => Promise<void>;
  purgeAccount: (userId: string, isStaff: boolean) => Promise<void>;
  loadNews: (force?: boolean) => Promise<void>;
  loadPromos: (force?: boolean) => Promise<void>;

  grantPlan: (userId: string, planCode: string, expiresAt?: string) => Promise<void>;
  createNews: (input: CreateNewsInput) => Promise<NewsPost>;
  createPromo: (input: CreatePromoInput) => Promise<void>;
  reset: () => void;
}

export interface CreateNewsInput {
  title: string;
  body: string;
  videoId?: string;
  publishNow?: boolean;
}

export interface CreateStaffInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: 'PARENT' | 'OPERATOR' | 'ADMIN' | 'SUPER_ADMIN';
}

export interface CreatePromoInput {
  code: string;
  type: 'DISCOUNT' | 'FREE_PLAN';
  discountPercent?: number;
  planCode?: string;
  freeDays?: number;
  maxRedemptions?: number;
  validUntil?: string;
}

export const useAdmin = create<AdminState>((set, get) => ({
  overview: null,
  financial: null,
  users: [],
  usersTotal: 0,
  staff: [],
  news: [],
  promos: [],
  loading: false,
  loadedAt: {},

  async loadDashboard(force) {
    if (!force && isFresh(get().loadedAt.dashboard)) return;

    set({ loading: true });
    try {
      // ორივე ერთდროულად — თანმიმდევრული მოთხოვნა ეკრანს ორჯერ აციმციმებდა
      const [overview, financial] = await Promise.all([
        api<Overview>('/admin/stats'),
        api<Financial>('/admin/stats/financial'),
      ]);
      set({ overview, financial, loadedAt: { ...get().loadedAt, dashboard: Date.now() } });
    } finally {
      set({ loading: false });
    }
  },

  async loadUsers(search, force) {
    // ძებნისას ქეში არ მოქმედებს — მომხმარებელი შედეგს მაშინვე ელოდება
    if (!search && !force && isFresh(get().loadedAt.users)) return;

    set({ loading: true });
    try {
      // მხოლოდ მშობლები — პერსონალს ცალკე სია აქვს პროფილზე
      const params = new URLSearchParams({ role: 'PARENT', perPage: '50' });
      if (search) params.set('search', search);

      const res = await api<{ items: AdminUser[]; total: number }>(
        `/admin/users?${params.toString()}`,
      );
      set({
        users: res.items,
        usersTotal: res.total,
        loadedAt: { ...get().loadedAt, users: search ? undefined : Date.now() },
      });
    } finally {
      set({ loading: false });
    }
  },

  async loadStaff(force) {
    if (!force && isFresh(get().loadedAt.staff)) return;

    const res = await api<{ items: AdminUser[] }>(
      '/admin/users?roles=OPERATOR,ADMIN,SUPER_ADMIN&perPage=100',
    );
    set({ staff: res.items, loadedAt: { ...get().loadedAt, staff: Date.now() } });
  },

  async createStaff(input) {
    await api('/admin/users/staff', { method: 'POST', body: input });
    await get().loadStaff(true);
  },

  async setPassword(userId, password) {
    await api(`/admin/users/${userId}/password`, { method: 'PATCH', body: { password } });
  },

  async deleteAccount(userId, isStaff) {
    await api(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: { status: 'DELETED', reason: 'ადმინის პანელიდან' },
    });
    // მხოლოდ შესაბამისი სია განახლდეს — ორივეს დატვირთვა ზედმეტია
    await (isStaff ? get().loadStaff(true) : get().loadUsers(undefined, true));
  },

  /** სამუდამო წაშლა — ჩანაწერი ბაზიდან ქრება, აღდგენა შეუძლებელია. */
  async purgeAccount(userId, isStaff) {
    await api(`/admin/users/${userId}`, { method: 'DELETE' });
    await (isStaff ? get().loadStaff(true) : get().loadUsers(undefined, true));
  },

  async loadNews(force) {
    if (!force && isFresh(get().loadedAt.news)) return;

    set({
      news: await api<NewsPost[]>('/admin/news'),
      loadedAt: { ...get().loadedAt, news: Date.now() },
    });
  },

  async loadPromos(force) {
    if (!force && isFresh(get().loadedAt.promos)) return;

    set({
      promos: await api<PromoCode[]>('/admin/promo'),
      loadedAt: { ...get().loadedAt, promos: Date.now() },
    });
  },

  async grantPlan(userId, planCode, expiresAt) {
    await api(`/admin/users/${userId}/grant-subscription`, {
      method: 'POST',
      body: { planCode, expiresAt, note: 'ადმინის პანელიდან' },
    });
    // სია განახლდეს, რომ ახალი პაკეტი მაშინვე ჩანდეს
    await get().loadUsers(undefined, true);
  },

  async createNews(input) {
    const post = await api<NewsPost>('/admin/news', { method: 'POST', body: input });
    await get().loadNews(true);
    return post;
  },

  async createPromo(input) {
    await api('/admin/promo', { method: 'POST', body: input });
    await get().loadPromos(true);
  },

  reset() {
    set({ overview: null, financial: null, users: [], staff: [], news: [], promos: [], loadedAt: {} });
  },
}));

/** თეთრებიდან ტექსტად. */
export function money(minor: number, currency = 'GEL'): string {
  const symbol = currency === 'GEL' ? '₾' : currency;
  return `${(minor / 100).toFixed(2)} ${symbol}`;
}
