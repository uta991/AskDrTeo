import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/Logo';
import { colors, radius, spacing, typography } from '@/theme';
import { useAuth } from '@/features/auth/auth.store';

/**
 * შესვლის მეორე საფეხური.
 *
 * აქამდე მხოლოდ სწორი პაროლით მოხვდები — ტოკენი ჯერ არ გაცემულა და
 * უკან დაბრუნება ავტორიზაციას არ ასრულებს.
 */
export default function LoginCodeScreen() {
  const { challengeId, phone } = useLocalSearchParams<{
    challengeId: string;
    phone?: string;
  }>();

  const { verifyLoginCode, resendLoginCode } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  // სერვერზეც 60 წამია — ღილაკის ღიად დატოვება მხოლოდ შეცდომას დააბრუნებდა
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      await verifyLoginCode(challengeId, code.replace(/\D/g, ''), remember);
      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'კოდი არასწორია');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    try {
      const result = await resendLoginCode(challengeId);
      setNotice(result.message);
      setCooldown(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ვერ გაიგზავნა');
    }
  };

  return (
    <SkyBackground>
      <View style={styles.content}>
        <AuthCard>
          <View style={styles.header}>
            <Logo size={64} />
            <Text style={styles.title}>დადასტურება</Text>
            <Text style={styles.subtitle}>
              კოდი გამოგზავნილია ნომერზე{phone ? ` ${phone}` : ''}. ძალაშია 10 წუთი.
            </Text>
          </View>

          <Input
            icon="lock"
            placeholder="6-ნიშნა კოდი"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <Pressable style={styles.remember} onPress={() => setRemember(!remember)}>
            <View style={[styles.box, remember && styles.boxActive]} />
            <Text style={styles.rememberText}>დაიმახსოვრე ეს მოწყობილობა 30 დღით</Text>
          </Pressable>

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!notice && <Text style={styles.notice}>{notice}</Text>}

          <Button
            title="შესვლა"
            onPress={handleVerify}
            loading={loading}
            disabled={code.replace(/\D/g, '').length < 6}
          />

          <Pressable disabled={cooldown > 0} onPress={handleResend} style={styles.resend}>
            <Text style={[styles.resendText, cooldown > 0 && styles.resendMuted]}>
              {cooldown > 0 ? `ხელახლა გაგზავნა ${cooldown}წმ` : 'კოდის ხელახლა გაგზავნა'}
            </Text>
          </Pressable>
        </AuthCard>
      </View>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  title: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.sm },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  remember: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  boxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rememberText: { ...typography.small, color: colors.textSecondary, flex: 1 },
  error: { ...typography.small, color: colors.danger, marginBottom: spacing.xs },
  notice: { ...typography.small, color: colors.primaryText, marginBottom: spacing.xs },
  resend: { alignSelf: 'center', marginTop: spacing.md, padding: spacing.sm },
  resendText: { ...typography.small, color: colors.primaryText, fontWeight: '700' },
  resendMuted: { color: colors.textMuted },
});
