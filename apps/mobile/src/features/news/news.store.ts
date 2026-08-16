import { create } from 'zustand';
import { api } from '@/api/client';

export interface NewsPost {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
  createdAt: string;
  video?: { id: string; title: string | null } | null;
}

/** ლენტი ხშირად არ იცვლება — ტაბებს შორის გადაფურცვლაზე ხელახლა არ იტვირთება. */
const FRESH_MS = 60_000;

interface NewsState {
  posts: NewsPost[];
  loading: boolean;
  loadedAt?: number;
  load: (force?: boolean) => Promise<void>;
}

export const useNews = create<NewsState>((set, get) => ({
  posts: [],
  loading: false,

  async load(force) {
    const { loadedAt } = get();
    if (!force && loadedAt && Date.now() - loadedAt < FRESH_MS) return;

    set({ loading: true });
    try {
      set({ posts: await api<NewsPost[]>('/news'), loadedAt: Date.now() });
    } finally {
      set({ loading: false });
    }
  },
}));
