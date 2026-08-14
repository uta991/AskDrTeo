import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { colors, radius, spacing, typography } from '@/theme';
import { useT } from '@/i18n';
import { money, useAdmin } from '@/features/admin/admin.store';

export function AdminDashboardTab() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { overview, financial, loading, loadDashboard } = useAdmin();

  useEffect(() => {
    void loadDashboard().catch(() => undefined);
  }, [loadDashboard]);

  return (
    <SkyBackground showDoves={false}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('admin', 'dashboard')}</Text>

        {loading && !overview && <ActivityIndicator color={colors.primary} />}

        {!!overview && (
          <>
            <View style={styles.grid}>
              <Stat label={t('admin', 'totalUsers')} value={overview.users.total} highlight />
              <Stat label={t('admin', 'parents')} value={overview.users.parents} />
              <Stat label={t('admin', 'staff')} value={overview.users.staff} />
              <Stat label={t('admin', 'newThisMonth')} value={overview.users.newThisMonth} />
              <Stat label={t('admin', 'childProfiles')} value={overview.children} />
              <Stat label={t('admin', 'activeSubs')} value={overview.subscriptions.active} />
              <Stat label={t('admin', 'paidSubs')} value={overview.subscriptions.paid} />
              <Stat label={t('admin', 'videos')} value={overview.content.videos} />
            </View>

            {!!financial && (
              <>
                <Text style={styles.sectionTitle}>{t('admin', 'finance')}</Text>

                <AuthCard style={styles.mrrCard}>
                  <Text style={styles.mrrLabel}>{t('admin', 'mrr')}</Text>
                  <Text style={styles.mrrValue}>
                    {money(financial.mrrMinor, financial.currency)}
                  </Text>

                  <View style={styles.moneyRow}>
                    <MoneyCell
                      label={t('admin', 'thisMonthRevenue')}
                      value={money(financial.thisMonth.revenueMinor, financial.currency)}
                    />
                    <MoneyCell
                      label={t('admin', 'allTimeRevenue')}
                      value={money(financial.allTime.revenueMinor, financial.currency)}
                    />
                  </View>
                  <View style={styles.moneyRow}>
                    <MoneyCell
                      label={t('admin', 'pendingPayments')}
                      value={String(financial.pendingPayments)}
                    />
                    <MoneyCell
                      label={t('admin', 'refunded')}
                      value={money(financial.refundedMinor, financial.currency)}
                    />
                  </View>
                </AuthCard>

                <AuthCard>
                  <Text style={styles.cardTitle}>{t('admin', 'byPlan')}</Text>
                  {financial.planBreakdown.map((row) => (
                    <View key={row.planCode} style={styles.planRow}>
                      <View style={styles.planInfo}>
                        <Text style={styles.planName}>
                          {t('planNames', row.planCode as 'free')}
                        </Text>
                        <Text style={styles.planSubs}>
                          {row.subscribers} {t('admin', 'subscribers')}
                        </Text>
                      </View>
                      <Text style={styles.planRevenue}>
                        {money(row.monthlyRevenueMinor, financial.currency)}
                      </Text>
                    </View>
                  ))}
                </AuthCard>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function MoneyCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.moneyCell}>
      <Text style={styles.moneyLabel}>{label}</Text>
      <Text style={styles.moneyValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    // ორ სვეტად: (100% - gap) / 2
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  statCardHighlight: { backgroundColor: colors.primarySoft, borderColor: colors.primaryLight },
  statValue: { ...typography.h2, color: colors.textPrimary },
  statValueHighlight: { color: colors.primaryDeep },
  statLabel: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  mrrCard: { marginBottom: spacing.md },
  mrrLabel: { ...typography.small, color: colors.textMuted },
  mrrValue: { ...typography.h1, color: colors.primaryDeep, marginTop: 2 },
  moneyRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  moneyCell: { flex: 1 },
  moneyLabel: { ...typography.small, color: colors.textMuted },
  moneyValue: { ...typography.bodyMedium, color: colors.textPrimary },
  cardTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.sm },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  planInfo: { flex: 1 },
  planName: { ...typography.caption, color: colors.textPrimary },
  planSubs: { ...typography.small, color: colors.textMuted },
  planRevenue: { ...typography.bodyMedium, color: colors.primaryDeep },
});
