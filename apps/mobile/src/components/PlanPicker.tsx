import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthCard } from '@/components/AuthCard';
import { Icon } from '@/components/ui/Icon';
import { colors, radius, spacing, typography } from '@/theme';
import { useT } from '@/i18n';
import { formatPrice, usePlans } from '@/features/plans/plans.store';

/**
 * პაკეტების არჩევა.
 *
 * უფასო პაკეტი სიაში არ ჩანს — ის შესაძენი არ არის და მხოლოდ
 * ადგილს იკავებდა. მიმდინარე პაკეტი მონიშნულია.
 */
export function PlanPicker({ currentPlanCode }: { currentPlanCode: string | null }) {
  const t = useT();
  const plans = usePlans((s) => s.plans);
  const [notice, setNotice] = useState<string | null>(null);

  const purchasable = plans.filter((p) => !p.isFree);
  if (!purchasable.length) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{t('plans', 'title')}</Text>
      <Text style={styles.subtitle}>{t('plans', 'subtitle')}</Text>

      {purchasable.map((plan) => {
        const isCurrent = plan.code === currentPlanCode;
        const monthly = plan.prices.find((p) => p.interval === 'MONTH') ?? plan.prices[0];
        const yearly = plan.prices.find((p) => p.interval === 'YEAR');

        // წლიური პაკეტის აზრი დანაზოგშია: 20 ₾ თვეში წელიწადში 240-ია,
        // ჩვენ კი 199-ს ვთხოვთ. ციფრის გარეშე მშობელი განსხვავებას ვერ ხედავს
        const fullYear = monthly && yearly ? monthly.amountMinor * 12 : null;
        const saved = fullYear && yearly ? fullYear - yearly.amountMinor : null;

        return (
          <AuthCard
            key={plan.id}
            style={StyleSheet.flatten([styles.card, isCurrent && styles.cardCurrent])}
          >
            <View style={styles.headerRow}>
              <View style={styles.nameCol}>
                <Text style={styles.planName}>
                  {t('planNames', plan.code as 'standard')}
                </Text>
                {!!plan.description && (
                  <Text style={styles.planDescription}>{plan.description}</Text>
                )}
              </View>

              {isCurrent ? (
                <View style={styles.currentPill}>
                  <Text style={styles.currentText}>{t('plans', 'current')}</Text>
                </View>
              ) : (
                !!plan.badge && (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )
              )}
            </View>

            {!!monthly && (
              <Text style={styles.price}>
                {formatPrice(monthly.amountMinor, monthly.currency)}
                <Text style={styles.period}>
                  {monthly.interval === 'YEAR' ? t('plans', 'perYear') : t('plans', 'perMonth')}
                </Text>
              </Text>
            )}

            {!!yearly && !!saved && saved > 0 && (
              <View style={styles.yearRow}>
                <Text style={styles.yearText}>
                  წელიწადში{' '}
                  <Text style={styles.yearCrossed}>
                    {formatPrice(fullYear!, yearly.currency)}
                  </Text>{' '}
                  <Text style={styles.yearNow}>
                    {formatPrice(yearly.amountMinor, yearly.currency)}
                  </Text>
                </Text>

                <View style={styles.saveSticker}>
                  <Text style={styles.saveText}>
                    დაზოგე {formatPrice(saved, yearly.currency)} · −
                    {Math.round((saved / fullYear!) * 100)}%
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.features}>
              {plan.features.slice(0, 5).map((feature) => (
                <View key={feature.key} style={styles.featureRow}>
                  <Icon
                    name="check"
                    size={13}
                    color={plan.colorHex ?? colors.primaryText}
                    strokeWidth={2.6}
                  />
                  <Text style={styles.featureText}>
                    {feature.name}
                    {feature.value && feature.value !== 'all' ? ` · ${feature.value}` : ''}
                  </Text>
                </View>
              ))}
            </View>

            {!isCurrent && (
              <Pressable
                style={styles.chooseButton}
                onPress={() => setNotice(t('plans', 'comingSoon'))}
              >
                <Text style={styles.chooseText}>{t('plans', 'choose')}</Text>
              </Pressable>
            )}
          </AuthCard>
        );
      })}

      {!!notice && <Text style={styles.notice}>{notice}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.xl },
  title: { ...typography.h3, color: colors.textPrimary },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  card: { marginBottom: spacing.md },
  cardCurrent: { borderWidth: 1.5, borderColor: colors.primary },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  nameCol: { flex: 1 },
  planName: { ...typography.bodyMedium, color: colors.textPrimary },
  planDescription: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  currentPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  currentText: { ...typography.small, color: colors.textOnPrimary, fontWeight: '700' },
  badgePill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  badgeText: { ...typography.small, color: colors.primaryDeep, fontWeight: '700' },
  price: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.sm },
  period: { ...typography.small, color: colors.textMuted, fontWeight: '400' },
  yearRow: { gap: 6, alignItems: 'flex-start' },
  yearText: { ...typography.small, fontSize: 12, color: colors.textSecondary },
  yearCrossed: { textDecorationLine: 'line-through' },
  yearNow: { color: colors.textPrimary, fontWeight: '700' },
  saveSticker: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  saveText: { ...typography.small, fontSize: 11, fontWeight: '700', color: colors.textOnPrimary },
  features: { marginTop: spacing.sm, gap: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: { ...typography.small, color: colors.textSecondary, flex: 1 },
  chooseButton: {
    marginTop: spacing.md,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseText: { ...typography.bodyMedium, fontSize: 15, color: colors.textOnPrimary },
  notice: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
