'use server';

import { apiFetch, apiMutate } from '@/lib/session';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  data: {
    conversationId?: string;
    appointmentId?: string;
    vaccinationHistory?: boolean;
    vaccinations?: boolean;
  } | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFeed {
  items: NotificationItem[];
  unread: number;
}

export async function loadNotifications(): Promise<NotificationFeed> {
  return (await apiFetch<NotificationFeed>('/me/notifications')) ?? { items: [], unread: 0 };
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiMutate(`/me/notifications/${id}/read`, 'PATCH').catch(() => undefined);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiMutate('/me/notifications/read-all', 'PATCH').catch(() => undefined);
}
