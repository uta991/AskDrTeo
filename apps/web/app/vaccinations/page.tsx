import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { can, getEntitlements } from '@/lib/entitlements';
import { getChildren } from '@/lib/children';
import { SunLogo } from '../components/Brand';
import { HistoryForm } from './HistoryForm';
import { VaccinationList } from './VaccinationList';
import type { VaccinationRow } from './actions';
import styles from './vaccinations.module.css';

export const metadata = { title: 'აცრების კალენდარი — AskDrTeo' };

export default async function VaccinationsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; mode?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const entitlements = await getEntitlements();

  if (!can(entitlements, 'vaccination_calendar', user.role)) {
    return (
      <main className={styles.page}>
        <Link href="/account" className={styles.back}>
          ← უკან
        </Link>

        <div className={styles.card}>
          <div className={styles.head}>
            <SunLogo size={44} />
            <h1 className={styles.title}>აცრების კალენდარი</h1>
            <p className={styles.subtitle}>
              კალენდარი სტანდარტულ და პრემიუმ პაკეტშია — ვადები ბავშვის
              დაბადების თარიღიდან ითვლება.
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

  // „ისტორია" — მხოლოდ ის აცრები, რაც ამ ასაკში უკვე უნდა ჰქონდეს
  const history = params.mode === 'history';

  const rows = activeChild
    ? ((await apiFetch<VaccinationRow[]>(
        `/children/${activeChild.id}/vaccinations${history ? '/history' : ''}`,
      )) ?? [])
    : [];

  return (
    <main className={styles.page}>
      <Link href="/account" className={styles.back}>
        ← უკან
      </Link>

      <div className={styles.card}>
        <div className={styles.head}>
          <SunLogo size={44} />
          <h1 className={styles.title}>
            {history ? 'აცრების ისტორია' : 'აცრების კალენდარი'}
          </h1>
          <p className={styles.subtitle}>
            {history
              ? 'შენახვის შემდეგ დარჩენილ აცრებს SMS-ითაც გამოგიგზავნით.'
              : 'ვადა ბავშვის დაბადების თარიღიდან ითვლება. გაკეთებული აცრა თქვენ მონიშნეთ — ჩანაწერი მხოლოდ თქვენთვისაა.'}
          </p>
        </div>

        {!activeChild ? (
          <p className={styles.empty}>ჯერ დაამატეთ ბავშვის პროფილი.</p>
        ) : history ? (
          <HistoryForm
            childId={activeChild.id}
            childName={activeChild.firstName}
            rows={rows}
          />
        ) : (
          <VaccinationList children={children} activeChildId={activeChild.id} rows={rows} />
        )}
      </div>
    </main>
  );
}
