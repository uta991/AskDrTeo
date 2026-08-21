import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { HeroBaby } from '@/components/HeroBaby';
import { HeartFlourish, Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SocialButtons } from '@/components/ui/SocialButtons';
import { LanguageSwitch } from '@/components/ui/LanguageSwitch';
import { useT } from '@/i18n';
import { colors, spacing, typography } from '@/theme';
import { useAuth } from '@/features/auth/auth.store';
import { useSocialAuth } from '@/features/auth/useSocialAuth';
import { ApiError } from '@/api/client';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const login = useAuth((s) => s.login);
  const social = useSocialAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // სოციალური შესვლა store-ს ავსებს ეკრანის გვერდის ავლით — გადამისამართება აქ ხდება
  const user = useAuth((s) => s.user);
  useEffect(() => {
    if (user) router.replace('/home');
  }, [user]);

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!identifier.trim()) next.identifier = t('auth', 'errIdentifier');
    if (!password) next.password = t('auth', 'errPasswordEmpty');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const challenge = await login(identifier.trim(), password);

      // ორეტაპიანი შესვლა — ტოკენი ჯერ არ გაცემულა, კოდი ნომერზეა
      if (challenge) {
        router.push({
          pathname: '/login-code',
          params: { challengeId: challenge.challengeId, phone: challenge.maskedPhone },
        });
        return;
      }

      router.replace('/home');
    } catch (e) {
      // დაუდასტურებელი ნომრის შემთხვევაში backend კოდს თავად აგზავნის
      if (e instanceof ApiError && e.message.includes('დადასტურებული')) {
        router.push({
          pathname: '/verify',
          params: { destination: identifier.trim(), purpose: 'PHONE_VERIFICATION' },
        });
        return;
      }
      setFormError(e instanceof Error ? e.message : t('common', 'error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SkyBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ფოტო კიდიდან კიდემდე — გვერდითი padding მხოლოდ ბარათს აქვს */}
          {/* ენის გადამრთველი ავტორიზაციამდეც ხელმისაწვდომია */}
          <View style={[styles.langWrap, { top: insets.top + spacing.xs }]}>
            <LanguageSwitch subtle />
          </View>

          <HeroBaby>
            <View style={{ height: insets.top }} />
            <Logo size={72} />
            <Text style={styles.title}>{t('auth', 'welcomeTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth', 'welcomeSubtitle')}</Text>
            <View style={styles.flourish}>
              <HeartFlourish width={116} />
            </View>
          </HeroBaby>

          <View style={styles.cardWrap}>
          <AuthCard>
            <Input
              icon="user"
              placeholder={t('auth', 'identifier')}
              value={identifier}
              onChangeText={setIdentifier}
              error={errors.identifier}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              returnKeyType="next"
            />

            <Input
              icon="lock"
              placeholder={t('auth', 'password')}
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secure
              autoCapitalize="none"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <Pressable
              onPress={() => router.push('/forgot-password')}
              style={styles.forgotWrapper}
              hitSlop={8}
            >
              <Text style={styles.link}>{t('auth', 'forgotPassword')}</Text>
            </Pressable>

            {!!(formError ?? social.error) && (
              <Text style={styles.formError}>{formError ?? social.error}</Text>
            )}

            <Button
              title={t('auth', 'signIn')}
              onPress={handleLogin}
              loading={loading}
              showArrow
              style={styles.submit}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('common', 'or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <SocialButtons
              googleLoading={social.pending === 'google'}
              appleLoading={social.pending === 'apple'}
              onGoogle={() => {
                setFormError(null);
                void social.signInWithGoogle();
              }}
              onApple={() => {
                setFormError(null);
                void social.signInWithApple();
              }}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth', 'noAccount')}</Text>
              <Pressable onPress={() => router.push('/register')} hitSlop={8}>
                <Text style={[styles.link, styles.linkStrong]}>{t('auth', 'register')}</Text>
              </Pressable>
            </View>
          </AuthCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  langWrap: { position: 'absolute', left: spacing.lg, zIndex: 10 },
  // ბარათი ფოტოს ბოლოში იწყება. გადაფარვა მინიმალურია — მეტი ბავშვის
  // ხელს ფარავდა
  cardWrap: { paddingHorizontal: spacing.xl, marginTop: spacing.md },
  title: {
    // მაკეტზე სათაური h1-ზე მცირეა — ლოგოსა და ფოტოს შორის უნდა ჩაჯდეს
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  flourish: { marginTop: spacing.xs },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  forgotWrapper: { alignSelf: 'flex-end', marginBottom: spacing.md },
  // ყვითელი თეთრზე სუსტად იკითხება — ბმულებზე მუქ ტონს ვიყენებთ
  link: { ...typography.caption, color: colors.primaryDeep, fontWeight: '600' },
  linkStrong: { fontWeight: '700' },
  formError: {
    ...typography.caption,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  submit: { marginBottom: spacing.md },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  footerText: { ...typography.caption, color: colors.textSecondary },
});
