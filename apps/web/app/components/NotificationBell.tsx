'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationFeed,
  type NotificationItem,
} from './notifications';
import styles from './notification-bell.module.css';

/** რამდენ ხანში ერთხელ ვამოწმებთ ახალს — ჩატის რიგისთვის ესეც საკმარისია. */
const POLL_MS = 20_000;

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

  if (minutes < 1) return 'ახლახან';
  if (minutes < 60) return `${minutes} წთ წინ`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} სთ წინ`;

  return new Date(iso).toLocaleDateString('ka-GE');
}

/** სად გადავიდეს დაჭერისას — შეტყობინება კონტექსტს ატარებს. */
function targetFor(item: NotificationItem, isStaff: boolean): string | null {
  if (item.data?.conversationId) return isStaff ? '/admin/chat' : '/chat';
  if (item.data?.appointmentId) return isStaff ? '/admin/appointments' : '/video-visit';
  if (item.data?.videoVisitId) return isStaff ? '/admin/video-visits' : '/video-visit';
  if (item.data?.vaccinationHistory) return '/vaccinations?mode=history';
  if (item.data?.vaccinations) return '/vaccinations';
  if (item.data?.feedbackToken) return `/feedback/${item.data.feedbackToken}`;
  return null;
}

/**
 * შეტყობინებების ზარი.
 *
 * წაუკითხავი წითელი ნიშნით ჩანს — ოპერატორმა ერთი შეხედვით უნდა
 * გაიგოს, რომ ჩატში წერენ, და არა გვერდის განახლების შემდეგ.
 */
export function NotificationBell({ isStaff }: { isStaff: boolean }) {
  const [feed, setFeed] = useState<NotificationFeed>({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    const refresh = () => {
      void loadNotifications().then((next) => {
        if (alive) setFeed(next);
      });
    };

    refresh();
    const timer = setInterval(refresh, POLL_MS);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // გარეთ დაჭერაზე იხურება — მობილურზე backdrop-იც არის
  useEffect(() => {
    if (!open) return;

    const onClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const openItem = (item: NotificationItem) => {
    setOpen(false);
    setFeed((prev) => ({
      items: prev.items.map((row) =>
        row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row,
      ),
      unread: Math.max(0, prev.unread - (item.readAt ? 0 : 1)),
    }));

    startTransition(async () => {
      await markNotificationRead(item.id);
      const target = targetFor(item, isStaff);
      if (target) router.push(target);
    });
  };

  const readAll = () => {
    setFeed((prev) => ({
      items: prev.items.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })),
      unread: 0,
    }));

    startTransition(() => void markAllNotificationsRead());
  };

  return (
    <div className={styles.wrap} ref={boxRef}>
      <button
        type="button"
        className={styles.bell}
        onClick={() => setOpen((value) => !value)}
        aria-label={feed.unread ? `${feed.unread} ახალი შეტყობინება` : 'შეტყობინებები'}
      >
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden>
          <path
            d="M12 3a6 6 0 0 0-6 6v3.6l-1.4 2.8A1 1 0 0 0 5.5 17h13a1 1 0 0 0 .9-1.6L18 12.6V9a6 6 0 0 0-6-6Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        {feed.unread > 0 && (
          <span className={styles.badge}>{feed.unread > 9 ? '9+' : feed.unread}</span>
        )}
      </button>

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />

          <div className={styles.panel} role="menu">
            <div className={styles.panelHead}>
              <strong>შეტყობინებები</strong>
              {feed.unread > 0 && (
                <button type="button" className={styles.readAll} onClick={readAll}>
                  ყველას წაკითხვა
                </button>
              )}
            </div>

            {!feed.items.length && <p className={styles.empty}>ახალი შეტყობინება არ არის.</p>}

            {feed.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.item} ${item.readAt ? '' : styles.itemUnread}`}
                onClick={() => openItem(item)}
                role="menuitem"
              >
                {!item.readAt && <span className={styles.dot} aria-hidden />}

                <span className={styles.itemMain}>
                  <span className={styles.itemTitle}>{item.title}</span>
                  <span className={styles.itemBody}>{item.body}</span>
                  <span className={styles.itemTime}>{timeAgo(item.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
