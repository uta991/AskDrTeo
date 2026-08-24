import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { SunLogo } from '../components/Brand';
import { RegisterForm } from './RegisterForm';
import { SocialAuth } from '../components/SocialAuth';
import styles from '../login/login.module.css';

export const metadata = { title: 'რეგისტრაცია — AskDrTeo' };

export default async function RegisterPage() {
  const current = await getSessionUser();
  if (current) redirect(current.role !== 'PARENT' ? '/admin' : '/account');

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        ← მთავარ გვერდზე
      </Link>

      <div className={styles.card}>
        <div className={styles.header}>
          <SunLogo size={64} />
          <h1 className={styles.title}>ანგარიშის შექმნა</h1>
          <p className={styles.subtitle}>შემოგვიერთდით და მიიღეთ სპეციალისტის რჩევები</p>
        </div>

        <RegisterForm />

        <SocialAuth
          googleClientId={process.env.GOOGLE_WEB_CLIENT_ID}
          appleClientId={process.env.APPLE_SERVICES_ID}
        />

        <p className={styles.note}>
          უკვე გაქვთ ანგარიში? <Link href="/login" className={styles.inlineLink}>შესვლა</Link>
        </p>
      </div>
    </main>
  );
}
