'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { register, sendPhoneCode, type RegisterState } from '../actions/auth';
import styles from '../login/login.module.css';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'იგზავნება…' : 'რეგისტრაცია'}
    </button>
  );
}

function Field({
  name,
  label,
  type = 'text',
  autoComplete,
  error,
  prefix,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  prefix?: string;
  placeholder?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>

      <span className={prefix ? styles.withPrefix : undefined}>
        {!!prefix && <span className={styles.prefix}>{prefix}</span>}
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize={type === 'email' ? 'none' : undefined}
          className={styles.input}
          required
        />
      </span>

      {!!error && <span className={styles.fieldError}>{error}</span>}
    </label>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState<RegisterState, FormData>(register, {});
  const errors = state.fieldErrors ?? {};

  const [phone, setPhone] = useState('');
  const [sending, startSending] = useTransition();
  const [sent, setSent] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // ხელახლა გაგზავნის ტაიმერი — სერვერსაც აქვს 60წმ შეზღუდვა და
  // ღილაკის ღიად დატოვება მხოლოდ შეცდომას დააბრუნებდა
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const requestCode = () => {
    setSendError(null);
    startSending(async () => {
      const result = await sendPhoneCode(phone);
      if (result.ok) {
        setSent(result.message);
        setCooldown(60);
      } else {
        setSendError(result.message);
      }
    });
  };

  return (
    <form action={formAction} className={styles.form}>
      <Field
        name="firstName"
        label="სახელი"
        placeholder="მშობლის სახელი"
        autoComplete="given-name"
        error={errors.firstName}
      />

      <Field
        name="lastName"
        label="გვარი"
        placeholder="მშობლის გვარი"
        autoComplete="family-name"
        error={errors.lastName}
      />

      <Field
        name="email"
        label="ელ. ფოსტა"
        type="email"
        autoComplete="email"
        error={errors.email}
      />

      <label className={styles.field}>
        <span className={styles.label}>ტელეფონი</span>

        <span className={styles.phoneRow}>
          <span className={styles.withPrefix}>
            <span className={styles.prefix}>+995</span>
            <input
              name="phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              className={styles.input}
              required
            />
          </span>

          <button
            type="button"
            onClick={requestCode}
            disabled={sending || cooldown > 0}
            className={styles.sendCode}
          >
            {sending ? '…' : cooldown > 0 ? `${cooldown}წმ` : sent ? 'თავიდან' : 'გაგზავნა'}
          </button>
        </span>

        {!!errors.phone && <span className={styles.fieldError}>{errors.phone}</span>}
        {!!sendError && <span className={styles.fieldError}>{sendError}</span>}
        {!!sent && !sendError && <span className={styles.fieldNotice}>{sent}</span>}
      </label>

      <Field
        name="code"
        label="დადასტურების კოდი"
        placeholder="ნომერზე მიღებული 6 ციფრი"
        autoComplete="one-time-code"
        error={errors.code}
      />

      <Field
        name="password"
        label="პაროლი"
        type="password"
        autoComplete="new-password"
        error={errors.password}
      />

      <Field
        name="confirmPassword"
        label="პაროლის გამეორება"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword}
      />

      <label className={styles.terms}>
        <input type="checkbox" name="acceptedTerms" />
        <span>ვეთანხმები წესებსა და პირობებს</span>
      </label>
      {!!errors.acceptedTerms && <span className={styles.fieldError}>{errors.acceptedTerms}</span>}

      {!!state.error && <p className={styles.error}>{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
