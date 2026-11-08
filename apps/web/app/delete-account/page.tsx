import type { Metadata } from 'next';
import Link from 'next/link';
import { getSessionUser } from '@/lib/session';
import { DeleteForm } from './DeleteForm';
import styles from '../profile/profile.module.css';

export const metadata: Metadata = {
  title: 'ანგარიშის წაშლა — AskDrTeo',
  description: 'როგორ წავშალოთ AskDrTeo-ს ანგარიში და რა მონაცემები იშლება.',
};

/**
 * ანგარიშის წაშლის საჯარო გვერდი.
 *
 * Google Play-ის მოთხოვნაა: ბმული, რომელიც აპის გარეშეც მუშაობს და
 * აღწერს, რა იშლება და რა რჩება. შეუსულ მომხმარებელსაც უნდა ეჩვენოს —
 * ამიტომ ავტორიზაცია აქ სავალდებულო არ არის.
 */
export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { done } = await searchParams;
  const user = done ? null : await getSessionUser();

  return (
    <main className={styles.page}>
      <div className={styles.body} style={{ paddingTop: 32 }}>
        <section className="card">
          <h1 className={styles.sectionTitle}>AskDrTeo — ანგარიშის წაშლა</h1>

          {done ? (
            <p className={styles.notice}>ანგარიში და მასთან დაკავშირებული მონაცემები წაიშალა.</p>
          ) : (
            <>
              <p>ანგარიშის წაშლა ორი გზით შეგიძლიათ:</p>
              <ul>
                <li>
                  <strong>აპში:</strong> პროფილი → „ანგარიშის წაშლა"
                </li>
                <li>
                  <strong>აქ, ამ გვერდზე:</strong> შედით ანგარიშზე და დაადასტურეთ წაშლა
                </li>
              </ul>
            </>
          )}
        </section>

        {!done && (
          <section className="card">
            <h2 className={styles.sectionTitle}>რა იშლება</h2>
            <ul>
              <li>ანგარიში — სახელი, ელ. ფოსტა, ტელეფონის ნომერი, პაროლი</li>
              <li>ბავშვების პროფილები, ზრდის და აცრების ჩანაწერები</li>
              <li>ჩატები, AI ასისტენტთან საუბრები და ატვირთული ფოტოები</li>
              <li>ვიზიტების ჯავშნები და დასკვნები</li>
            </ul>
            <p>წაშლა მყისიერია და აღდგენა შეუძლებელია. ატვირთული ფაილები საცავიდან 24 საათში საბოლოოდ იშლება.</p>

            <h2 className={styles.sectionTitle} style={{ marginTop: 16 }}>
              რა რჩება
            </h2>
            <p>
              გადახდების ჩანაწერები — კანონით სავალდებულო ბუღალტრული აღრიცხვისთვის. ისინი ანგარიშს
              აღარ უკავშირდება.
            </p>
          </section>
        )}

        {!done && (
          <section className="card">
            {!user && (
              <>
                <p>წასაშლელად ჯერ შედით ანგარიშზე.</p>
                <Link href="/login?next=/delete-account" className="btn btn-primary">
                  შესვლა
                </Link>
              </>
            )}

            {user && user.role !== 'PARENT' && (
              <p>თანამშრომლის ანგარიშს ადმინისტრატორი შლის — მიმართეთ მას.</p>
            )}

            {user && user.role === 'PARENT' && (
              <>
                <p>
                  შესული ხართ, როგორც{' '}
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>
                  .
                </p>
                <DeleteForm />
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
