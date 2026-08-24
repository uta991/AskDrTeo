'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { checkPayment, type PaymentStatusView } from '../../actions/payments';
import styles from './result.module.css';

/** რამდენ ხანს ვეკითხებით სერვერს, სანამ ხელით შემოწმებას შევთავაზებთ. */
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120_000;

/**
 * გადახდის შედეგი.
 *
 * ამ გვერდს თავისთავად არაფერი სჯერა: ბანკიდან დაბრუნება მხოლოდ
 * ნიშანია, რომ შემოწმების დროა. სტატუსს ყოველ ჯერზე ჩვენი სერვერი
 * ბანკს ეკითხება — მისამართის ხელით გახსნა პაკეტს ვერავის მისცემს.
 */
export function PaymentResult({ orderId }: { orderId: string | null }) {
  const [view, setView] = useState<PaymentStatusView | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const startedAt = useRef(Date.now());

  const poll = useCallback(async (): Promise<boolean> => {
    if (!orderId) return true;

    const result = await checkPayment(orderId);
    if (result) setView(result);

    return Boolean(result?.final);
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    let stopped = false;

    const tick = async () => {
      const done = await poll().catch(() => false);
      if (stopped) return;

      if (done) return;

      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }

      timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    };

    let timer = setTimeout(() => void tick(), 0);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [orderId, poll]);

  if (!orderId) {
    return (
      <div className={styles.box}>
        <p className={styles.title}>გადახდა ვერ მოიძებნა</p>
        <p className={styles.text}>ბმულს შეკვეთის ნომერი აკლია.</p>
        <Link href="/plans" className={`btn ${styles.action}`}>
          პაკეტებზე დაბრუნება
        </Link>
      </div>
    );
  }

  const status = view?.status ?? 'PENDING';

  if (status === 'SUCCEEDED') {
    return (
      <div className={styles.box}>
        <span className={`${styles.mark} ${styles.markOk}`}>✓</span>
        <p className={styles.title}>გადახდა დადასტურდა</p>
        <p className={styles.text}>{view?.message}</p>

        {!!view?.validUntil && (
          <p className={styles.text}>
            პაკეტი აქტიურია {new Date(view.validUntil).toLocaleDateString('ka-GE')}-მდე
          </p>
        )}

        <Link href="/account" className={`btn btn-primary ${styles.action}`}>
          ჩემს კაბინეტში
        </Link>
      </div>
    );
  }

  if (status === 'FAILED' || status === 'CANCELED') {
    return (
      <div className={styles.box}>
        <span className={`${styles.mark} ${styles.markFail}`}>×</span>
        <p className={styles.title}>გადახდა ვერ შესრულდა</p>
        <p className={styles.text}>{view?.message ?? 'თანხა არ ჩამოგეჭრათ.'}</p>
        <Link href="/plans" className={`btn btn-primary ${styles.action}`}>
          ხელახლა ცდა
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.box}>
      <span className={styles.spinner} aria-hidden />
      <p className={styles.title}>ვამოწმებთ გადახდას…</p>

      <p className={styles.text}>
        {timedOut
          ? 'ბანკი პასუხს აგვიანებს. ფანჯარა შეგიძლიათ დახუროთ — გადახდის დადასტურებისთანავე პაკეტი ავტომატურად გააქტიურდება და შეტყობინებას მიიღებთ.'
          : 'გთხოვთ, არ დახუროთ გვერდი — ბანკის პასუხს ვამოწმებთ.'}
      </p>

      {timedOut && (
        <Link href="/account" className={`btn ${styles.action}`}>
          ჩემს კაბინეტში
        </Link>
      )}
    </div>
  );
}
