'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadChatUnread } from './actions';
import styles from './admin.module.css';

/** რამდენ ხანში ერთხელ მოწმდება — ზარის იგივე რიტმი. */
const POLL_MS = 20_000;

/**
 * მენიუს „ჩატი" ნიშნით.
 *
 * წითელი წრე რიცხვით — ოპერატორმა უნდა დაინახოს, რომ პასუხს ელოდებიან,
 * გვერდის გახსნის გარეშე.
 */
export function ChatTabBadge({ active }: { active: boolean }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;

    const refresh = () => {
      void loadChatUnread().then((data) => {
        if (alive) setUnread(data.conversations);
      });
    };

    refresh();
    const timer = setInterval(refresh, POLL_MS);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <Link href="/admin/chat" className={active ? styles.tabActive : styles.tab}>
      ჩატი
      {unread > 0 && <span className={styles.tabBadge}>{unread > 9 ? '9+' : unread}</span>}
    </Link>
  );
}
