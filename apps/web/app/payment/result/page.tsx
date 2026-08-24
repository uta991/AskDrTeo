import { PaymentResult } from './PaymentResult';
import styles from './result.module.css';

export const metadata = { title: 'გადახდა — AskDrTeo' };

/** ბანკი აქ აბრუნებს მომხმარებელს; შეკვეთის ნომერი მისამართშია. */
export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <main className={styles.page}>
      <PaymentResult orderId={order ?? null} />
    </main>
  );
}
