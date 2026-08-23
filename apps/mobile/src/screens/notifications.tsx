import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SkyBackground } from '@/components/SkyBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AuthCard } from '@/components/AuthCard';
import { goBack } from '@/navigation/goBack';
import { colors, radius, spacing, typography } from '@/theme';
import { useNotifications, type AppNotification } from '@/features/notifications/notifications.store';

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

  if (minutes < 1) return 'ახლახან';
  if (minutes < 60) return `${minutes} წთ წინ`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} სთ წინ`;

  return new Date(iso).toLocaleDateString('ka-GE');
}

/** სად გადავიდეს დაჭერისას — შეტყობინება კონტექსტს ატარებს. */
function targetFor(item: AppNotification): string | null {
  if (item.data?.conversationId) return '/chat';
  if (item.data?.appointmentId) return '/booking';
  if (item.data?.vaccinationHistory) return '/vaccinations?mode=history';
  if (item.data?.vaccinations) return '/vaccinations';
  return null;
}

export default function NotificationsScreen() {
  const { items, unread, load, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  return (
    <SkyBackground showDoves={false}>
      <ScreenHeader title="შეტყობინებები" onBack={goBack} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {unread > 0 && (
          <Pressable onPress={() => void markAllRead()}>
            <Text style={styles.readAll}>ყველას წაკითხვა</Text>
          </Pressable>
        )}

        {!items.length && <Text style={styles.empty}>ახალი შეტყობინება არ არის.</Text>}

        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              void markRead(item.id);
              const target = targetFor(item);
              if (target) router.push(target as '/chat');
            }}
          >
            <AuthCard style={[styles.card, !item.readAt && styles.cardUnread]}>
              <View style={styles.head}>
                {!item.readAt && <View style={styles.dot} />}
                <Text style={styles.title}>{item.title}</Text>
              </View>

              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </AuthCard>
          </Pressable>
        ))}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xl },
  readAll: { ...typography.small, color: colors.primaryText, fontWeight: '600', textAlign: 'right' },
  empty: { ...typography.small, color: colors.textSecondary, textAlign: 'center' },

  card: { gap: 3, padding: spacing.md },
  cardUnread: { borderWidth: 1.5, borderColor: colors.danger },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  title: { ...typography.small, color: colors.textPrimary, fontWeight: '700' },
  body: { ...typography.small, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  time: { ...typography.small, fontSize: 10, color: colors.textMuted },
});
