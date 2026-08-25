import React, { useEffect } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/ui/Icon';
import { FeatureTiles, type Tile } from '@/components/FeatureTiles';
import { useTabs } from '@/features/tabs';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useT } from '@/i18n';
import { useAuth } from '@/features/auth/auth.store';
import { useActiveChild, useChildren } from '@/features/children/children.store';
import { useEntitlements, useIsFreePlan } from '@/features/entitlements/entitlements.store';
import { useGrowth } from '@/features/growth/growth.store';
import { useNotifications } from '@/features/notifications/notifications.store';
import { useNews } from '@/features/news/news.store';
import { NewsVideo } from '@/components/NewsVideo';

export function HomeTab() {
  const insets = useSafeAreaInsets();
  const t = useT();

  const user = useAuth((s) => s.user);
  const { children, load: loadChildren } = useChildren();
  const activeChild = useActiveChild();
  const loadEntitlements = useEntitlements((s) => s.load);
  const isFree = useIsFreePlan();
  const goToTab = useTabs((state) => state.goTo);
  const { posts: news, load: loadNews } = useNews();

  const isStaff = !!user && user.role !== 'PARENT';
  // კალკულატორი ფასიან პაკეტშია; პერსონალს გამოწერა არ სჭირდება
  const canUseCalculator = useEntitlements((state) => state.can('dose_calculator')) || isStaff;
  const canUseAssistant = useEntitlements((state) => state.can('ai_assistant')) || isStaff;

  // ბოლო აწონვა თავსართში — მშობელი ყველაზე ხშირად ამას ეძებს
  const growthPoints = useGrowth((state) => state.points);
  const loadGrowth = useGrowth((state) => state.load);

  const latestWeight = [...growthPoints].reverse().find((point) => point.weightKg !== null)
    ?.weightKg;

  // ბავშვის პროფილის გარეშე ასაკობრივი კონტენტი ვერ შეირჩევა — პროფილს ნიშანი ადევს
  const needsChildProfile = !isStaff && children.length === 0;

  const unread = useNotifications((state) => state.unread);
  const loadNotifications = useNotifications((state) => state.load);

  useEffect(() => {
    if (!user) return;
    void loadEntitlements().catch(() => undefined);
    void loadNews().catch(() => undefined);
    // პერსონალს ბავშვის პროფილები არ აქვს — ზედმეტ მოთხოვნას არ ვაგზავნით
    if (!isStaff) void loadChildren().catch(() => undefined);
    void loadNotifications().catch(() => undefined);
  }, [user, isStaff, loadChildren, loadEntitlements, loadNews, loadNotifications]);

  useEffect(() => {
    if (activeChild) void loadGrowth(activeChild.id).catch(() => undefined);
  }, [activeChild, loadGrowth]);

  return (
    <SkyBackground showDoves={false}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── თავსართი: ლოგო და ზარი ───────────────────────── */}
        <View style={styles.topBar}>
          <Logo size={60} />

          <Pressable style={styles.bell} onPress={() => router.push('/notifications')}>
            <Icon name="bell" size={22} color={colors.textPrimary} strokeWidth={1.8} />
            {unread > 0 && <View style={styles.bellDot} />}
          </Pressable>
        </View>

        {/* ── მისალმება ─────────────────────────────────────── */}
        <Text style={styles.greeting}>
          {isStaff
            ? t('home', 'adminPanel')
            : `გამარჯობა, ${user?.firstName ?? ''}!`}
        </Text>
        <Text style={styles.greetingMeta}>
          {isStaff
            ? t('roles', user.role as 'ADMIN') || user.role
            : activeChild
              ? `👶 ${activeChild.firstName} • ${activeChild.ageLabel}${latestWeight ? ` • ${latestWeight} კგ` : ''}`
              : t('home', 'noChild')}
        </Text>

        {/* ── ფუნქციების ბადე ───────────────────────────────── */}
        {!isStaff && (
          <View style={styles.grid}>
            {[
              {
                key: 'emergency',
                icon: 'sos' as const,
                color: '#E5484D',
                label: 'SOS',
                onPress: () => router.push('/emergency'),
              },
              {
                key: 'newborn',
                icon: 'baby' as const,
                color: '#E86A9B',
                label: 'ახალშობილი',
                onPress: () => router.push('/newborn'),
              },
              {
                key: 'symptoms',
                icon: 'thermometer' as const,
                color: '#E5484D',
                label: 'სიმპტომები',
                onPress: () => router.push('/assistant'),
              },
              {
                key: 'development',
                icon: 'head' as const,
                color: '#2F6FED',
                label: 'განვითარება',
                onPress: () => goToTab('development'),
              },
              {
                key: 'growth',
                icon: 'chart' as const,
                color: '#2E9E5B',
                label: 'ზრდის დღიური',
                onPress: () => router.push('/growth'),
              },
              {
                key: 'vaccination',
                icon: 'syringe' as const,
                color: '#E5484D',
                label: 'ვაქცინაცია',
                onPress: () => router.push('/vaccinations'),
              },
              {
                key: 'calculator',
                icon: 'syrup' as const,
                color: '#0EA5A5',
                label: 'კალკულატორი',
                onPress: () => (canUseCalculator ? goToTab('calculator') : router.push('/plans')),
              },
              {
                key: 'assistant',
                icon: 'robot' as const,
                color: '#7C5CFF',
                label: 'AI ასისტენტი',
                onPress: () => router.push(canUseAssistant ? '/assistant' : '/plans'),
              },
              {
                key: 'chat',
                icon: 'chat' as const,
                color: '#2F6FED',
                label: 'ჩატი',
                onPress: () => router.push('/chat'),
              },
              {
                key: 'videos',
                icon: 'play' as const,
                color: '#E8A400',
                label: 'ვიდეოთეკა',
                onPress: () => router.push('/videos'),
              },
              {
                key: 'nutrition',
                icon: 'nutrition' as const,
                color: '#57A63A',
                label: 'კვება',
                onPress: () => router.push('/nutrition'),
              },
              {
                key: 'sleep',
                icon: 'sleep' as const,
                color: '#5B67CA',
                label: 'ძილი',
                onPress: () => router.push('/sleep'),
              },
              {
                key: 'travel',
                icon: 'traveler' as const,
                color: '#00A3C4',
                label: 'პატარა მოგზაური',
                onPress: () => router.push('/travel'),
              },
            ].map((item) => (
              <Pressable key={item.key} style={styles.gridItem} onPress={item.onPress}>
                <Icon name={item.icon} size={28} color={item.color} strokeWidth={1.9} />
                <Text style={styles.gridLabel} numberOfLines={2}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── შემდეგი ვიზიტი ────────────────────────────────── */}
        {!isStaff && (
          <Pressable style={styles.nextVisit} onPress={() => router.push('/video-visit')}>
            <View style={styles.nextVisitIcon}>
              <Icon name="consultation" size={30} color="#6FB6D9" strokeWidth={1.9} />
            </View>

            <View style={styles.nextVisitText}>
              <Text style={styles.nextVisitTitle}>პედიატრთან ონლაინ კონსულტაცია</Text>
              <Text style={styles.nextVisitMeta}>მიიღე ექიმის პერსონალური შეფასება სახლიდან გაუსვლელად</Text>
            </View>

            <View style={styles.nextVisitCta}>
              <Icon name="calendar" size={24} color="#6FB6D9" strokeWidth={1.9} />
              <Text style={styles.nextVisitCtaText}>დაჯავშნე ვიზიტი</Text>
              <Icon name="arrow-right" size={16} color="#6FB6D9" strokeWidth={1.9} />
            </View>
          </Pressable>
        )}

        {/* ── პერსონალის ფილები ─────────────────────────────── */}
        {isStaff && (
          <FeatureTiles
            tiles={[
              {
                key: 'development',
                label: t('tabs', 'development'),
                icon: 'leaf',
                onPress: () => goToTab('development'),
              },
              {
                key: 'calculator',
                label: t('tabs', 'calculator'),
                icon: 'calculator',
                onPress: () => goToTab('calculator'),
              },
              {
                key: 'chat',
                label: 'ჩატი',
                icon: 'chat',
                onPress: () => router.push('/chat'),
              },
              {
                key: 'profile',
                label: t('tabs', 'profile'),
                icon: 'user',
                onPress: () => goToTab('profile'),
              },
            ] satisfies Tile[]}
          />
        )}

        {/* ── ბავშვის პროფილის გარეშე ასაკობრივი კონტენტი ვერ შეირჩევა ── */}
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

        {/* ── პერსონალის ფილები ─────────────────────────────── */}
        {isStaff && (
          <FeatureTiles
            tiles={[
              {
                key: 'development',
                label: t('tabs', 'development'),
                icon: 'leaf',
                onPress: () => goToTab('development'),
              },
              {
                key: 'calculator',
                label: t('tabs', 'calculator'),
                icon: 'calculator',
                onPress: () => goToTab('calculator'),
              },
              {
                key: 'chat',
                label: 'ჩატი',
                icon: 'chat',
                onPress: () => router.push('/chat'),
              },
              {
                key: 'profile',
                label: t('tabs', 'profile'),
                icon: 'user',
                onPress: () => goToTab('profile'),
              },
            ] satisfies Tile[]}
          />
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

                {/* ვიდეო თავისივე სიახლის ქვემოთ — ცალკე გადასვლა არ სჭირდება */}
                {!!post.video?.embedUrl && (
                  <NewsVideo
                    url={post.video.embedUrl}
                    label={post.video.title ?? t('home', 'newsVideo')}
                  />
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

  // ── თავსართი ────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  greeting: { ...typography.h1, color: colors.textPrimary },
  greetingMeta: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.lg,
  },

  // ── ფუნქციების ბადე ─────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  gridItem: {
    // სამი სვეტი — ღრეჩოს გამოკლებით
    width: '31.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: 6,
    ...shadows.card,
  },
  gridLabel: {
    ...typography.small,
    fontSize: 11.5,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── შემდეგი ვიზიტი ──────────────────────────────────────
  // საიტის ზოლის იგივე ხასიათი: თხელი ღია კანტი და რბილი ჩრდილი
  nextVisit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  // ფონის გარეშე — მხოლოდ სტეტოსკოპი, ისევე როგორც საიტზე
  nextVisitIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextVisitCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: spacing.xs,
    paddingLeft: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: '#EDEDED',
  },
  nextVisitCtaText: { ...typography.small, fontSize: 13.5, fontWeight: '600', color: '#6FB6D9' },
  nextVisitText: { flex: 1, gap: 2 },
  nextVisitTitle: { ...typography.bodyMedium, color: colors.textPrimary, fontWeight: '700' },
  nextVisitMeta: { ...typography.small, fontSize: 12, color: colors.textSecondary },
  topText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topTextCol: { flex: 1, minWidth: 0 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceMuted },
  childName: { ...typography.bodyMedium, color: colors.textOnCard, fontWeight: '700' },
  childMeta: { ...typography.small, fontSize: 12, color: colors.textSecondary },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },

  // ── ბანერი ──────────────────────────────────────────────
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  heroText: { flex: 1, gap: 4 },
  heroTitle: { ...typography.h2, color: colors.textOnPrimary, fontWeight: '800' },
  heroSubtitle: { ...typography.small, color: colors.textOnPrimary },
  heroCta: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginTop: spacing.md,
  },
  heroCtaText: { ...typography.small, color: colors.textPrimary, fontWeight: '700' },

  // ── ოთხი ბარათი ─────────────────────────────────────────
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    width: '48%',
    // ფიქსირებული სიმაღლე — თორემ გრძელი წარწერა ბარათს წელავს და
    // მეზობელი ბარათი მასზე გადადის
    minHeight: 186,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.card,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: { ...typography.bodyMedium, color: colors.textOnCard, fontWeight: '700' },
  cardText: { ...typography.small, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  cardArrow: {
    alignSelf: 'flex-end',
    marginTop: 'auto',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  bell: {
    alignSelf: 'flex-end',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  bellBadgeText: { color: colors.surface, fontSize: 10, fontWeight: '700' },
  freeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
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
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeText: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  stageHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stageIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
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
    backgroundColor: colors.surfaceMuted,
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
});