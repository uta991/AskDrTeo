'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  login,
  resendLoginCode,
  verifyLoginCode,
  type LoginState,
} from '../actions/auth';
import styles from './login.module.css';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'შესვლა…' : 'შესვლა'}
    </button>
  );
}

/**
 * შესვლა ორ საფეხურად.
 *
 * სწორი პაროლის შემდეგ სერვერი ტოკენს არ იძლევა — აბრუნებს
 * `challengeId`-ს და ნომერზე აგზავნის კოდს. მეორე ფორმა სწორედ ამ
 * კოდს ადასტურებს.
 */
export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});
  const [codeState, codeAction] = useActionState<LoginState, FormData>(verifyLoginCode, {});

  const challengeId = codeState.challengeId ?? state.challengeId;
  const maskedPhone = state.maskedPhone;

  if (challengeId) {
    return (
      <CodeStep
        action={codeAction}
        challengeId={challengeId}
        maskedPhone={maskedPhone}
        error={codeState.error}
      />
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>ელ. ფოსტა ან ტელეფონი</span>
        <input
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          required
          className={styles.input}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>პაროლი</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={styles.input}
        />
      </label>

      {!!state.error && <p className={styles.error}>{state.error}</p>}

      <SubmitButton />
    </form>
  );
}

function CodeStep({
  action,
  challengeId,
  maskedPhone,
  error,
}: {
  action: (formData: FormData) => void;
  challengeId: string;
  maskedPhone?: string;
  error?: string;
}) {
  const [sending, startSending] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  // სერვერზეც 60 წამია — ღილაკის ღიად დატოვება მხოლოდ შეცდომას დააბრუნებდა
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="challengeId" value={challengeId} />

      <p className={styles.note}>
        დადასტურების კოდი გამოგზავნილია ნომერზე
        {maskedPhone ? ` ${maskedPhone}` : ''}. კოდი 10 წუთის განმავლობაშია ძალაში.
      </p>

      <label className={styles.field}>
        <span className={styles.label}>კოდი</span>
        <input
          name="code"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          className={`${styles.input} ${styles.codeInput}`}
          required
        />
      </label>

      <label className={styles.terms}>
        <input type="checkbox" name="rememberDevice" />
        <span>დაიმახსოვრე ეს მოწყობილობა 30 დღით</span>
      </label>

      {!!error && <p className={styles.error}>{error}</p>}
      {!!notice && <p className={styles.fieldNotice}>{notice}</p>}

      <SubmitButton />

      <button
        type="button"
        className={styles.resend}
        disabled={sending || cooldown > 0}
        onClick={() =>
          startSending(async () => {
            const result = await resendLoginCode(challengeId);
            setNotice(result.message);
            setCooldown(60);
          })
        }
      >
        {cooldown > 0 ? `ხელახლა გაგზავნა ${cooldown}წმ` : 'კოდის ხელახლა გაგზავნა'}
      </button>
    </form>
  );
}
