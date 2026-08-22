import { create } from 'zustand';
import { api } from '@/api/client';

export interface VideoCard {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: { id: string; slug: string; name: string } | null;
  durationSec: number | null;
  thumbnailUrl: string | null;
  free: boolean;
  unlocked: boolean;
  processing: boolean;
  embedUrl: string | null;
}

interface VideosState {
  items: VideoCard[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

/** ვიდეო ბიბლიოთეკა — დახურული ვიდეო სიაში ჩანს, დაკვრა კი არა. */
export const useVideos = create<VideosState>((set) => ({
  items: [],
  loading: false,
  error: null,

  async load() {
    set({ loading: true, error: null });
    try {
      set({ items: await api<VideoCard[]>('/videos') });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'ბიბლიოთეკა ვერ ჩაიტვირთა' });
    } finally {
      set({ loading: false });
    }
  },
}));
