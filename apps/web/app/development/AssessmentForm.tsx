'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  ANSWER_LABELS,
  DOMAIN_LABELS,
  DOMAIN_ORDER,
  STATUS_LABELS,
  type MilestoneAnswer,
  type Question,
} from '@askdrteo/milestones';
import { loadQuestions, submitAssessment, type AssessmentState } from './actions';
import styles from './development.module.css';

const ANSWERS: MilestoneAnswer[] = ['YES', 'SOMETIMES', 'NOT_YET', 'UNKNOWN'];

function ageLabel(months: number): string {
  if (months < 12) return `${months} თვე`;
  const y = Math.floor(months / 12);
  const r = months % 12;
  return r === 0 ? `${y} წელი` : `${y} წელი ${r} თვე`;
}

interface Child {
  id: string;
  firstName: string;
}

function Submit({ answered, total }: { answered: number; total: number }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending || !answered}>
      {pending ? 'ითვლება…' : `შედეგის ნახვა (${answered}/${total})`}
    </button>
  );
}

/**
 * განვითარების კითხვარი.
 *
 * კითხვები დომენებად იყოფა — ერთ გრძელ სიაში მშობელი იკარგებოდა.
 * პასუხი აუცილებელი არაა: „არ ვიცი" და გამოტოვება ჯამიდან ვარდება,
 * ანუ შეუვსებელი კითხვა შედეგს არ აუარესებს.
 */
export function AssessmentForm({ children }: { children: Child[] }) {
  const [state, formAction] = useActionState<AssessmentState, FormData>(submitAssessment, {});
  const [childId, setChildId] = useState(children[0]?.id ?? '');
  const [answers, setAnswers] = useState<Record<string, MilestoneAnswer>>({});

  // ასაკს მშობელი უთითებს — პროფილის თარიღიდან განზრახ არ ვიღებთ
  const [years, setYears] = useState('');
  const [months, setMonths] = useState('');
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loading, startLoading] = useTransition();
  const [ageError, setAgeError] = useState<string | null>(null);

  const ageMonths = (Number(years) || 0) * 12 + (Number(months) || 0);
  const child = children.find((c) => c.id === childId) ?? children[0];
  const answered = Object.keys(answers).length;

  const start = () => {
    setAgeError(null);

    if (!years && !months) {
      setAgeError('მიუთითეთ ბავშვის ასაკი');
      return;
    }
    if (ageMonths > 72) {
      setAgeError('კითხვარი 6 წლამდე ასაკზეა გათვლილი.');
      return;
    }

    startLoading(async () => {
      const list = await loadQuestions(ageMonths);
      setAnswers({});
      setQuestions(list);
    });
  };

  if (state.result) {
    const { result } = state;

    return (
      <section className={styles.result}>
        <h2 className={result.hasRedFlag ? styles.headlineAlert : styles.headline}>
          {result.headline}
        </h2>
        <p className={styles.advice}>{result.advice}</p>

        <div className={styles.domains}>
          {result.domains.map((domain) => (
            <div key={domain.domain} className={styles.domainCard}>
              <div className={styles.domainName}>{DOMAIN_LABELS[domain.domain]}</div>

              <div className={styles.bar}>
                <div
                  className={styles[`bar_${domain.status}` as keyof typeof styles]}
                  style={{ width: `${Math.round(domain.ratio * 100)}%` }}
                />
              </div>

              <div className={styles.domainMeta}>
                <span>{STATUS_LABELS[domain.status]}</span>
                <span>
                  {domain.achieved} / {domain.total}
                </span>
              </div>

              {domain.redFlags.map((flag) => (
                <div key={flag} className={styles.redFlag}>
                  {flag}
                </div>
              ))}
            </div>
          ))}
        </div>

        <p className={styles.disclaimer}>
          ეს განვითარების მონიტორინგია და არა დიაგნოსტიკური ტესტი. შედეგი
          მიუთითებს, ღირს თუ არა ექიმთან საუბარი — დიაგნოზს მხოლოდ პედიატრი
          სვამს.
        </p>

        <a href="/development" className={styles.again}>
          თავიდან შევსება
        </a>
      </section>
    );
  }

  // ჯერ ასაკი, მერე კითხვები — ერთ ეკრანზე ორივე მშობელს დააბნევდა
  if (!questions) {
    return (
      <section className={styles.ageStep}>
        {children.length > 1 && (
          <label className={styles.field}>
            <span className={styles.label}>ბავშვი</span>
            <select
              value={childId}
              onChange={(event) => setChildId(event.target.value)}
              className={styles.input}
            >
              {children.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.firstName}
                </option>
              ))}
            </select>
          </label>
        )}

        <p className={styles.intro}>
          მიუთითეთ ბავშვის ასაკი — კითხვები სწორედ ამის მიხედვით შეირჩევა.
        </p>

        <div className={styles.ageRow}>
          <label className={styles.field}>
            <span className={styles.label}>წელი</span>
            <input
              value={years}
              onChange={(event) => setYears(event.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="0"
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>თვე</span>
            <input
              value={months}
              onChange={(event) => setMonths(event.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="0"
              className={styles.input}
            />
          </label>
        </div>

        {!!ageError && <p className={styles.error}>{ageError}</p>}

        <button className="btn btn-primary" onClick={start} disabled={loading}>
          {loading ? 'იტვირთება…' : 'კითხვარის დაწყება'}
        </button>
      </section>
    );
  }

  if (!questions.length) {
    return (
      <section className={styles.ageStep}>
        <p className={styles.empty}>ამ ასაკისთვის კითხვები ჯერ არ დამატებულა.</p>
        <button className={styles.again} onClick={() => setQuestions(null)}>
          ასაკის შეცვლა
        </button>
      </section>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="ageMonths" value={ageMonths} />

      <p className={styles.intro}>
        <strong>{child?.firstName}</strong> — {ageLabel(ageMonths)}.{' '}
        <button type="button" className={styles.changeAge} onClick={() => setQuestions(null)}>
          ასაკის შეცვლა
        </button>
        <br />
        უპასუხეთ დაკვირვების მიხედვით; თუ დარწმუნებული არ ხართ, აირჩიეთ „არ ვიცი".
      </p>

      {DOMAIN_ORDER.map((domain) => {
        const items = questions.filter((q) => q.domain === domain);
        if (!items.length) return null;

        return (
          <section key={domain} className={styles.domainBlock}>
            <h3 className={styles.domainTitle}>{DOMAIN_LABELS[domain]}</h3>

            {items.map((question) => (
              <div key={question.id} className={styles.question}>
                <div className={styles.questionText}>{question.questionKa}</div>

                <div className={styles.options}>
                  {ANSWERS.map((answer) => (
                    <label
                      key={answer}
                      className={
                        answers[question.id] === answer ? styles.optionActive : styles.option
                      }
                    >
                      <input
                        type="radio"
                        name={`q_${question.id}`}
                        value={answer}
                        checked={answers[question.id] === answer}
                        onChange={() =>
                          setAnswers((prev) => ({ ...prev, [question.id]: answer }))
                        }
                      />
                      {ANSWER_LABELS[answer]}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {!!state.error && <p className={styles.error}>{state.error}</p>}

      <div className={styles.actions}>
        <Submit answered={answered} total={questions.length} />
      </div>
    </form>
  );
}
