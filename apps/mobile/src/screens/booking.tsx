import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { Icon } from '@/components/ui/Icon';
import { colors, spacing, typography } from '@/theme';
import { useT } from '@/i18n';

export function BookingTab() {
  const insets = useSafeAreaInsets();
  const t = useT();

  return (
    <SkyBackground showDoves={false}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('booking', 'title')}</Text>
          <Text style={styles.subtitle}>{t('booking', 'subtitle')}</Text>
        </View>

        <AuthCard style={styles.card}>
          <View style={styles.emptyIcon}>
            <Icon name="calendar" size={26} color={colors.primaryDeep} strokeWidth={1.8} />
          </View>
          <Text style={styles.empty}>{t('booking', 'empty')}</Text>
        </AuthCard>
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  header: { marginBottom: spacing.lg },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  card: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  empty: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
