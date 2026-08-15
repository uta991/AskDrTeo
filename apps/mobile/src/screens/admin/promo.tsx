import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { colors, radius, spacing, typography } from '@/theme';
import { useT } from '@/i18n';
import { useAdmin, type CreatePromoInput } from '@/features/admin/admin.store';
import { usePlans } from '@/features/plans/plans.store';

type PromoType = CreatePromoInput['type'];

/**
 * პრომო კოდების მართვა — ადმინისა და Super Admin-ისთვის.
 *
 * ორი ტიპია და თითოეულს სხვა ველები სჭირდება: ფასდაკლებას პროცენტი,
 * უფასო პაკეტს — პაკეტი და დღეების რაოდენობა. ფორმა ტიპის მიხედვით
 * იცვლება, რომ ადმინმა ზედმეტი ველები არ ნახოს.
 */
export function PromoSection() {
  const t = useT();
  const { promos, loadPromos, createPromo } = useAdmin();
  const plans = usePlans((state) => state.plans);
  const loadPlans = usePlans((state) => state.load);

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PromoType>('FREE_PLAN');
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('');
  const [planCode, setPlanCode] = useState('premium');
  const [days, setDays] = useState('30');
  const [limit, setLimit] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadPromos().catch(() => undefined);
    void loadPlans().catch(() => undefined);
  }, [loadPromos, loadPlans]);

  const valid =
    code.trim().length >= 3 &&
    (type === 'DISCOUNT' ? Number(percent) > 0 && Number(percent) <= 100 : Number(days) > 0);

  const handleCreate = async () => {
    setError(null);
    setBusy(true);
    try {
      await createPromo({
        code: code.trim().toUpperCase(),
        type,
        discountPercent: type === 'DISCOUNT' ? Number(percent) : undefined,
        planCode: type === 'FREE_PLAN' ? planCode : undefined,
        freeDays: type === 'FREE_PLAN' ? Number(days) : undefined,
        maxRedemptions: limit ? Number(limit) : undefined,
      });
      setCode('');
      setPercent('');
      setLimit('');
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common', 'error'));
    } finally {
      setBusy(false);
    }
  };

  // უფასო პაკეტი კოდით არ გაიცემა — ის ისედაც ყველას აქვს
  const purchasable = plans.filter((plan) => !plan.isFree);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('admin', 'promo')}</Text>
        <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8} style={styles.addButton}>
          <Icon
            name={open ? 'chevron-down' : 'user-plus'}
            size={16}
            color={colors.primaryDeep}
            strokeWidth={2}
          />
          <Text style={styles.addText}>{t('admin', 'addStaff')}</Text>
        </Pressable>
      </View>

      {open && (
        <AuthCard style={styles.form}>
          <View style={styles.typeRow}>
            <TypePill
              label={t('admin', 'typeFreePlan')}
              active={type === 'FREE_PLAN'}
              onPress={() => setType('FREE_PLAN')}
            />
            <TypePill
              label={t('admin', 'typeDiscount')}
              active={type === 'DISCOUNT'}
              onPress={() => setType('DISCOUNT')}
            />
          </View>

          <Input
            placeholder={t('admin', 'promoCode')}
            value={code}
            // კოდი ყოველთვის დიდი ასოებით — გამოსყიდვისას რეგისტრს არ ვამოწმებთ
            onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={30}
          />

          {type === 'DISCOUNT' ? (
            <Input
              placeholder={t('admin', 'discountPercent')}
              value={percent}
              onChangeText={(v) => setPercent(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
            />
          ) : (
            <>
              <View style={styles.planRow}>
                {purchasable.map((plan) => (
                  <TypePill
                    key={plan.id}
                    label={t('planNames', plan.code as 'premium')}
                    active={planCode === plan.code}
                    onPress={() => setPlanCode(plan.code)}
                  />
                ))}
              </View>
              <Input
                placeholder={t('admin', 'freeDays')}
                value={days}
                onChangeText={(v) => setDays(v.replace(/\D/g, ''))}
                keyboardType="number-pad"
                maxLength={4}
              />
            </>
          )}

          <Input
            placeholder={t('admin', 'maxRedemptions')}
            value={limit}
            onChangeText={(v) => setLimit(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={5}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Button
            title={t('admin', 'createPromo')}
            onPress={handleCreate}
            loading={busy}
            disabled={!valid}
          />
        </AuthCard>
      )}

      {promos.map((promo) => (
        <AuthCard key={promo.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.code}>{promo.code}</Text>
            <View style={[styles.statusPill, !promo.isActive && styles.statusOff]}>
              <Text style={styles.statusText}>
                {promo.isActive
                  ? promo.type === 'FREE_PLAN'
                    ? t('admin', 'typeFreePlan')
                    : t('admin', 'typeDiscount')
                  : t('admin', 'inactive')}
              </Text>
            </View>
          </View>

          <Text style={styles.detail}>
            {promo.type === 'FREE_PLAN'
              ? `${promo.plan?.name ?? '—'} · ${promo.freeDays} ${t('child', 'day')}`
              : `${promo.discountPercent}%`}
          </Text>

          <Text style={styles.usage}>
            {promo.redeemedCount} / {promo.maxRedemptions ?? '∞'} {t('admin', 'redeemed')}
          </Text>
        </AuthCard>
      ))}
    </View>
  );
}

function TypePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: { ...typography.h3, color: colors.textPrimary },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  addText: { ...typography.small, color: colors.primaryDeep, fontWeight: '600' },
  form: { marginBottom: spacing.md },
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  planRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { ...typography.small, color: colors.textSecondary },
  pillTextActive: { color: colors.textOnPrimary, fontWeight: '700' },
  error: { ...typography.small, color: colors.danger, marginBottom: spacing.sm },
  card: { marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  code: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1, letterSpacing: 1 },
  statusPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusOff: { backgroundColor: colors.textMuted },
  statusText: { ...typography.small, fontSize: 10, color: colors.surface, fontWeight: '700' },
  detail: { ...typography.small, color: colors.primaryDeep, marginTop: 2 },
  usage: { ...typography.small, color: colors.textMuted, marginTop: 2 },
});
