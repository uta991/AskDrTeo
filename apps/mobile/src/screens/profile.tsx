import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LanguageSwitch } from '@/components/ui/LanguageSwitch';
import { PlanPicker } from '@/components/PlanPicker';
import { colors, radius, spacing, typography } from '@/theme';
import { useT } from '@/i18n';
import { useAuth } from '@/features/auth/auth.store';
import { useChildren } from '@/features/children/children.store';
import { useEntitlements } from '@/features/entitlements/entitlements.store';
import { usePlans } from '@/features/plans/plans.store';
import { AdminUsersTab } from '@/screens/admin/users';
import { StaffSection } from '@/screens/admin/staff';
import { PromoSection } from '@/screens/admin/promo';
import { MedicationsSection } from '@/screens/admin/medications';
import { PromoRedeem } from '@/components/PromoRedeem';

export function ProfileTab() {
  const insets = useSafeAreaInsets();
  const t = useT();

  const { user, logout } = useAuth();
  const { children, reset: resetChildren } = useChildren();
  const { snapshot, reset: resetEntitlements } = useEntitlements();
  const loadPlans = usePlans((state) => state.load);

  const isStaff = !!user && user.role !== 'PARENT';
  const canManagePromo = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const missingChild = !isStaff && children.length === 0;

  useEffect(() => {
    if (!isStaff) void loadPlans().catch(() => undefined);
  }, [isStaff, loadPlans]);

  const handleLogout = async () => {
    resetChildren();
    resetEntitlements();
    await logout();
    router.replace('/login');
  };

  /** პაკეტის სახელი კოდიდან — backend-ის ქართული სახელი ენას არ მიჰყვება */
  const planLabel = snapshot?.planCode
    ? t('planNames', snapshot.planCode as 'free')
    : '—';

  return (
    <SkyBackground showDoves={false}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('profile', 'title')}</Text>

        {/* შეუვსებელი ბავშვის პროფილი — ყველაზე მნიშვნელოვანი გამოტოვებული ნაბიჯი */}
        {missingChild && (
          <Pressable style={styles.alert} onPress={() => router.push('/child-form')}>
            <View style={styles.alertDot} />
            <View style={styles.alertBody}>
              <Text style={styles.alertText}>{t('child', 'missing')}</Text>
              <Text style={styles.alertAction}>{t('child', 'addNow')}</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.danger} />
          </Pressable>
        )}

        <AuthCard>
          <Row label={t('profile', 'email')} value={user?.email ?? '—'} />
          <Row label={t('profile', 'phone')} value={user?.phone ?? '—'} />
          <Row
            label={t('profile', 'role')}
            value={user ? t('roles', user.role as 'PARENT') : '—'}
          />
          <Row label={t('profile', 'plan')} value={planLabel} />

          {!isStaff && (
            <>
              <Text style={[styles.label, missingChild && styles.labelDanger]}>
                {t('profile', 'children')}
              </Text>
              {missingChild ? (
                <Pressable onPress={() => router.push('/child-form')}>
                  <Text style={styles.valueDanger}>{t('child', 'missing')}</Text>
                </Pressable>
              ) : (
                <Text style={styles.value}>
                  {children.map((c) => c.firstName).join(', ')}
                </Text>
              )}
            </>
          )}

          <Text style={styles.label}>{t('profile', 'language')}</Text>
          <LanguageSwitch style={styles.switch} />

          <Button
            title={t('profile', 'logout')}
            variant="outline"
            onPress={handleLogout}
            style={styles.logout}
          />
        </AuthCard>

        {/* სწრაფი გადასვლა — ყველა ფუნქცია ერთ ადგილას, მენიუს გაბერვის გარეშე */}
        {!isStaff && (
          <AuthCard style={styles.links}>
            <Text style={styles.linksTitle}>სწრაფი გადასვლა</Text>

            {[
              { label: 'ჩატი კონსულტანტთან', path: '/chat' },
              { label: 'AI ასისტენტი', path: '/assistant' },
              { label: 'ზრდის დღიური', path: '/growth' },
              { label: 'აცრების კალენდარი', path: '/vaccinations' },
              { label: 'ვიდეო ბიბლიოთეკა', path: '/videos' },
              { label: 'ვიზიტი პედიატრთან', path: '/video-visit' },
              { label: 'შეტყობინებები', path: '/notifications' },
            ].map((row) => (
              <Pressable
                key={row.path}
                style={styles.linkRow}
                onPress={() => router.push(row.path as '/chat')}
              >
                <Text style={styles.linkText}>{row.label}</Text>
                <Icon name="chevron-right" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </AuthCard>
        )}

        {/* პრომო კოდი პაკეტების ზემოთ — ის შეიძლება პაკეტს ცვლიდეს */}
        {!isStaff && <PromoRedeem />}
        {!isStaff && <PlanPicker currentPlanCode={snapshot?.planCode ?? null} />}

        {/* პრომო კოდების მართვა — ოპერატორს არ ეკუთვნის */}
        {canManagePromo && <PromoSection />}

        {/* ცნობარი კალკულატორს კვებავს — ოპერატორს არ ეკუთვნის */}
        {canManagePromo && <MedicationsSection />}

        {/* შიდა მომხმარებლები — მხოლოდ პერსონალს */}
        {/* მშობლების სია — მენიუდან პროფილში გადმოვიდა */}
        {isStaff && <AdminUsersTab embedded />}

        {isStaff && <StaffSection />}
      </ScrollView>
    </SkyBackground>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  links: { marginBottom: spacing.sm, gap: 2 },
  linksTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.xs },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkText: { ...typography.small, color: colors.textPrimary },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.danger,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  alertDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  alertBody: { flex: 1 },
  alertText: { ...typography.caption, color: colors.danger, fontWeight: '600' },
  alertAction: { ...typography.small, color: colors.danger, marginTop: 2 },
  label: { ...typography.small, color: colors.textMuted, marginTop: spacing.md },
  labelDanger: { color: colors.danger },
  value: { ...typography.bodyMedium, color: colors.textPrimary },
  valueDanger: { ...typography.bodyMedium, color: colors.danger },
  switch: { marginTop: spacing.xs },
  logout: { marginTop: spacing.xl },
});
