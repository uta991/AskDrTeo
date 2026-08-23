import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { Icon } from './Icon';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  /** „blue" — მოცისფრო ტონი; ბრენდის ყვითელი ყველგან ერთფეროვანი გამოდიოდა */
  tone?: 'brand' | 'blue' | 'slate';
  loading?: boolean;
  disabled?: boolean;
  /** მარჯვნივ ისარი — მთავარ CTA ღილაკებზე */
  showArrow?: boolean;
  leftIcon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  tone = 'brand',
  loading = false,
  disabled = false,
  showArrow = false,
  leftIcon,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const textColor = variant === 'primary' ? colors.textOnPrimary : colors.textPrimary;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          {showArrow && (
            <View style={styles.arrow}>
              <Icon name="chevron-right" size={20} color={textColor} strokeWidth={2.4} />
            </View>
          )}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variant !== 'primary' && styles[variant],
        variant === 'primary' && shadows.button,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={
            tone === 'blue'
              ? [colors.skyBlue, colors.skyBlueDeep]
              : tone === 'slate'
                ? [colors.slate, colors.slateDeep]
                : [colors.primary, colors.primaryDark]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 58,
    borderRadius: radius.pill,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.bodyMedium,
    fontSize: 17,
    letterSpacing: 0.2,
  },
  leftIcon: { marginRight: spacing.md },
  arrow: { marginLeft: spacing.sm },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
