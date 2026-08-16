'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { register, type RegisterState } from '../actions/auth';
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

      <Field
        name="phone"
        label="ტელეფონი"
        type="tel"
        autoComplete="tel"
        prefix="+995"
        error={errors.phone}
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
