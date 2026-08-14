import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/Logo';
import { colors, radius, spacing, typography } from '@/theme';
import { useAuth } from '@/features/auth/auth.store';
import { useActiveChild, useChildren } from '@/features/children/children.store';

const ROLE_LABELS: Record<string, string> = {
  OPERATOR: 'ოპერატორი',
  ADMIN: 'ადმინისტრატორი',
  SUPER_ADMIN: 'მთავარი ადმინისტრატორი',
};

/**
 * დროებითი ეკრანი — ადასტურებს, რომ ავტორიზაციის ნაკადი ბოლომდე მუშაობს.
 * შემდეგ ეტაპზე ჩანაცვლდება ტაბებით: მთავარი / ვიდეო / ჩატი / პროფილი.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { children, load, reset } = useChildren();
  const activeChild = useActiveChild();

  const isStaff = !!user && user.role !== 'PARENT';

  useEffect(() => {
    // პერსონალს ბავშვის პროფილები არ აქვს — ზედმეტ მოთხოვნას არ ვაგზავნით
    if (user && !isStaff) void load().catch(() => undefined);
  }, [user, isStaff, load]);

  const handleLogout = async () => {
    reset();
    await logout();
    router.replace('/login');
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Logo size={64} />

          {isStaff ? (
            <>
              <Text style={styles.greeting}>სამართავი პანელი</Text>
              <Text style={styles.subtitle}>{ROLE_LABELS[user.role] ?? user.role}</Text>
            </>
          ) : (
            <>
              <Text style={styles.greeting}>გამარჯობა, {user?.firstName ?? ''}!</Text>
              <Text style={styles.subtitle}>
                {activeChild
                  ? `დღეს როგორ გრძნობს თავს ${activeChild.firstName}?`
                  : 'დაამატეთ თქვენი პატარას პროფილი'}
              </Text>
            </>
          )}
        </View>

        {!isStaff && !!activeChild && (
          <View style={styles.childChip}>
            <Text style={styles.childName}>{activeChild.firstName}</Text>
            <Text style={styles.childAge}>{activeChild.ageLabel}</Text>
          </View>
        )}

        <AuthCard>
          <Text style={styles.label}>ელ. ფოსტა</Text>
          <Text style={styles.value}>{user?.email ?? '—'}</Text>

          <Text style={styles.label}>ტელეფონი</Text>
          <Text style={styles.value}>{user?.phone ?? '—'}</Text>

          <Text style={styles.label}>როლი</Text>
          <Text style={styles.value}>{user?.role ?? '—'}</Text>

          {!isStaff && (
            <>
              <Text style={styles.label}>ბავშვის პროფილები</Text>
              <Text style={styles.value}>
                {children.length ? children.map((c) => c.firstName).join(', ') : 'ჯერ არ არის'}
              </Text>
            </>
          )}

          <Button
            title="გასვლა"
            variant="outline"
            onPress={handleLogout}
            style={styles.logout}
          />
        </AuthCard>
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  greeting: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  childChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  childName: { ...typography.bodyMedium, color: colors.textPrimary },
  childAge: { ...typography.small, color: colors.textSecondary },
  label: { ...typography.small, color: colors.textMuted, marginTop: spacing.md },
  value: { ...typography.bodyMedium, color: colors.textPrimary },
  logout: { marginTop: spacing.xl },
});
