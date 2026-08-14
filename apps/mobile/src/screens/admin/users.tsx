import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { Input } from '@/components/ui/Input';
import { colors, radius, spacing, typography } from '@/theme';
import { useT } from '@/i18n';
import { useAdmin, type AdminUser } from '@/features/admin/admin.store';
import { usePlans } from '@/features/plans/plans.store';
import { AccountActions } from '@/components/AccountActions';
import { useAuth } from '@/features/auth/auth.store';

export function AdminUsersTab() {
  const insets = useSafeAreaInsets();
  const t = useT();

  const { users, usersTotal, loading, loadUsers, grantPlan } = useAdmin();
  const plans = usePlans((state) => state.plans);
  const loadPlans = usePlans((state) => state.load);

  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  // ანგარიშის წაშლა/პაროლი — მხოლოდ Super Admin-ის უფლებაა
  const canManageAccounts = useAuth((s) => s.user?.role) === 'SUPER_ADMIN';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadUsers().catch(() => undefined);
    void loadPlans().catch(() => undefined);
  }, [loadUsers, loadPlans]);

  // ძებნა 400მწ დაყოვნებით — ყოველ ასოზე მოთხოვნა ზედმეტია
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers(search.trim() || undefined).catch(() => undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, loadUsers]);

  const handleGrant = async (userId: string, planCode: string) => {
    setError(null);
    try {
      await grantPlan(userId, planCode);
      setOpenId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common', 'error'));
    }
  };

  return (
    <SkyBackground showDoves={false}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {t('admin', 'users')} <Text style={styles.count}>({usersTotal})</Text>
        </Text>

        <Input
          icon="user"
          placeholder={t('admin', 'searchUsers')}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}
        {loading && !users.length && <ActivityIndicator color={colors.primary} />}

        {users.map((user) => (
          <AuthCard key={user.id} style={styles.card}>
            <Pressable onPress={() => setOpenId(openId === user.id ? null : user.id)}>
              <View style={styles.headerRow}>
                <View style={styles.nameCol}>
                  <Text style={styles.name}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text style={styles.contact}>{user.email ?? user.phone ?? '—'}</Text>
                </View>
                <View style={[styles.rolePill, roleStyle(user.role)]}>
                  <Text style={styles.roleText}>{shortRole(user.role)}</Text>
                </View>
              </View>

              <View style={styles.planRow}>
                <Text style={styles.planLabel}>
                  {user.subscription
                    ? t('planNames', user.subscription.plan.code as 'free')
                    : t('admin', 'noPlan')}
                </Text>
                {!!user.subscription?.currentPeriodEnd && (
                  <Text style={styles.planUntil}>
                    {t('admin', 'until')} {user.subscription.currentPeriodEnd.slice(0, 10)}
                  </Text>
                )}
              </View>
            </Pressable>

            {openId === user.id && (
              <View style={styles.planPicker}>
                <Text style={styles.pickerTitle}>{t('admin', 'changePlan')}</Text>
                <View style={styles.planOptions}>
                  {plans.map((plan) => {
                    const current = user.subscription?.plan.code === plan.code;
                    return (
                      <Pressable
                        key={plan.id}
                        disabled={current}
                        onPress={() => handleGrant(user.id, plan.code)}
                        style={[styles.planOption, current && styles.planOptionCurrent]}
                      >
                        <Text
                          style={[styles.planOptionText, current && styles.planOptionTextCurrent]}
                        >
                          {t('planNames', plan.code as 'free')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {canManageAccounts && (
                  <AccountActions
                    userId={user.id}
                    isStaff={false}
                    onDone={() => setOpenId(null)}
                  />
                )}
              </View>
            )}
          </AuthCard>
        ))}
      </ScrollView>
    </SkyBackground>
  );
}

/** როლის მოკლე ნიშანი — სრული სახელი ბარათს ავიწროებდა. */
function shortRole(role: AdminUser['role']): string {
  return { PARENT: 'P', OPERATOR: 'OP', ADMIN: 'AD', SUPER_ADMIN: 'SA' }[role];
}

function roleStyle(role: AdminUser['role']) {
  if (role === 'SUPER_ADMIN') return styles.roleSuper;
  if (role === 'ADMIN') return styles.roleAdmin;
  if (role === 'OPERATOR') return styles.roleOperator;
  return styles.roleParent;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  count: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.small, color: colors.danger, marginBottom: spacing.sm },
  card: { marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  nameCol: { flex: 1 },
  name: { ...typography.bodyMedium, color: colors.textPrimary },
  contact: { ...typography.small, color: colors.textSecondary },
  rolePill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 32,
    alignItems: 'center',
  },
  roleText: { ...typography.small, fontSize: 10, fontWeight: '700', color: colors.textOnPrimary },
  roleParent: { backgroundColor: colors.textMuted },
  roleOperator: { backgroundColor: colors.success },
  roleAdmin: { backgroundColor: colors.primaryDark },
  roleSuper: { backgroundColor: colors.danger },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  planLabel: { ...typography.small, color: colors.primaryDeep, fontWeight: '600' },
  planUntil: { ...typography.small, color: colors.textMuted },
  planPicker: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  pickerTitle: { ...typography.small, color: colors.textMuted, marginBottom: spacing.sm },
  planOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  planOption: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  planOptionCurrent: { backgroundColor: colors.primary, borderColor: colors.primary },
  planOptionText: { ...typography.small, color: colors.textSecondary },
  planOptionTextCurrent: { color: colors.textOnPrimary, fontWeight: '700' },
});
