import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { SunLogo } from '../components/Brand';
import { LoginForm } from './LoginForm';
import { SocialAuth } from '../components/SocialAuth';
import styles from './login.module.css';

export const metadata = { title: 'შესვლა — AskDrTeo' };

export default async function LoginPage() {
  // უკვე შესულს login აღარ სჭირდება
  const current = await getSessionUser();
  if (current) redirect(current.role !== 'PARENT' ? '/admin' : '/account');

  return (
    <main className={styles.page}>
      {/* უკან — მთავარ გვერდზე */}
      <Link href="/" className={styles.back}>
        ← მთავარ გვერდზე
      </Link>

      <div className={styles.card}>
        <div className={styles.header}>
          <SunLogo size={72} />
          <h1 className={styles.title}>შესვლა</h1>
          <p className={styles.subtitle}>იმავე მონაცემებით, რითაც აპლიკაციაში</p>
        </div>

        <LoginForm />

        <SocialAuth
          googleClientId={process.env.GOOGLE_WEB_CLIENT_ID}
          appleClientId={process.env.APPLE_SERVICES_ID}
        />

        <p className={styles.note}>
          არ გაქვთ ანგარიში?{' '}
          <Link href="/register" className={styles.inlineLink}>
            რეგისტრაცია
          </Link>
        </p>
      </div>
    </main>
  );
}
