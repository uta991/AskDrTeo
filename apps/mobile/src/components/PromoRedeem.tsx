import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { colors, radius, spacing, typography } from '@/theme';
import { useT } from '@/i18n';
import { api } from '@/api/client';
import { useEntitlements } from '@/features/entitlements/entitlements.store';

interface RedeemResult {
  type: 'DISCOUNT' | 'FREE_PLAN';
  message: string;
  planName?: string;
  validUntil?: string;
  discountPercent?: number;
}

/**
 * პრომო კოდის შეყვანა მშობლის პროფილში.
 *
 * წარმატების შემდეგ უფლებები ხელახლა იტვირთება — თორემ ახალი პაკეტი
 * აპლიკაციაში მხოლოდ თავიდან შესვლის შემდეგ გამოჩნდებოდა.
 */
export function PromoRedeem() {
  const t = useT();
  const loadEntitlements = useEntitlements((state) => state.load);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async () => {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const response = await api<RedeemResult>('/promo/redeem', {
        method: 'POST',
        body: { code: code.trim() },
      });

      setResult(response);
      setCode('');
      await loadEntitlements().catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common', 'error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{t('admin', 'enterPromo')}</Text>

      <AuthCard>
        <Input
          placeholder={t('admin', 'enterPromo')}
          value={code}
          // რეგისტრს backend არ ამოწმებს, მაგრამ ველში დიდი ასოები
          // მომხმარებელს ადასტურებს, რომ კოდი სწორად შეიყვანა
          onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={30}
          returnKeyType="done"
          onSubmitEditing={handleRedeem}
        />

        <Button
          title={t('admin', 'applyPromo')}
          onPress={handleRedeem}
          loading={busy}
          disabled={code.trim().length < 3}
        />

        {!!result && (
          <View style={styles.success}>
            <Icon name="check" size={16} color={colors.success} strokeWidth={2.6} />
            <Text style={styles.successText}>{result.message}</Text>
          </View>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}
      </AuthCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.xl },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  successText: { ...typography.small, color: colors.textPrimary, flex: 1 },
  error: {
    ...typography.small,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
