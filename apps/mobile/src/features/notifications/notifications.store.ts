import { create } from 'zustand';
import { api } from '@/api/client';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  data: {
    conversationId?: string;
    appointmentId?: string;
    videoVisitId?: string;
    vaccinationHistory?: boolean;
    vaccinations?: boolean;
    feedbackToken?: string;
  } | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsState {
  items: AppNotification[];
  unread: number;
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  reset: () => void;
}

/**
 * შეტყობინებების ზარი.
 *
 * ვებზე ყოველ 20 წამში მოწმდება; აპლიკაციაში ეკრანის გახსნისას და
 * ხელით განახლებაზე — ტელეფონზე მუდმივი გამოკითხვა ბატარეას ჭამს.
 */
export const useNotifications = create<NotificationsState>((set, get) => ({
  items: [],
  unread: 0,

  async load() {
    const feed = await api<{ items: AppNotification[]; unread: number }>('/me/notifications');
    set({ items: feed.items, unread: feed.unread });
  },

  async markRead(id) {
    // ჯერ ეკრანზე — ლოდინი დაჭერის შემდეგ ბლანტად აღიქმება
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
      unread: Math.max(0, state.unread - 1),
    }));

    await api(`/me/notifications/${id}/read`, { method: 'PATCH' }).catch(() => undefined);
  },

  async markAllRead() {
    set((state) => ({
      items: state.items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      unread: 0,
    }));

    await api('/me/notifications/read-all', { method: 'PATCH' }).catch(() => undefined);
  },

  reset() {
    set({ items: [], unread: 0 });
  },
}));
