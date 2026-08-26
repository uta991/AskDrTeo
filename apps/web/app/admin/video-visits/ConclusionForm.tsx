'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  saveConclusion,
  suggestDiagnoses,
  suggestPrescription,
  type DiagnosisOption,
  type DoseItem,
} from './actions';
import styles from './queue.module.css';

/**
 * ექიმის დასკვნა.
 *
 * ერთი ფორმაა ზარის დროსაც და მის შემდეგაც: საუბრისას ექიმს ხშირად
 * წერის დრო არ აქვს, დასკვნა კი მაინც უნდა დარჩეს.
 *
 * აკრეფა მინიმუმამდეა დაყვანილი — დიაგნოზი პირველივე ასოებზე
 * ამოტივტივდება, ახსნა ცნობარიდან ჩაიწერება, დოზა კი ბავშვის წონაზე
 * გამოითვლება. ექიმს რჩება გადაწყვეტილება, არა კრეფა.
 */
export function ConclusionForm({
  visitId,
  ageMonths,
  initial,
  onSaved,
}: {
  visitId: string;
  /** ბავშვის ასაკი თვეებში — დოზის გამოთვლას სჭირდება */
  ageMonths: number | null;
  initial?: {
    diagnosis?: string | null;
    diagnosisNote?: string | null;
    prescription?: string | null;
    weightKg?: number | null;
    heightCm?: number | null;
  };
  onSaved?: () => void;
}) {
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? '');
  const [note, setNote] = useState(initial?.diagnosisNote ?? '');
  const [prescription, setPrescription] = useState(initial?.prescription ?? '');
  const [weight, setWeight] = useState(initial?.weightKg ? String(initial.weightKg) : '');
  const [height, setHeight] = useState(initial?.heightCm ? String(initial.heightCm) : '');

  const [options, setOptions] = useState<DiagnosisOption[]>([]);
  const [openList, setOpenList] = useState(false);
  const [doses, setDoses] = useState<DoseItem[]>([]);
  const [advice, setAdvice] = useState<string | null>(null);
  const [urgent, setUrgent] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, startTransition] = useTransition();

  // ბოლო აკრეფიდან ნახევარი წამი — ყოველ ასოზე მოთხოვნა ზედმეტია
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!openList) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void suggestDiagnoses(diagnosis).then(setOptions);
    }, 350);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [diagnosis, openList]);

  /** არჩეული დიაგნოზი — ახსნა და დოზები თავისით ჩაიწერება. */
  const pick = (option: DiagnosisOption) => {
    setDiagnosis(option.name);
    setOpenList(false);
    setUrgent(option.isUrgent);
    if (!note.trim() && option.description) setNote(option.description);
  };

  /**
   * ახსნა და დოზები დიაგნოზისა და წონის ყოველ ცვლილებაზე ახლდება.
   *
   * ადრე მხოლოდ სიიდან არჩევისას იტვირთებოდა და თუ ექიმი წონას მერე
   * წერდა, დოზები აღარ ჩნდებოდა — ბუნებრივი თანმიმდევრობა კი სწორედ
   * ასეთია.
   */
  useEffect(() => {
    const name = diagnosis.trim();
    if (name.length < 3 || ageMonths === null) return;

    const kg = Number(weight) || 0;
    let alive = true;

    const load = setTimeout(() => {
      void suggestPrescription(name, kg, ageMonths).then((result) => {
        if (!alive || !result) return;

        setDoses(kg > 0 ? result.items : []);
        setAdvice(result.advice);
        setNote((current) => (current.trim() ? current : (result.description ?? '')));
      });
    }, 400);

    return () => {
      alive = false;
      clearTimeout(load);
    };
  }, [diagnosis, weight, ageMonths]);

  /** შეთავაზებული დოზა ტექსტად — ექიმს რედაქტირება შეუძლია. */
  const addDose = (item: DoseItem) => {
    if (!item.dose) return;

    const ml =
      item.dose.singleMlMin !== undefined
        ? ` (${round(item.dose.singleMlMin)}–${round(item.dose.singleMlMax ?? 0)} მლ${
            item.concentration ? `, ${item.concentration}` : ''
          })`
        : '';

    const line =
      `${item.name} — ${round(item.dose.singleMgMin)}–${round(item.dose.singleMgMax)} მგ${ml}, `
      + `დღეში ${item.dose.dosesPerDay}-ჯერ`
      + (item.note ? `, ${item.note}` : '')
      + '.';

    setPrescription((current) => (current.trim() ? `${current.trim()}\n\n${line}` : line));
  };

  const save = () => {
    if (!diagnosis.trim()) {
      setError('დიაგნოზი აუცილებელია');
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await saveConclusion(visitId, {
        diagnosis: diagnosis.trim(),
        diagnosisNote: note.trim() || undefined,
        prescription: prescription.trim() || undefined,
        weightKg: Number(weight) || undefined,
        heightCm: Number(height) || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSaved(true);
      onSaved?.();
    });
  };

  return (
    <div className={styles.conclusion}>
      <h4 className={styles.conclusionTitle}>ექიმის დასკვნა</h4>

      {/* გაზომვები პირველია — დოზა სწორედ მათზე ითვლება */}
      <div className={styles.measureRow}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>წონა, კგ</span>
          <input
            type="number"
            step="0.1"
            className={styles.input}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>სიმაღლე, სმ</span>
          <input
            type="number"
            step="0.5"
            className={styles.input}
            value={height}
            onChange={(event) => setHeight(event.target.value)}
          />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>დიაგნოზი</span>
        <div className={styles.suggestWrap}>
          <input
            className={styles.input}
            value={diagnosis}
            placeholder="დაიწყეთ კრეფა — სია თავად ამოტივტივდება"
            onChange={(event) => {
              setDiagnosis(event.target.value);
              setOpenList(true);
            }}
            onFocus={() => setOpenList(true)}
          />

          {openList && options.length > 0 && (
            <ul className={styles.suggestList}>
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className={styles.suggestItem}
                    onClick={() => pick(option)}
                  >
                    <span>
                      {option.name}
                      {option.isUrgent && <span className={styles.urgentTag}>სასწრაფო</span>}
                    </span>
                    {option.usageCount > 0 && (
                      <span className={styles.suggestCount}>{option.usageCount}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </label>

      {/* ასეთი დიაგნოზი ონლაინ ვერ იმართება — ექიმმა ოჯახი
          დაუყოვნებლივ უნდა გადაამისამართოს */}
      {urgent && (
        <p className={styles.urgentNote}>
          ეს მდგომარეობა ონლაინ კონსულტაციით არ იმართება — ოჯახი დაუყოვნებლივ
          სასწრაფო დახმარებაში გადაამისამართეთ.
        </p>
      )}

      <label className={styles.field}>
        <span className={styles.fieldLabel}>დიაგნოზის ახსნა — მშობლისთვის</span>
        <textarea
          className={styles.input}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      {!!advice && doses.length === 0 && !Number(weight) && (
        <p className={styles.adviceHint}>
          დოზების შესათავაზებლად მიუთითეთ ბავშვის წონა.
        </p>
      )}

      {doses.length > 0 && (
        <div className={styles.doses}>
          <span className={styles.fieldLabel}>
            შეთავაზებული დოზები {weight ? `(${weight} კგ)` : ''} — დააჭირეთ ჩასამატებლად
          </span>

          {doses.map((item) => (
            <button
              key={item.medicationId}
              type="button"
              className={styles.doseChip}
              disabled={!item.dose}
              onClick={() => addDose(item)}
            >
              <strong>{item.name}</strong>
              <span>
                {item.dose
                  ? `${round(item.dose.singleMgMin)}–${round(item.dose.singleMgMax)} მგ · `
                    + `დღეში ${item.dose.dosesPerDay}-ჯერ`
                  : item.blocked}
              </span>
            </button>
          ))}

          {!!advice && <p className={styles.adviceHint}>{advice}</p>}
        </div>
      )}

      <label className={styles.field}>
        <span className={styles.fieldLabel}>დანიშნულება</span>
        <textarea
          className={styles.input}
          rows={7}
          value={prescription}
          onChange={(event) => setPrescription(event.target.value)}
          placeholder="რეჟიმი, მედიკამენტები, კონტროლის ვადა"
        />
      </label>

      {!!error && <p className={styles.error}>{error}</p>}
      {saved && <p className={styles.savedNote}>შენახულია — მშობელს გაეგზავნა SMS</p>}

      <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
        {busy ? 'ინახება…' : 'დასკვნის შენახვა და გაგზავნა'}
      </button>
    </div>
  );
}

/** დოზა მთელ ან ერთნიშნა რიცხვად — ექიმს წილადი ბოლომდე არ სჭირდება. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}
