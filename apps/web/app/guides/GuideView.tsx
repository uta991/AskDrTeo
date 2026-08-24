import Link from 'next/link';
import { apiFetch } from '@/lib/session';
import { getEntitlements, can } from '@/lib/entitlements';
import { FeatureIcon, type FeatureIconName } from '../components/FeatureIcon';
import { Checklist } from './Checklist';
import styles from './guide.module.css';

export interface Guide {
  slug: string;
  title: string;
  intro: string;
  cards: { key: string; title: string; meta?: string; body: string }[];
  checklist?: {
    key: string;
    title: string;
    items: { key: string; label: string; hint?: string; done: boolean }[];
  }[];
  vaccines?: { key: string; name: string; note: string }[];
  childName: string | null;
  videos: { slug: string; name: string; count: number } | null;
  disclaimer: string;
}

/**
 * გზამკვლევის გვერდი — ოთხივე თემას ერთი კომპონენტი ემსახურება.
 *
 * განსხვავება მხოლოდ შიგთავსშია, რომელიც სერვერიდან მოდის; ცალკე
 * გვერდები ოთხჯერ იმეორებდნენ ერთსა და იმავე განლაგებას.
 */
/** SOS პაკეტს არ ითხოვს — სასწრაფო ინფორმაცია ყველას სჭირდება. */
const FREE_SLUGS = ['emergency'];

export async function GuideView({
  slug,
  accent,
  icon,
}: {
  slug: string;
  accent: string;
  icon: FeatureIconName;
}) {
  const entitlements = await getEntitlements();

  if (!FREE_SLUGS.includes(slug) && !can(entitlements, 'parent_guides')) {
    return (
      <main className={styles.page}>
        <Link href="/account" className={styles.back}>
          ← უკან
        </Link>

        <div className={styles.locked}>
          <FeatureIcon name={icon} size={44} color={accent} />
          <h1 className={styles.title}>ეს განყოფილება პრემიუმ პაკეტშია</h1>
          <p className={styles.intro}>
            ახალშობილი, კვება, ძილი და მოგზაურობა — ოთხივე გზამკვლევი პრემიუმ
            პაკეტს მოყვება.
          </p>

          <Link
            href="/plans"
            className="btn"
            style={{ background: '#007201', borderColor: '#007201', color: '#ffffff' }}
          >
            პაკეტების ნახვა
          </Link>
        </div>
      </main>
    );
  }

  const guide = await apiFetch<Guide>(`/guides/${slug}`);

  if (!guide) {
    return (
      <main className={styles.page}>
        <Link href="/account" className={styles.back}>
          ← უკან
        </Link>
        <p className={styles.intro}>გზამკვლევი ვერ ჩაიტვირთა — სცადეთ ცოტა ხანში.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Link href="/account" className={styles.back}>
        ← უკან
      </Link>

      <header className={styles.head}>
        <span className={styles.badge} style={{ background: `${accent}1a` }}>
          <FeatureIcon name={icon} size={30} color={accent} />
        </span>
        <h1 className={styles.title}>{guide.title}</h1>
        <p className={styles.intro}>{guide.intro}</p>
      </header>

      {!!guide.checklist && (
        <Checklist
          slug={guide.slug}
          groups={guide.checklist}
          accent={accent}
          childName={guide.childName}
        />
      )}

      <div className={styles.cards}>
        {guide.cards.map((card) => (
          <article key={card.key} className={styles.card}>
            <h2 className={styles.cardTitle} style={{ color: accent }}>
              {card.title}
            </h2>
            {!!card.meta && <span className={styles.cardMeta}>{card.meta}</span>}
            <p className={styles.cardBody}>{card.body}</p>
          </article>
        ))}
      </div>

      {!!guide.vaccines?.length && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>სამოგზაურო აცრები</h2>
          <p className={styles.sectionNote}>
            მიმართულებაზეა დამოკიდებული და ეროვნულ კალენდარში არ შედის.
            დაგეგმეთ გამგზავრებამდე მინიმუმ ერთი თვით ადრე — ზოგი აცრა
            რამდენიმე დოზას ითხოვს.
          </p>

          <ul className={styles.vaccines}>
            {guide.vaccines.map((vaccine) => (
              <li key={vaccine.key} className={styles.vaccine}>
                <strong>{vaccine.name}</strong>
                <span>{vaccine.note}</span>
              </li>
            ))}
          </ul>

          <Link href="/vaccinations" className={styles.link} style={{ color: accent }}>
            ბავშვის აცრების კალენდარი →
          </Link>
        </section>
      )}

      {!!guide.videos && (
        <Link
          href={`/videos?category=${guide.videos.slug}`}
          className={styles.videoLink}
          style={{ borderColor: accent }}
        >
          <FeatureIcon name="play" size={22} color={accent} />
          <span>
            <strong>ვიდეოები ამ თემაზე</strong>
            <span className={styles.videoMeta}>{guide.videos.count} ვიდეო</span>
          </span>
          <span className={styles.arrow}>›</span>
        </Link>
      )}

      <p className={styles.disclaimer}>{guide.disclaimer}</p>
    </main>
  );
}
