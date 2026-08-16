'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from '../admin.module.css';

/** ძებნა 400მწ დაყოვნებით — ყოველ ასოზე მოთხოვნა ზედმეტია. */
export function UserSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (value === initial) return;

    const timer = setTimeout(() => {
      router.replace(value.trim() ? `/admin/users?q=${encodeURIComponent(value.trim())}` : '/admin/users');
    }, 400);

    return () => clearTimeout(timer);
  }, [value, initial, router]);

  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="ძებნა სახელით, ელ. ფოსტით ან ნომრით"
      className={`${styles.input} ${styles.search}`}
      autoComplete="off"
    />
  );
}
