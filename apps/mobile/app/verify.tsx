import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '@/navigation/goBack';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/i18n';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useAuth, type OtpPurpose } from '@/features/auth/auth.store';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const params = useLocalSearchParams<{ destination: string; purpose: OtpPurpose }>();
  const destination = params.destination ?? '';
  const purpose = params.purpose ?? 'PHONE_VERIFICATION';

  const { verifyOtp, resendOtp } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  const inputs = useRef<Array<TextInput | null>>([]);
  const code = useMemo(() => digits.join(''), [digits]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    setError(null);

    // ჩასმისას (paste) მთელი კოდი ერთ ველში მოდის — ვანაწილებთ
    const clean = value.replace(/\D/g, '');
    if (clean.length > 1) {
      const next = Array(CODE_LENGTH).fill('');
      clean.slice(0, CODE_LENGTH).split('').forEach((d, i) => (next[i] = d));
      setDigits(next);
      inputs.current[Math.min(clean.length, CODE_LENGTH) - 1]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean;
    setDigits(next);

    if (clean && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (code.length < CODE_LENGTH) {
      setError(t('auth', 'enterFullCode'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await verifyOtp(destination, code, purpose);
      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common', 'error'));
      setDigits(Array(CODE_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp(destination, purpose);
      setCountdown(RESEND_SECONDS);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common', 'error'));
    }
  };

  return (
    <SkyBackground>
      <KeyboardAvoidingView
        style={[styles.flex, { paddingTop: insets.top + spacing.sm }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable onPress={() => goBack()} style={styles.back} hitSlop={12}>
          <Icon name="chevron-left" size={26} color={colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Icon name="phone" size={32} color={colors.primaryDeep} strokeWidth={2} />
            </View>
            <Text style={styles.title}>{t('auth', 'verifyTitle')}</Text>
            <Text style={styles.subtitle}>
              {t('auth', 'verifySubtitle', { length: CODE_LENGTH })}{'\n'}
              <Text style={styles.destination}>{destination}</Text>
            </Text>
          </View>

          <AuthCard>
            <View style={styles.codeRow}>
              {digits.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  value={digit}
                  onChangeText={(v) => handleChange(i, v)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={CODE_LENGTH}
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  autoFocus={i === 0}
                  selectTextOnFocus
                  style={[styles.codeBox, !!digit && styles.codeBoxFilled, !!error && styles.codeBoxError]}
                />
              ))}
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Button
              title={t('auth', 'confirm')}
              onPress={handleVerify}
              loading={loading}
              showArrow
              style={styles.submit}
            />

            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <Text style={styles.resendText}>
                  {t('auth', 'resendIn', { seconds: countdown })}
                </Text>
              ) : (
                <Pressable onPress={handleResend} hitSlop={8}>
                  <Text style={styles.link}>{t('auth', 'resend')}</Text>
                </Pressable>
              )}
            </View>
          </AuthCard>
        </View>
      </KeyboardAvoidingView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { alignSelf: 'flex-start', padding: spacing.lg },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  title: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.lg },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  destination: { color: colors.textPrimary, fontWeight: '600' },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  codeBox: {
    width: 46,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    textAlign: 'center',
    ...typography.h3,
    color: colors.textPrimary,
  },
  codeBoxFilled: { borderColor: colors.primary },
  codeBoxError: { borderColor: colors.danger },
  error: {
    ...typography.small,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  submit: { marginBottom: spacing.lg },
  resendRow: { alignItems: 'center' },
  resendText: { ...typography.caption, color: colors.textMuted },
  link: { ...typography.caption, color: colors.primaryDeep, fontWeight: '700' },
});
