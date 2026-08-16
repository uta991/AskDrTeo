import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { AdminNav } from '../AdminNav';
import { CreatePromoForm } from './CreatePromoForm';
import { PromoRow, type PromoCode } from './PromoRow';
import styles from '../admin.module.css';

export const metadata = { title: 'პრომო კოდები — AskDrTeo' };

interface PlanOption {
  id: string;
  code: string;
  name: string;
}

export default async function AdminPromoPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role === 'PARENT') redirect('/account');

  // ოპერატორს პრომო კოდები არ ეკუთვნის — მისი საქმე ჩატი და შეტყობინებებია
  if (user.role === 'OPERATOR') redirect('/admin');

  const [promos, plans] = await Promise.all([
    apiFetch<PromoCode[]>('/admin/promo'),
    apiFetch<PlanOption[]>('/plans'),
  ]);

  return (
    <main className={styles.page}>
      <AdminNav user={user} active="promo" />

      <div className="container">
        <h2 className={styles.sectionTitle}>
          პრომო კოდები <span className={styles.count}>({promos?.length ?? 0})</span>
        </h2>
        <p className={styles.hint}>
          ფასდაკლების კოდი გადახდისას გამოიყენება; უფასო პაკეტის კოდი მაშინვე
          რთავს არჩეულ პაკეტს. მშობელი კოდს პროფილზე აქტიურებს.
        </p>

        <CreatePromoForm plans={plans ?? []} />

        {!promos?.length ? (
          <p className={styles.empty}>ჯერ არცერთი კოდი არ შეგიქმნიათ.</p>
        ) : (
          <div className={styles.userList}>
            {promos.map((promo) => (
              <PromoRow key={promo.id} promo={promo} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
