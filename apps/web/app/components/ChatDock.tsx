'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FeatureIcon } from './FeatureIcon';
import styles from './chat-dock.module.css';

/** სადაც თავად საუბარია, მოლივლივე ღილაკი ზედმეტია. */
const HIDDEN_ON = ['/chat', '/assistant'];

/**
 * ორი საუბრის მოლივლივე ღილაკი — გვერდის მარჯვენა კიდეზე.
 *
 * გვერდთან ერთად ჩამოყვება (fixed), რომ დახმარება ყოველთვის ხელთ
 * იყოს და მშობელი თავში დასაბრუნებლად სქროლს არ ეწეოდეს.
 */
export function ChatDock() {
  const pathname = usePathname();

  if (HIDDEN_ON.some((path) => pathname.startsWith(path))) return null;

  return (
    <div className={styles.dock}>
      <Link href="/assistant" className={styles.button} aria-label="AI ასისტენტი">
        <span className={styles.iconWrap} style={{ background: '#7C5CFF' }}>
          <FeatureIcon name="robot" size={26} color="#ffffff" />
        </span>
        <span className={styles.label}>AI ასისტენტი</span>
      </Link>

      <Link href="/chat" className={styles.button} aria-label="ჩატი პედიატრთან">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/doctor.png" alt="" className={styles.photo} />
        <span className={styles.label}>პედიატრი</span>
      </Link>
    </div>
  );
}
