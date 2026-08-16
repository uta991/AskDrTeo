'use client';

import { useActionState, useState } from 'react';
import { grantPlan, type ActionState } from './actions';
import { AccountActions } from './AccountActions';
import styles from './admin.module.css';

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: 'PARENT' | 'OPERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  status: string;
  subscription?: {
    plan: { code: string; name: string };
    currentPeriodEnd: string | null;
  } | null;
}

export interface PlanOption {
  id: string;
  code: string;
  name: string;
}

const ROLE_SHORT: Record<AdminUser['role'], string> = {
  PARENT: 'მშობელი',
  OPERATOR: 'ოპერატორი',
  ADMIN: 'ადმინი',
  SUPER_ADMIN: 'მთავარი',
};

const ROLE_CLASS: Record<AdminUser['role'], string> = {
  PARENT: styles.roleParent,
  OPERATOR: styles.roleOperator,
  ADMIN: styles.roleAdmin,
  SUPER_ADMIN: styles.roleSuper,
};

/**
 * მომხმარებლის ბარათი — აპლიკაციის ლოგიკის იგივე:
 * დაკეცილი სია, გახსნისას პაკეტის შეცვლა და ანგარიშის მართვა.
 */
export function UserCard({
  user,
  plans,
  canManageAccounts,
}: {
  user: AdminUser;
  plans: PlanOption[];
  canManageAccounts: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [planState, planAction] = useActionState<ActionState, FormData>(grantPlan, {});

  const currentPlan = user.subscription?.plan.code ?? null;

  return (
    <article className={styles.userCard}>
      <button className={styles.userHeader} onClick={() => setOpen(!open)}>
        <span className={styles.userNameCol}>
          <strong className={styles.userName}>
            {user.firstName} {user.lastName}
          </strong>
          <span className={styles.userContact}>{user.email ?? user.phone ?? '—'}</span>
        </span>

        <span className={styles.userRight}>
          <span className={styles.planLabel}>
            {user.subscription?.plan.name ?? 'პაკეტის გარეშე'}
            {!!user.subscription?.currentPeriodEnd && (
              <span className={styles.planUntil}>
                {' '}
                — {user.subscription.currentPeriodEnd.slice(0, 10)}-მდე
              </span>
            )}
          </span>
          <span className={`${styles.rolePill} ${ROLE_CLASS[user.role]}`}>
            {ROLE_SHORT[user.role]}
          </span>
          <span className={styles.chevron} aria-hidden>
            {open ? '▴' : '▾'}
          </span>
        </span>
      </button>

      {open && (
        <div className={styles.userBody}>
          {/* პაკეტი მშობლისთვისაა — პერსონალს გამოწერა არ სჭირდება */}
          {user.role === 'PARENT' && (
            <>
              <h4 className={styles.actionsTitle}>პაკეტის შეცვლა</h4>
              <div className={styles.planOptions}>
                {plans.map((plan) => (
                  <form action={planAction} key={plan.id}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="planCode" value={plan.code} />
                    <button
                      type="submit"
                      disabled={plan.code === currentPlan}
                      className={
                        plan.code === currentPlan ? styles.planCurrent : styles.planOption
                      }
                    >
                      {plan.name}
                    </button>
                  </form>
                ))}
              </div>
              {!!planState.error && <p className={styles.actionError}>{planState.error}</p>}
              {!!planState.notice && <p className={styles.actionNotice}>{planState.notice}</p>}
            </>
          )}

          {canManageAccounts && <AccountActions userId={user.id} />}
        </div>
      )}
    </article>
  );
}
