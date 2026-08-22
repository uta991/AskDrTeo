import { notFound } from 'next/navigation';
import { SunLogo } from '../../components/Brand';
import { loadFeedback } from '../actions';
import { RatingForm } from '../RatingForm';
import styles from '../feedback.module.css';

export const metadata = { title: 'შეაფასეთ საუბარი — AskDrTeo' };

export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const feedback = await loadFeedback(token);

  if (!feedback) notFound();

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <SunLogo size={48} />
          <h1 className={styles.title}>როგორ დაგეხმარათ კონსულტანტი?</h1>
          <p className={styles.subtitle}>
            შეფასება ანონიმურია და მხოლოდ პასუხების ხარისხის გასაუმჯობესებლად
            გვჭირდება.
          </p>
        </div>

        <RatingForm token={token} initial={feedback} />
      </div>
    </main>
  );
}
