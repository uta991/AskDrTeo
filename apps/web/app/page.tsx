import Image from 'next/image';
import { HeartFlourish, SunLogo } from './components/Brand';
import { Plans } from './components/Plans';
import { SiteHeader } from './components/SiteHeader';
import { getSessionUser } from '@/lib/session';
import styles from './page.module.css';

/**
 * მთავარი გვერდი.
 *
 * განლაგება მობილურის Login ეკრანს იმეორებს: მზე, სათაური, დეკორაცია
 * და ბავშვის ფოტო კიდიდან კიდემდე, მტრედებით გვერდებზე.
 */

const STAGES = [
  { title: 'ახალშობილი', range: '0–1 თვე', needs: 'კვება • ძილის რეჟიმი • ჯანდაცვის საფუძვლები' },
  { title: 'ჩვილი', range: '1–12 თვე', needs: 'ვაქცინაცია • კვების დანერგვა • განვითარების ეტაპები' },
  { title: 'პატარა ბავშვი', range: '1–3 წელი', needs: 'მოძრაობა • მეტყველება • ხშირი ინფექციები' },
  { title: 'სკოლამდელი', range: '3–6 წელი', needs: 'იმუნიტეტის ჩამოყალიბება • ბაღის პერიოდი' },
  { title: 'სკოლის ასაკი', range: '6–12 წელი', needs: 'ზრდა • მხედველობა და ხერხემალი • კვება' },
  { title: 'მოზარდობა', range: '12–18 წელი', needs: 'ჰორმონული ცვლილებები • ფსიქოლოგია' },
];

