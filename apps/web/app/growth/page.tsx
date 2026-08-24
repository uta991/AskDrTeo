import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { can, getEntitlements } from '@/lib/entitlements';
import { getChildren } from '@/lib/children';
import { SunLogo } from '../components/Brand';
import { GrowthBoard } from './GrowthBoard';
import type { GrowthPoint } from './actions';
import styles from './growth.module.css';

export const metadata = { title: 'ზრდის დღიური — AskDrTeo' };

export default async function GrowthPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const entitlements = await getEntitlements();

  if (!can(entitlements, 'growth_tracking', user.role)) {
    return (
      <main className={styles.page}>
        <Link href="/account" className={styles.back}>
          ← უკან
        </Link>

        <div className={styles.card}>
          <div className={styles.head}>
            <SunLogo size={44} />
            <h1 className={styles.title}>ზრდის დღიური</h1>
            <p className={styles.subtitle}>
              წონისა და სიმაღლის მრუდი სტანდარტულ და პრემიუმ პაკეტშია.
            </p>
          </div>

          <div className={styles.upgrade}>
            <Link href="/plans" className="btn btn-primary">
              პაკეტების ნახვა
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const params = await searchParams;
  const children = (await getChildren()) ?? [];
  const activeChild = children.find((child) => child.id === params.child) ?? children[0] ?? null;

  const points = activeChild
    ? ((await apiFetch<GrowthPoint[]>(`/children/${activeChild.id}/growth`)) ?? [])
    : [];

  return (
    <main className={styles.page}>
      <Link href="/account" className={styles.back}>
        ← უკან
      </Link>

      <div className={styles.card}>
        <div className={styles.head}>
          <SunLogo size={44} />
          <h1 className={styles.title}>ზრდის დღიური</h1>
          <p className={styles.subtitle}>
            პროცენტილს არ ვთვლით — ეს პედიატრის შეფასებაა. აქ ბავშვის საკუთარი
            მრუდია, რომ ტენდენცია დაინახოთ.
          </p>
        </div>

        {!activeChild ? (
          <p className={styles.empty}>
            ჯერ დაამატეთ ბავშვის პროფილი —{' '}
            <Link href="/account" className={styles.link}>
              კაბინეტში
            </Link>
            .
          </p>
        ) : (
          <GrowthBoard children={children} initialChildId={activeChild.id} points={points} />
        )}
      </div>
    </main>
  );
}
