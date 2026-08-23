import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * ეკრანის თავსართი.
 *
 * ფონი თეთრია, სათაური კი ბრენდის ყვითელით — ასე ყვითელი წარწერაშია
 * და არა ფონზე.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  tone = 'brand',
  icon,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** „blue" — ეკრანის აქცენტს მიჰყვება, მაგ. ვიზიტის ჯავშანი */
  tone?: 'brand' | 'blue' | 'slate';
  /** სათაურის გვერდით ხატულა — ეკრანს ერთი შეხედვით ცნობს */
  icon?: IconName;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        {!!onBack && (
          <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
            <Icon name="chevron-left" size={20} color={colors.textPrimary} strokeWidth={2.4} />
          </Pressable>
        )}

        <View style={styles.text}>
          <Text
            style={[
              styles.title,
              tone === 'blue' && styles.titleBlue,
              tone === 'slate' && styles.titleSlate,
            ]}
          >
            {title}
          </Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {!!icon && (
          <View
            style={[
              styles.iconBadge,
              tone === 'blue' && styles.iconBadgeBlue,
              tone === 'slate' && styles.iconBadgeSlate,
            ]}
          >
            <Icon
              name={icon}
              size={22}
              color={
                tone === 'blue'
                  ? colors.skyBlueDeep
                  : tone === 'slate'
                    ? colors.slateDeep
                    : colors.primaryDeep
              }
              strokeWidth={1.9}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  text: { flex: 1 },
  title: { ...typography.h2, color: colors.primary },
  titleBlue: { color: colors.skyBlue },
  titleSlate: { color: colors.slate },
  subtitle: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconBadgeBlue: { backgroundColor: colors.skyBlueSoft },
  iconBadgeSlate: { backgroundColor: colors.slateSoft },
});
