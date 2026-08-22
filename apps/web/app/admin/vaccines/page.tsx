import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { AdminNav } from '../AdminNav';
import { VaccineManager } from './VaccineManager';
import type { Vaccine } from './actions';
import styles from '../admin.module.css';

export const metadata = { title: 'აცრების ცნობარი — AskDrTeo' };

export default async function AdminVaccinesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // კალენდარი სამედიცინო შინაარსია — ოპერატორს არ ეკუთვნის
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') redirect('/admin');

  const vaccines = await apiFetch<Vaccine[]>('/admin/vaccines');

  return (
    <main className={styles.page}>
      <AdminNav user={user} active="vaccines" />

      <div className="container">
        <h2 className={styles.sectionTitle}>
          აცრების ცნობარი <span className={styles.count}>({vaccines?.length ?? 0})</span>
        </h2>
        <p className={styles.hint}>
          ვადა ბავშვის დაბადების თარიღიდან ითვლება — აქ მხოლოდ ასაკს უთითებთ.
          ცვლილება მაშინვე აისახება ყველა მშობლის კალენდარში.
        </p>

        <VaccineManager vaccines={vaccines ?? []} />
      </div>
    </main>
  );
}