const FEATURES = [
  {
    title: 'რჩევები ასაკის მიხედვით',
    text: 'აპლიკაცია ბავშვის ასაკს თვითონ ითვლის და მხოლოდ იმას გაჩვენებთ, რაც ახლა გჭირდებათ.',
  },
  {
    title: 'ვიდეო ბიბლიოთეკა',
    text: 'სპეციალისტის ვიდეოები კვებაზე, ძილზე, აცრებსა და განვითარებაზე.',
  },
  {
    title: 'კონსულტაცია ჩატში',
    text: 'შეკითხვა დასვით და პასუხი პედიატრისგან მიიღეთ, კლინიკაში მისვლის გარეშე.',
  },
  {
    title: 'ნაადრევად დაბადებული',
    text: 'თუ ბავშვი 37 კვირამდე დაიბადა, რჩევები კორექტირებული ასაკით შეირჩევა.',
  },
];

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <>
      <SiteHeader />
      <main>
      {/* ── გმირი ─────────────────────────────────────────── */}
      <section className={styles.hero}>
        <Image
          src="/images/dove-left.png"
          alt=""
          width={128}
          height={162}
          className={`${styles.dove} ${styles.doveLeft}`}
          priority
        />
        <Image
          src="/images/dove-right.png"
          alt=""
          width={140}
          height={100}
          className={`${styles.dove} ${styles.doveRight}`}
          priority
        />

        <div className={styles.heroContent}>
          <SunLogo size={92} />
          <h1 className={styles.title}>
            კეთილი იყოს
            <br />
            თქვენი მობრძანება
          </h1>
          <p className={styles.subtitle}>ერთად ვიზრუნოთ თქვენი პატარას ჯანმრთელობაზე</p>
          <HeartFlourish width={140} />
        </div>

        <div className={styles.heroPhoto}>
          <Image
            src="/images/hero-baby.png"
            alt="მძინარე ბავშვი"
            width={1350}
            height={794}
            priority
          />
        </div>

      </section>

      {/* ── ჩვენ შესახებ ──────────────────────────────────── */}
      <section className={styles.section} id="about">
        <div className="container">
          <h2 className={styles.sectionTitle}>ჩვენ შესახებ</h2>
          <p className={styles.sectionLead}>
            AskDrTeo შეიქმნა იმისთვის, რომ მშობელს სანდო პასუხი ჰქონდეს ხელთ —
            მაშინ, როცა ყველაზე მეტად სჭირდება.
          </p>

          <div className={styles.aboutGrid}>
            <article className="card">
              <h3 className={styles.featureTitle}>რატომ დაიწყო</h3>
              <p className={styles.featureText}>
                ბავშვის პირველ წლებში კითხვები ყოველდღიურად ჩნდება: რამდენჯერ აჭამო,
                რატომ არ სძინავს, როდის მიმართო ექიმს. პასუხს მშობელი ხშირად
                ინტერნეტში ეძებს, სადაც სანდო და მცდარი ინფორმაცია ერთმანეთშია არეული.
              </p>
            </article>

            <article className="card">
              <h3 className={styles.featureTitle}>როგორ ვმუშაობთ</h3>
              <p className={styles.featureText}>
                კონტენტს ამზადებს პრაქტიკოსი პედიატრი. რჩევები ბავშვის ასაკის მიხედვით
                ირჩევა, ხოლო ნაადრევად დაბადებულისთვის კორექტირებული ასაკით —
                კალენდარული ასაკით შეფასება ცრუ შეშფოთებას იწვევს.
              </p>
            </article>

            <article className="card">
              <h3 className={styles.featureTitle}>რას არ ვაკეთებთ</h3>
              <p className={styles.featureText}>
                აპლიკაცია ექიმთან ვიზიტს არ ცვლის და დიაგნოზს არ სვამს. ის გეხმარებათ
                გაერკვეთ, რა არის ნორმა ამ ასაკში და როდის არის დროული სპეციალისტთან
                მისვლა.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ── რას გთავაზობთ ─────────────────────────────────── */}
      <section className={styles.section} id="features">
        <div className="container">
          <h2 className={styles.sectionTitle}>რას გთავაზობთ</h2>
          <div className={styles.featureGrid}>
            {FEATURES.map((feature) => (
              <article key={feature.title} className="card">
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureText}>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── ასაკობრივი ეტაპები ────────────────────────────── */}
      <section className={styles.section} id="stages">
        <div className="container">
          <h2 className={styles.sectionTitle}>ასაკობრივი ეტაპები</h2>
          <p className={styles.sectionLead}>
            თითოეულ ასაკს განსხვავებული საჭიროებები აქვს — კონტენტი ავტომატურად ერგება.
          </p>

          <div className={styles.stageGrid}>
            {STAGES.map((stage) => (
              <article key={stage.title} className={styles.stageCard}>
                <div className={styles.stageHead}>
                  <span className={styles.stageName}>{stage.title}</span>
                  <span className={styles.stageRange}>{stage.range}</span>
                </div>
                <p className={styles.stageNeeds}>{stage.needs}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── პაკეტები — მხოლოდ ავტორიზებულს ────────────────── */}
      {!!user && (
        <section className={styles.section} id="plans">
          <div className="container">
            <h2 className={styles.sectionTitle}>პაკეტები</h2>
            <p className={styles.sectionLead}>აირჩიეთ თქვენთვის შესაფერისი</p>
            <Plans />
          </div>
        </section>
      )}

      {/* ── სპეციალისტი ───────────────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={`card ${styles.doctorCard}`}>
            <Image
              src="/images/doctor.png"
              alt="დოქტორი თეო"
              width={140}
              height={140}
              className={styles.doctorPhoto}
            />
            <div>
              <h2 className={styles.doctorName}>დოქტორი თეო</h2>
              <p className={styles.featureText}>
                პედიატრი, რომელიც აპლიკაციის კონტენტს ამზადებს და თქვენს შეკითხვებს
                პასუხობს. რჩევები ეყრდნობა თანამედროვე პედიატრიულ პრაქტიკას.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ჩამოტვირთვა ───────────────────────────────────── */}
      <section className={styles.download} id="download">
        <div className="container">
          <SunLogo size={72} />
          <h2 className={styles.downloadTitle}>დაიწყეთ დღესვე</h2>
          <p className={styles.subtitle}>უფასო ვერსია ყველასთვის ხელმისაწვდომია</p>
          <div className={styles.ctaRow}>
            <span className="btn btn-primary">App Store</span>
            <span className="btn btn-outline">Google Play</span>
          </div>
          <p className={styles.soon}>აპლიკაცია მალე გამოჩნდება მაღაზიებში</p>
        </div>
      </section>

      {/* პერსონალის შესასვლელი — ფუტერთან ახლოს, რომ მშობელს არ დაებნეს */}
      <div className={styles.staffLink}>
        <a href="/login">პერსონალის შესვლა</a>
      </div>

      <footer className={styles.footer}>
        <div className="container">
          <span>© {new Date().getFullYear()} AskDrTeo</span>
          <span className={styles.footerNote}>ყველა უფლება დაცულია</span>
        </div>
      </footer>
      </main>
    </>
  );
}
