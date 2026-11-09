import Link from 'next/link';
import styles from './guide.module.css';

/** `{{calculator:სიტყვა}}` — იხ. API-ის GuideCard.body */
const LINK = /\{\{calculator:([^}]+)\}\}/g;

/**
 * ბარათის ტექსტი: აბზაცები და ჩაშენებული ბმული კალკულატორზე.
 *
 * ბმული ყვითელია — ბრენდის ფერი, რომ ტექსტში თვალში მოხვდეს და
 * მშობელმა დოზის გამოსათვლელად გვერდის ბოლომდე ძებნა არ დაიწყოს.
 */
export function GuideBody({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((paragraph, i) => {
        const parts = paragraph.split(LINK);

        return (
          <p key={i} className={styles.cardBody}>
            {parts.map((part, j) =>
              // split-ის კენტი ინდექსები ჯგუფებია — ბმულის ტექსტი
              j % 2 === 1 ? (
                <Link key={j} href="/calculator" className={styles.inlineLink}>
                  {part}
                </Link>
              ) : (
                part
              ),
            )}
          </p>
        );
      })}
    </>
  );
}
