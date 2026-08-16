import Link from 'next/link';
import { SunLogo } from '../components/Brand';
import { VerifyForm } from './VerifyForm';
import styles from '../login/login.module.css';

export const metadata = { title: 'დადასტურება — AskDrTeo' };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>;
}) {
  const { destination = '' } = await searchParams;

  return (
    <main className={styles.page}>
      <Link href="/register" className={styles.back}>
        ← უკან
      </Link>

      <div className={styles.card}>
        <div className={styles.header}>
          <SunLogo size={64} />
          <h1 className={styles.title}>ნომრის დადასტურება</h1>
          <p className={styles.subtitle}>
            6-ნიშნა კოდი გამოგზავნილია ნომერზე
            <br />
            <strong>{destination}</strong>
          </p>
        </div>

        <VerifyForm destination={destination} />
      </div>
    </main>
  );
}
