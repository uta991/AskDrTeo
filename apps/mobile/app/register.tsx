import React, { useEffect, useState } from 'react';
import {
  Image,
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
import { goBack } from '@/navigation/goBack';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Icon } from '@/components/ui/Icon';
import { SocialButtons } from '@/components/ui/SocialButtons';
import { images } from '@/assets/images';
import { useT } from '@/i18n';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useAuth } from '@/features/auth/auth.store';
import { useSocialAuth } from '@/features/auth/useSocialAuth';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

type FieldErrors = Partial<Record<keyof FormState | 'terms', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const register = useAuth((s) => s.register);
  const user = useAuth((s) => s.user);
  const social = useSocialAuth();

  useEffect(() => {
    if (user) router.replace('/home');
  }, [user]);

  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const next: FieldErrors = {};

    if (!form.firstName.trim()) next.firstName = t('auth', 'errFirstName');
    if (!form.lastName.trim()) next.lastName = t('auth', 'errLastName');
    if (!EMAIL_RE.test(form.email.trim())) next.email = t('auth', 'errEmail');

    // ლოკალურად მხოლოდ საბაზისო შემოწმება — სრულ ვალიდაციას backend აკეთებს
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 9) next.phone = t('auth', 'errPhone');

    if (!PASSWORD_RE.test(form.password)) {
      next.password = t('auth', 'errPassword');
    }
    if (form.password !== form.confirmPassword) {
      next.confirmPassword = t('auth', 'errPasswordMatch');
    }
    if (!acceptedTerms) next.terms = t('auth', 'errTerms');

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = async () => {
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const digits = form.phone.replace(/\D/g, '');
      const { destination } = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: `+995${digits.replace(/^995/, '')}`,
        password: form.password,
        acceptedTerms,
      });

      router.push({
        pathname: '/verify',
        params: { destination, purpose: 'PHONE_VERIFICATION' },
      });
    } catch (e) {
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
            { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => goBack()} style={styles.back} hitSlop={12}>
            <Icon name="chevron-left" size={26} color={colors.textPrimary} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.header}>
            {/* სპეციალისტის ფოტო — ქვესათაურის დაპირებას სახეს აძლევს */}
            <View style={styles.avatarBadge}>
              <Image source={images.doctor} style={styles.avatarPhoto} resizeMode="cover" />
            </View>
            <Text style={styles.title}>{t('auth', 'registerTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth', 'registerSubtitle')}</Text>
          </View>

          <AuthCard>
            <Input
              icon="user"
              placeholder={t('auth', 'firstName')}
              value={form.firstName}
              onChangeText={set('firstName')}
              error={errors.firstName}
              autoCapitalize="words"
              textContentType="givenName"
            />
            <Input
              icon="user"
              placeholder={t('auth', 'lastName')}
              value={form.lastName}
              onChangeText={set('lastName')}
              error={errors.lastName}
              autoCapitalize="words"
              textContentType="familyName"
            />
            <Input
              icon="mail"
              placeholder={t('auth', 'email')}
              value={form.email}
              onChangeText={set('email')}
              error={errors.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <Input
              icon="phone"
              placeholder={t('auth', 'phone')}
              value={form.phone}
              onChangeText={set('phone')}
              error={errors.phone}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              countryCode="+995"
            />
            <Input
              icon="lock"
              placeholder={t('auth', 'password')}
              value={form.password}
              onChangeText={set('password')}
              error={errors.password}
              secure
              autoCapitalize="none"
              textContentType="newPassword"
            />
            <Input
              icon="lock"
              placeholder={t('auth', 'repeatPassword')}
              value={form.confirmPassword}
              onChangeText={set('confirmPassword')}
              error={errors.confirmPassword}
              secure
              autoCapitalize="none"
              textContentType="newPassword"
            />

            <View style={styles.termsRow}>
              <Checkbox
                checked={acceptedTerms}
                onChange={setAcceptedTerms}
                accessibilityLabel="წესებსა და პირობებზე დათანხმება"
              />
              <Pressable
                onPress={() => setAcceptedTerms((v) => !v)}
                style={styles.termsTextWrapper}
              >
                <Text style={styles.termsText}>
                  {t('auth', 'acceptTerms')}<Text style={styles.link}>{t('auth', 'termsLink')}</Text>
                </Text>
              </Pressable>
            </View>
            {!!errors.terms && <Text style={styles.fieldError}>{errors.terms}</Text>}

            {!!(formError ?? social.error) && (
              <Text style={styles.formError}>{formError ?? social.error}</Text>
            )}

            <Button
              title={t('auth', 'register')}
              onPress={handleRegister}
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
              <Text style={styles.footerText}>{t('auth', 'haveAccount')}</Text>
              <Pressable onPress={() => router.replace('/login')} hitSlop={8}>
                <Text style={[styles.link, styles.linkStrong]}>{t('auth', 'signIn')}</Text>
              </Pressable>
            </View>
          </AuthCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, flexGrow: 1 },
  back: { alignSelf: 'flex-start', padding: spacing.xs },
  // ზომები შერჩეულია ისე, რომ ექვსივე ველი და ღილაკები სქროლის გარეშე ჩაეტიოს
  header: { alignItems: 'center', marginTop: spacing.xs, marginBottom: spacing.sm },
  avatarBadge: {
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: colors.surface,
    // თეთრი რგოლი ფოტოს ნაცრისფერ ფონს თბილი ფონისგან აშორებს
    borderWidth: 3,
    borderColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  avatarPhoto: { width: '100%', height: '100%' },
  title: {
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  termsTextWrapper: { flex: 1, marginLeft: spacing.md },
  termsText: { ...typography.caption, color: colors.textSecondary },
  link: { color: colors.primaryDeep, fontWeight: '600' },
  linkStrong: { fontWeight: '700' },
  fieldError: {
    ...typography.small,
    color: colors.danger,
    marginTop: -spacing.md,
    marginBottom: spacing.md,
  },
  formError: {
    ...typography.caption,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  submit: { marginBottom: spacing.sm },
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
