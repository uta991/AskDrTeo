'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { deletePromo, togglePromo, type ActionState } from '../actions';
import styles from '../admin.module.css';

export interface PromoCode {
  id: string;
  code: string;
  type: 'DISCOUNT' | 'FREE_PLAN';
  description?: string | null;
  discountPercent: number | null;
  freeDays: number | null;
  validUntil: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  isActive: boolean;
  plan: { code: string; name: string } | null;
}

function ToggleButton({ isActive }: { isActive: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={styles.outlineButton} disabled={pending}>
      {pending ? '…' : isActive ? 'გამორთვა' : 'ჩართვა'}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={styles.dangerButton} disabled={pending}>
      {pending ? 'იშლება…' : 'დიახ, წაშალე'}
    </button>
  );
}

/** კოდის ბარათი — რას აძლევს, რამდენჯერ გამოიყენეს, მოქმედებს თუ არა. */
export function PromoRow({ promo }: { promo: PromoCode }) {
  const [state, action] = useActionState<ActionState, FormData>(togglePromo, {});
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deletePromo, {});
  const [confirming, setConfirming] = useState(false);

  const benefit =
    promo.type === 'DISCOUNT'
      ? `${promo.discountPercent}% ფასდაკლება`
      : `${promo.plan?.name ?? promo.plan?.code ?? 'პაკეტი'} · ${promo.freeDays} დღე უფასოდ`;

  const usage = promo.maxRedemptions
    ? `${promo.redeemedCount} / ${promo.maxRedemptions}`
    : `${promo.redeemedCount} (ულიმიტო)`;

  return (
    <article className={styles.promoCard}>
      <div className={styles.promoMain}>
        <div className={styles.promoCodeRow}>
          <code className={styles.promoCode}>{promo.code}</code>
          <span className={promo.isActive ? styles.badgeActive : styles.badgeOff}>
            {promo.isActive ? 'აქტიური' : 'გამორთული'}
          </span>
        </div>

        <div className={styles.promoBenefit}>{benefit}</div>
        {!!promo.description && <div className={styles.userContact}>{promo.description}</div>}

        <div className={styles.promoMeta}>
          <span>გამოყენება: {usage}</span>
          {!!promo.validUntil && <span>ვადა: {promo.validUntil.slice(0, 10)}</span>}
        </div>
      </div>

      <div className={styles.promoActions}>
        <form action={action}>
          <input type="hidden" name="id" value={promo.id} />
          <input type="hidden" name="isActive" value={String(!promo.isActive)} />
          <ToggleButton isActive={promo.isActive} />
        </form>

        {!confirming ? (
          <button className={styles.purgeLink} onClick={() => setConfirming(true)}>
            წაშლა
          </button>
        ) : (
          <div className={styles.confirmRow}>
            <button className={styles.outlineButton} onClick={() => setConfirming(false)}>
              გაუქმება
            </button>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={promo.id} />
              <DeleteButton />
            </form>
          </div>
        )}

        {!!state.error && <span className={styles.actionError}>{state.error}</span>}
        {!!deleteState.error && <span className={styles.actionError}>{deleteState.error}</span>}
      </div>
    </article>
  );
}
