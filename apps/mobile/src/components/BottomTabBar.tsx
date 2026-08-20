import React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export interface TabDescriptor {
  key: string;
  label: string;
  icon: IconName;
  /** წითელი წერტილი — ყურადღების მოთხოვნის ნიშანი */
  badge?: boolean;
  /** იკონის ნაცვლად მრგვალი ფოტო */
  avatarUrl?: string | null;
}

interface BottomTabBarProps {
  tabs: TabDescriptor[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function BottomTabBar({ tabs, activeIndex, onSelect }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {tabs.map((tab, index) => {
        const focused = index === activeIndex;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            style={styles.item}
          >
            <View style={[styles.iconWrap, focused && !tab.avatarUrl && styles.iconWrapActive]}>
              {tab.avatarUrl ? (
                <Image
                  source={{ uri: tab.avatarUrl }}
                  style={[styles.avatar, focused && styles.avatarActive]}
                />
              ) : (
                <Icon
                  name={tab.icon}
                  size={22}
                  color={focused ? colors.textOnPrimary : colors.textMuted}
                  strokeWidth={focused ? 2.2 : 1.8}
                />
              )}
              {tab.badge && <View style={styles.badge} />}
            </View>
            <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    // ჩრდილი ზემოთ — ზოლი კონტენტს „ზემოდან" ეფარება
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      default: shadows.card,
    }),
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.primary },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  avatarActive: { borderColor: colors.primary, borderWidth: 2 },
  // წითელი წერტილი იკონის ზედა-მარჯვენა კუთხეზე
  badge: {
    position: 'absolute',
    top: -1,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  label: { ...typography.small, fontSize: 11, color: colors.textMuted },
  labelActive: { color: colors.textPrimary, fontWeight: '600' },
});
