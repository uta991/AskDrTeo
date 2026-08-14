import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '@/theme';
import { Icon } from './Icon';

interface CheckboxProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel?: string;
}

export function Checkbox({ checked, onChange, accessibilityLabel }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Icon name="check" size={14} color={colors.textOnPrimary} strokeWidth={3} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
