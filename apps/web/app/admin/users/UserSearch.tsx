'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from '../admin.module.css';

/** ძებნა 400მწ დაყოვნებით — ყოველ ასოზე მოთხოვნა ზედმეტია. */
export function UserSearch({
  initial,
  basePath = '/admin/users',
}: {
  initial: string;
  basePath?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (value === initial) return;

    const timer = setTimeout(() => {
      router.replace(
        value.trim() ? `${basePath}?q=${encodeURIComponent(value.trim())}` : basePath,
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [value, initial, router, basePath]);

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
