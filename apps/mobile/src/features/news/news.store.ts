import { create } from 'zustand';
import { api } from '@/api/client';
import { isFresh } from '../freshness';

export interface NewsPost {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
  createdAt: string;
  video?: {
    id: string;
    title: string | null;
    /** HLS მისამართი — expo-video პირდაპირ კრავს */
    playbackUrl?: string | null;
    thumbnailUrl?: string | null;
    ready?: boolean;
  } | null;
}

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
    if (!force && isFresh(loadedAt)) return;

    set({ loading: true });
    try {
      set({ posts: await api<NewsPost[]>('/news'), loadedAt: Date.now() });
    } finally {
      set({ loading: false });
    }
  },
}));
