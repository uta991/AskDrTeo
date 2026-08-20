import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * ეკრანის ყვითელი თავსართი.
 *
 * ბრენდის ტონი ზედა ზოლშია და არა ფონზე — ასე ყვითელი მკაფიოდ ჩანს,
 * შიგთავსი კი თეთრზე რჩება და იკითხება.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        {!!onBack && (
          <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
            <Icon name="chevron-left" size={20} color={colors.textOnPrimary} strokeWidth={2.4} />
          </Pressable>
        )}

        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceTranslucent,
  },
  text: { flex: 1 },
  title: { ...typography.h2, color: colors.textOnPrimary },
  subtitle: { ...typography.small, color: colors.textOnPrimary, opacity: 0.75, marginTop: 2 },
});
