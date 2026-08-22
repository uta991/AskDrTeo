import { redirect } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getSessionUser } from '@/lib/session';
import { FeedbackSummary, type Feedback } from './chat/FeedbackSummary';
import { AdminNav } from './AdminNav';
import styles from './admin.module.css';

export const metadata = { title: 'სამართავი პანელი — AskDrTeo' };

interface Overview {
  users: { total: number; parents: number; staff: number; newThisMonth: number };
  children: number;
  subscriptions: { active: number; paid: number; free: number };
  content: { news: number; videos: number };
}

interface Financial {
  currency: string;
  allTime: { revenueMinor: number };
  thisMonth: { revenueMinor: number };
  mrrMinor: number;
  pendingPayments: number;
  planBreakdown: { planCode: string; planName: string; subscribers: number; monthlyRevenueMinor: number }[];
}

function money(minor: number, currency = 'GEL'): string {
  return `${(minor / 100).toFixed(2)} ${currency === 'GEL' ? '₾' : currency}`;
}

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // მშობელს პანელი არ ეკუთვნის — კაბინეტში მიდის, ჩიხის ნაცვლად
  if (user.role === 'PARENT') redirect('/account');

  const [overview, financial, feedback] = await Promise.all([
    apiFetch<Overview>('/admin/stats'),
    apiFetch<Financial>('/admin/stats/financial'),
    apiFetch<Feedback>('/admin/chat/feedback'),
  ]);

  return (
    <main className={styles.page}>
      <AdminNav user={user} active="dashboard" />

      <div className="container">
        {!overview ? (
          <p className={styles.empty}>
            მონაცემები ვერ ჩაიტვირთა — შეამოწმეთ, backend ეშვება თუ არა.
          </p>
        ) : (
          <>
            <h2 className={styles.sectionTitle}>დაშბორდი</h2>
            <div className={styles.grid}>
              <Stat label="სულ მომხმარებელი" value={overview.users.total} highlight />
              <Stat label="მშობელი" value={overview.users.parents} />
              <Stat label="პერსონალი" value={overview.users.staff} />
              <Stat label="ახალი ამ თვეში" value={overview.users.newThisMonth} />
              <Stat label="ბავშვის პროფილი" value={overview.children} />
              <Stat label="აქტიური გამოწერა" value={overview.subscriptions.active} />
              <Stat label="ფასიანი" value={overview.subscriptions.paid} />
              <Stat label="ვიდეო" value={overview.content.videos} />
              {/* ხარისხის მაჩვენებელი დანარჩენ ციფრებთან ერთად უნდა ჩანდეს */}
              <Stat
                label="ჩატის შეფასება"
                value={feedback?.average ? `${feedback.average} / 5` : '—'}
              />
            </div>

            <h2 className={styles.sectionTitle}>
              მშობლების შეფასებები{' '}
              <Link href="/admin/chat" className={styles.muted}>
                ჩატის რიგი →
              </Link>
            </h2>
            <FeedbackSummary feedback={feedback} />

            {!!financial && (
              <>
                <h2 className={styles.sectionTitle}>ფინანსები</h2>
                <div className="card">
                  <div className={styles.mrrLabel}>თვიური შემოსავალი (MRR)</div>
                  <div className={styles.mrr}>{money(financial.mrrMinor, financial.currency)}</div>

                  <div className={styles.moneyRow}>
                    <Money label="ამ თვეში" value={money(financial.thisMonth.revenueMinor)} />
                    <Money label="სულ შემოსავალი" value={money(financial.allTime.revenueMinor)} />
                    <Money label="მოლოდინში" value={String(financial.pendingPayments)} />
                  </div>

                  <table className={styles.table}>
                    <tbody>
                      {financial.planBreakdown.map((row) => (
                        <tr key={row.planCode}>
                          <td>{row.planName}</td>
                          <td className={styles.muted}>{row.subscribers} აბონენტი</td>
                          <td className={styles.amount}>{money(row.monthlyRevenueMinor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  // შეფასება ტექსტია („4.6 / 5"), დანარჩენი — რიცხვი
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className={`${styles.stat} ${highlight ? styles.statHighlight : ''}`}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function Money({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className={styles.mrrLabel}>{label}</div>
      <strong>{value}</strong>
    </div>
  );
}
