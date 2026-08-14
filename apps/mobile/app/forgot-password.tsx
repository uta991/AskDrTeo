import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '@/navigation/goBack';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/i18n';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useAuth } from '@/features/auth/auth.store';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const forgotPassword = useAuth((s) => s.forgotPassword);

  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!identifier.trim()) {
      setError(t('auth', 'errIdentifier'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { destination } = await forgotPassword(identifier.trim());
      setSent(destination);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common', 'error'));
    } finally {
      setLoading(false);
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
              <Icon name="lock" size={32} color={colors.primaryDeep} strokeWidth={2} />
            </View>
            <Text style={styles.title}>{t('auth', 'resetTitle')}</Text>
            <Text style={styles.subtitle}>
              {t('auth', 'resetSubtitle')}
            </Text>
          </View>

          <AuthCard>
            {sent ? (
              <>
                <Text style={styles.success}>
                  {t('auth', 'codeSent')}{'\n'}
                  <Text style={styles.destination}>{sent}</Text>
                </Text>
                <Button
                  title={t('auth', 'enterCode')}
                  onPress={() =>
                    router.push({
                      pathname: '/verify',
                      params: { destination: identifier.trim(), purpose: 'PASSWORD_RESET' },
                    })
                  }
                  showArrow
                />
              </>
            ) : (
              <>
                <Input
                  icon="user"
                  placeholder={t('auth', 'identifier')}
                  value={identifier}
                  onChangeText={setIdentifier}
                  error={error ?? undefined}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />
                <Button
                  title={t('auth', 'sendCode')}
                  onPress={handleSubmit}
                  loading={loading}
                  showArrow
                  style={styles.submit}
                />
              </>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth', 'rememberedPassword')}</Text>
              <Pressable onPress={() => router.replace('/login')} hitSlop={8}>
                <Text style={styles.link}>{t('auth', 'signIn')}</Text>
              </Pressable>
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
  success: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  destination: { color: colors.textPrimary, fontWeight: '600' },
  submit: { marginTop: spacing.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: { ...typography.caption, color: colors.textSecondary },
  link: { ...typography.caption, color: colors.primaryDeep, fontWeight: '700' },
});
