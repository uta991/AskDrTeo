import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { Icon, type IconName } from './Icon';

interface InputProps extends Omit<TextInputProps, 'style'> {
  icon?: IconName;
  error?: string;
  /** პაროლის ველი — თვალის ღილაკით ჩვენება/დამალვა */
  secure?: boolean;
  /** ტელეფონის ველისთვის: მარცხნივ ჩნდება ქვეყნის კოდი */
  countryCode?: string;
  onPressCountryCode?: () => void;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { icon, error, secure = false, countryCode, onPressCountryCode, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
          !!countryCode && styles.fieldTall,
        ]}
      >
        {icon && (
          <View style={styles.icon}>
            <Icon
              name={icon}
              size={20}
              color={focused ? colors.primary : colors.textMuted}
            />
          </View>
        )}

        <View style={styles.inputArea}>
          <TextInput
            ref={ref}
            {...props}
            secureTextEntry={hidden}
            placeholderTextColor={colors.textMuted}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            style={styles.input}
          />

          {/* ქვეყნის კოდი ველის შიგნით, placeholder-ის ქვემოთ */}
          {countryCode && (
            <Pressable
              onPress={onPressCountryCode}
              style={styles.countryCode}
              accessibilityRole="button"
              accessibilityLabel="ქვეყნის კოდის არჩევა"
            >
              <Text style={styles.countryCodeText}>{countryCode}</Text>
              <Icon name="chevron-down" size={14} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {secure && (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={12}
            style={styles.trailing}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'პაროლის ჩვენება' : 'პაროლის დამალვა'}
          >
            <Icon name={hidden ? 'eye' : 'eye-off'} size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    // 52 — შეხების მინიმალურ 44-ზე მაღლა, მაგრამ საკმარისად კომპაქტური,
    // რომ რეგისტრაციის 6 ველი ერთ ეკრანზე ჩაეტიოს
    minHeight: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    ...shadows.input,
  },
  fieldTall: { minHeight: 64 },
  fieldFocused: { borderColor: colors.borderFocus },
  fieldError: { borderColor: colors.danger },
  icon: { marginRight: spacing.md },
  inputArea: { flex: 1, justifyContent: 'center' },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    // Android-ზე TextInput-ს საკუთარი padding აქვს — ვასწორებთ
    paddingHorizontal: 0,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -6,
    marginBottom: spacing.sm,
  },
  countryCodeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  trailing: { marginLeft: spacing.md },
  error: {
    ...typography.small,
    color: colors.danger,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
});
