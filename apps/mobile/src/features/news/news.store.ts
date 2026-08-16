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
    /** ჩასართავი დამკვრელი — იგივე, რასაც საიტი იყენებს */
    embedUrl?: string | null;
    /** HLS — პირდაპირი წვდომა Bunny-ზე დახურულია, სათადარიგოდ რჩება */
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
