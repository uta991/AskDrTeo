import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, radius, spacing, typography } from '@/theme';
import { useT } from '@/i18n';
import { useAdmin } from '@/features/admin/admin.store';

/**
 * ანგარიშის მართვა: პაროლის შეცვლა და წაშლა.
 *
 * წაშლა ორნაბიჯიანია — შემთხვევითი შეხება ანგარიშს არ უნდა შლიდეს.
 */
export function AccountActions({
  userId,
  isStaff,
  onDone,
}: {
  userId: string;
  isStaff: boolean;
  onDone?: () => void;
}) {
  const t = useT();
  const { setPassword, deleteAccount } = useAdmin();

  const [password, setPasswordValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>, successMessage?: string) => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await action();
      if (successMessage) setNotice(successMessage);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common', 'error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{t('admin', 'manageAccount')}</Text>

      <Input
        icon="lock"
        placeholder={t('admin', 'newPassword')}
        value={password}
        onChangeText={setPasswordValue}
        secure
        autoCapitalize="none"
      />

      <Button
        title={t('admin', 'savePassword')}
        variant="outline"
        disabled={password.length < 8 || busy}
        onPress={() =>
          run(async () => {
            await setPassword(userId, password);
            setPasswordValue('');
          }, t('admin', 'passwordChanged'))
        }
      />

      {confirmDelete ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>{t('admin', 'confirmDelete')}</Text>
          <View style={styles.confirmRow}>
            <Pressable style={styles.cancelButton} onPress={() => setConfirmDelete(false)}>
              <Text style={styles.cancelText}>{t('common', 'cancel')}</Text>
            </Pressable>
            <Pressable
              style={styles.deleteButton}
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await deleteAccount(userId, isStaff);
                  onDone?.();
                })
              }
            >
              <Text style={styles.deleteText}>{t('admin', 'deleteAccount')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.deleteLink} onPress={() => setConfirmDelete(true)}>
          <Text style={styles.deleteLinkText}>{t('admin', 'deleteAccount')}</Text>
        </Pressable>
      )}

      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  title: { ...typography.small, color: colors.textMuted, marginBottom: spacing.sm },
  deleteLink: { alignSelf: 'center', marginTop: spacing.md, padding: spacing.sm },
  deleteLinkText: { ...typography.small, color: colors.danger, fontWeight: '600' },
  confirmBox: {
    marginTop: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  confirmText: { ...typography.small, color: colors.danger, textAlign: 'center' },
  confirmRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelButton: {
    flex: 1,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { ...typography.small, color: colors.textSecondary },
  deleteButton: {
    flex: 1,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { ...typography.small, color: colors.surface, fontWeight: '700' },
  notice: { ...typography.small, color: colors.success, marginTop: spacing.sm, textAlign: 'center' },
  error: { ...typography.small, color: colors.danger, marginTop: spacing.sm, textAlign: 'center' },
});
