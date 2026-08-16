import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import type { Medication } from '@/lib/medications';
import { AdminNav } from '../AdminNav';
import { AddMedication } from './AddMedication';
import { MedicationRow } from './MedicationRow';
import styles from '../admin.module.css';

export const metadata = { title: 'წამლების ცნობარი — AskDrTeo' };

export default async function AdminMedicationsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // დოზირება სამედიცინო შინაარსია — ოპერატორსა და მშობელს არ ეკუთვნის
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') redirect('/admin');

  const medications = await apiFetch<Medication[]>('/admin/medications');

  return (
    <main className={styles.page}>
      <AdminNav user={user} active="medications" />

      <div className="container">
        <h2 className={styles.sectionTitle}>
          წამლების ცნობარი <span className={styles.count}>({medications?.length ?? 0})</span>
        </h2>
        <p className={styles.hint}>
          კალკულატორი ზუსტად ამ მონაცემებით ითვლის. შეცდომა პირდაპირ დოზაზე
          აისახება — შეყვანამდე გადაამოწმეთ.
        </p>

        <AddMedication />

        <div className={styles.userList}>
          {(medications ?? []).map((medication) => (
            <MedicationRow key={medication.id} medication={medication} />
          ))}
        </div>
      </div>
    </main>
  );
}
