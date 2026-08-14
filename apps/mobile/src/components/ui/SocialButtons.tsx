import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors, shadows, spacing } from '@/theme';
import { AppleLogo, GoogleLogo } from './Icon';

const SIZE = 46;
// ლოგოები ორჯერ შემცირდა (26/27 → 13/14).
// წრე 46-ზე ნაკლები ვერ იქნება — შეხების მინიმალური ზომაა 44.
const GOOGLE_LOGO = 13;
const APPLE_LOGO = 14;

interface SocialButtonsProps {
  onGoogle: () => void;
  onApple: () => void;
  googleLoading?: boolean;
  appleLoading?: boolean;
}

/**
 * მრგვალი სოციალური ღილაკები — Google და Apple გვერდიგვერდ.
 *
 * Apple მხოლოდ iOS-ზე ჩანს: Android-ზე მისი ჩვენება მომხმარებელს
 * აბნევს, რადგან იქ სისტემურად ხელმისაწვდომი არ არის.
 *
 * შენიშვნა: Apple-ის ნატიური ღილაკის ნაცვლად ეს საკუთარი, მრგვალი
 * ვარიანტია. App Store-ის მოთხოვნაა ლოგოს პროპორციები და კონტრასტი
 * შენარჩუნდეს — ამიტომ ლოგო ორიგინალი ფორმისაა, შავი თეთრ წრეზე.
 */
export function SocialButtons({
  onGoogle,
  onApple,
  googleLoading,
  appleLoading,
}: SocialButtonsProps) {
  return (
    <View style={styles.row}>
      <CircleButton onPress={onGoogle} loading={googleLoading} label="შესვლა Google-ით">
        <GoogleLogo size={GOOGLE_LOGO} />
      </CircleButton>

      {Platform.OS === 'ios' && (
        <CircleButton onPress={onApple} loading={appleLoading} label="შესვლა Apple ID-ით">
          <AppleLogo size={APPLE_LOGO} />
        </CircleButton>
      )}
    </View>
  );
}

function CircleButton({
  children,
  onPress,
  loading,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  loading?: boolean;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
    >
      {loading ? <ActivityIndicator color={colors.textSecondary} /> : children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.input,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
});
