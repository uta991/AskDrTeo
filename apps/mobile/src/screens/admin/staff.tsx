import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { colors, radius, spacing, typography } from '@/theme';
import { useT } from '@/i18n';
import { useAuth } from '@/features/auth/auth.store';
import { useAdmin, type CreateStaffInput } from '@/features/admin/admin.store';
import { AccountActions } from '@/components/AccountActions';

type Role = CreateStaffInput['role'];

const ROLE_ORDER: Role[] = ['PARENT', 'OPERATOR', 'ADMIN', 'SUPER_ADMIN'];

/**
 * პერსონალის სია და შექმნა — პროფილის გვერდზე.
 *
 * ცალკე სიაა იმიტომ, რომ „მომხმარებლების" ტაბი მშობლებისთვისაა:
 * ერთ სიაში არეული ოპერატორი, ადმინი და მშობელი ძებნას უსარგებლოს ხდიდა.
 */
export function StaffSection() {
  const t = useT();
  const role = useAuth((s) => s.user?.role);
  const { staff, loadStaff, createStaff } = useAdmin();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'OPERATOR' as Role,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // შექმნა მხოლოდ Super Admin-ს შეუძლია — ადმინი მხოლოდ ხედავს
  const canCreate = role === 'SUPER_ADMIN';

  useEffect(() => {
    void loadStaff().catch(() => undefined);
  }, [loadStaff]);

  const handleCreate = async () => {
    setError(null);
    setBusy(true);
    try {
      await createStaff({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'OPERATOR' });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common', 'error'));
    } finally {
      setBusy(false);
    }
  };

  const valid =
    form.firstName.trim() && form.lastName.trim() && form.email.trim() && form.password.length >= 8;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('admin', 'staffList')}</Text>
        {canCreate && (
          <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8} style={styles.addButton}>
            <Icon
              name={open ? 'chevron-down' : 'user-plus'}
              size={16}
              color={colors.primaryDeep}
              strokeWidth={2}
            />
            <Text style={styles.addText}>{t('admin', 'addStaff')}</Text>
          </Pressable>
        )}
      </View>

      {open && canCreate && (
        <AuthCard style={styles.form}>
          <View style={styles.roleRow}>
            {ROLE_ORDER.map((option) => (
              <Pressable
                key={option}
                onPress={() => setForm((f) => ({ ...f, role: option }))}
                style={[styles.rolePick, form.role === option && styles.rolePickActive]}
              >
                <Text
                  style={[
                    styles.rolePickText,
                    form.role === option && styles.rolePickTextActive,
                  ]}
                >
                  {t('roles', option)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Input
            icon="user"
            placeholder={t('auth', 'firstName')}
            value={form.firstName}
            onChangeText={(v) => setForm((f) => ({ ...f, firstName: v }))}
            autoCapitalize="words"
          />
          <Input
            icon="user"
            placeholder={t('auth', 'lastName')}
            value={form.lastName}
            onChangeText={(v) => setForm((f) => ({ ...f, lastName: v }))}
            autoCapitalize="words"
          />
          <Input
            icon="mail"
            placeholder={t('auth', 'email')}
            value={form.email}
            onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <Input
            icon="lock"
            placeholder={t('auth', 'password')}
            value={form.password}
            onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
            secure
            autoCapitalize="none"
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Button
            title={t('admin', 'createStaff')}
            onPress={handleCreate}
            loading={busy}
            disabled={!valid}
          />
        </AuthCard>
      )}

      <AuthCard>
        {staff.map((member, index) => (
          <View key={member.id}>
            <Pressable
              onPress={() => canCreate && setOpenId(openId === member.id ? null : member.id)}
              style={[styles.row, index > 0 && styles.rowDivided]}
            >
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>
                  {member.firstName} {member.lastName}
                </Text>
                <Text style={styles.rowContact}>{member.email ?? member.phone ?? '—'}</Text>
              </View>
              <View style={[styles.rolePill, roleStyle(member.role)]}>
                <Text style={styles.rolePillText}>{t('roles', member.role)}</Text>
              </View>
            </Pressable>

            {openId === member.id && (
              <AccountActions
                userId={member.id}
                isStaff
                onDone={() => setOpenId(null)}
              />
            )}
          </View>
        ))}

        {!staff.length && <Text style={styles.empty}>{t('profile', 'noChildren')}</Text>}
      </AuthCard>
    </View>
  );
}

function roleStyle(role: Role) {
  if (role === 'SUPER_ADMIN') return styles.roleSuper;
  if (role === 'ADMIN') return styles.roleAdmin;
  if (role === 'OPERATOR') return styles.roleOperator;
  return styles.roleParent;
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
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  rolePick: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rolePickActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rolePickText: { ...typography.small, color: colors.textSecondary },
  rolePickTextActive: { color: colors.textOnPrimary, fontWeight: '700' },
  error: { ...typography.small, color: colors.danger, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rowDivided: { borderTopWidth: 1, borderTopColor: colors.border },
  rowInfo: { flex: 1 },
  rowName: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  rowContact: { ...typography.small, color: colors.textMuted },
  rolePill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  rolePillText: { ...typography.small, fontSize: 10, color: colors.surface, fontWeight: '700' },
  roleParent: { backgroundColor: colors.textMuted },
  roleOperator: { backgroundColor: colors.success },
  roleAdmin: { backgroundColor: colors.primaryDark },
  roleSuper: { backgroundColor: colors.danger },
  empty: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
});
