import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { Icon } from '@/components/ui/Icon';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useT } from '@/i18n';
import { useAuth } from '@/features/auth/auth.store';
import { useActiveChild, useChildren } from '@/features/children/children.store';
import { useEntitlements, useIsFreePlan } from '@/features/entitlements/entitlements.store';
import { useNews } from '@/features/news/news.store';

export function HomeTab() {
  const insets = useSafeAreaInsets();
  const t = useT();

  const user = useAuth((s) => s.user);
  const { children, load: loadChildren } = useChildren();
  const activeChild = useActiveChild();
  const loadEntitlements = useEntitlements((s) => s.load);
  const isFree = useIsFreePlan();
  const { posts: news, load: loadNews } = useNews();

  const isStaff = !!user && user.role !== 'PARENT';

  useEffect(() => {
    if (!user) return;
    void loadEntitlements().catch(() => undefined);
    void loadNews().catch(() => undefined);
    // პერსონალს ბავშვის პროფილები არ აქვს — ზედმეტ მოთხოვნას არ ვაგზავნით
    if (!isStaff) void loadChildren().catch(() => undefined);
  }, [user, isStaff, loadChildren, loadEntitlements, loadNews]);

  return (
    <SkyBackground showDoves={false}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* უფასო პაკეტის ნიშანი — მარცხენა ზედა კუთხეში, ყველაზე ხილულ ადგილას */}
        {isFree && !isStaff && (
          <View style={styles.freeBadge}>
            <Icon name="crown" size={14} color={colors.primaryDeep} strokeWidth={2} />
            <Text style={styles.freeBadgeText}>{t('home', 'freePlan')}</Text>
          </View>
        )}

        <View style={styles.header}>
          {isStaff ? (
            <>
              <Text style={styles.greeting}>{t('home', 'adminPanel')}</Text>
              <Text style={styles.subtitle}>
                {t('roles', user.role as 'ADMIN') || user.role}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.greeting}>
                {t('home', 'greeting', { name: user?.firstName ?? '' })}
              </Text>
              <Text style={styles.subtitle}>
                {activeChild
                  ? t('home', 'childQuestion', { child: activeChild.firstName })
                  : t('home', 'noChild')}
              </Text>
            </>
          )}
        </View>

        {!isStaff && children.length > 0 && (
          <View style={styles.childRow}>
            {children.map((child) => (
              <View
                key={child.id}
                style={[styles.childChip, child.id === activeChild?.id && styles.childChipActive]}
              >
                <Text style={styles.childName}>{child.firstName}</Text>
                <Text style={styles.childAge}>{child.ageLabel}</Text>
              </View>
            ))}
          </View>
        )}

        {isFree && !isStaff && (
          <Pressable style={styles.upgradeCard} onPress={() => router.push('/plans')}>
            <View style={styles.upgradeIcon}>
              <Icon name="crown" size={20} color={colors.primaryDeep} strokeWidth={2} />
            </View>
            <Text style={styles.upgradeText}>{t('home', 'upgrade')}</Text>
            <Icon name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
        )}

        {/* ასაკობრივი ეტაპი — რას უნდა მიაქციოს მშობელმა ყურადღება ახლა */}
        {!isStaff && !!activeChild && (
          <AuthCard style={styles.card}>
            <View style={styles.stageHeader}>
              <View style={styles.stageIcon}>
                <Icon name="bulb" size={18} color={colors.primaryDeep} strokeWidth={2} />
              </View>
              <View style={styles.stageTitles}>
                <Text style={styles.stageName}>{t('stages', activeChild.stage)}</Text>
                <Text style={styles.stageRange}>
                  {t('stages', `${activeChild.stage}_RANGE` as 'NEWBORN_RANGE')}
                </Text>
              </View>
            </View>

            <Text style={styles.needsTitle}>{t('stages', 'needsTitle')}</Text>
            <Text style={styles.needsText}>
              {t('stages', `${activeChild.stage}_NEEDS` as 'NEWBORN_NEEDS')}
            </Text>

            {activeChild.isPreterm && (
              <Text style={styles.preterm}>
                {t('stages', 'preterm', { months: activeChild.correctedAgeMonths })}
              </Text>
            )}
          </AuthCard>
        )}

        {/* ბავშვის პროფილის გარეშე ასაკობრივი კონტენტი ვერ შეირჩევა */}
        {!isStaff && !activeChild && (
          <Pressable style={styles.addChildCard} onPress={() => router.push('/child-form')}>
            <View style={styles.addChildIcon}>
              <Icon name="user-plus" size={20} color={colors.danger} strokeWidth={2} />
            </View>
            <View style={styles.addChildBody}>
              <Text style={styles.addChildTitle}>{t('child', 'missing')}</Text>
              <Text style={styles.addChildAction}>{t('child', 'addNow')}</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.danger} />
          </Pressable>
        )}

        {/* ── სიახლეები ─────────────────────────────────────── */}
        {!!news.length && (
          <>
            <Text style={styles.newsTitle}>{t('home', 'news')}</Text>

            {news.map((post) => (
              <AuthCard key={post.id} style={styles.newsCard}>
                <Text style={styles.newsDate}>
                  {(post.publishedAt ?? post.createdAt).slice(0, 10)}
                </Text>
                <Text style={styles.newsHeading}>{post.title}</Text>
                <Text style={styles.newsBody}>{post.body}</Text>

                {!!post.video && (
                  <View style={styles.newsVideo}>
                    <Icon name="chevron-right" size={12} color={colors.primaryDeep} strokeWidth={2} />
                    <Text style={styles.newsVideoText}>{t('home', 'newsVideo')}</Text>
                  </View>
                )}
              </AuthCard>
            ))}
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  freeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
  },
  freeBadgeText: {
    ...typography.small,
    color: colors.primaryDeep,
    fontWeight: '600',
  },
  header: { marginTop: spacing.lg, marginBottom: spacing.lg },
  greeting: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  childRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  childChipActive: { borderColor: colors.primary },
  childName: { ...typography.bodyMedium, color: colors.textPrimary },
  childAge: { ...typography.small, color: colors.textSecondary },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.input,
  },
  upgradeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeText: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  card: { marginTop: spacing.xs },
  stageHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stageIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTitles: { flex: 1 },
  stageName: { ...typography.bodyMedium, color: colors.textPrimary },
  stageRange: { ...typography.small, color: colors.textMuted },
  needsTitle: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
  needsText: {
    ...typography.caption,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    lineHeight: 24,
  },
  preterm: {
    ...typography.small,
    color: colors.primaryDeep,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  addChildCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.danger,
    padding: spacing.lg,
    marginTop: spacing.xs,
  },
  addChildIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addChildBody: { flex: 1 },
  addChildTitle: { ...typography.caption, color: colors.danger, fontWeight: '600' },
  addChildAction: { ...typography.small, color: colors.danger, marginTop: 2 },
  newsTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  newsCard: { marginBottom: spacing.sm },
  newsDate: { ...typography.small, color: colors.textMuted },
  newsHeading: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  newsBody: { ...typography.small, color: colors.textSecondary, lineHeight: 20 },
  newsVideo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  newsVideoText: { ...typography.small, color: colors.primaryDeep, fontWeight: '600' },
});