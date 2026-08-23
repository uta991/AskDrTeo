import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SkyBackground } from '@/components/SkyBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { goBack } from '@/navigation/goBack';
import { colors, radius, spacing, typography } from '@/theme';
import { useActiveChild } from '@/features/children/children.store';
import { useAppointments, type Appointment } from '@/features/appointments/appointments.store';

const STATUS_LABELS: Record<Appointment['status'], string> = {
  REQUESTED: 'განხილვაშია',
  CONFIRMED: 'დადასტურებულია',
  DECLINED: 'უარყოფილია',
  CANCELED: 'გაუქმებულია',
  DONE: 'შედგა',
};

/** უახლოესი დღეები — მშობელი კალენდარს კი არ ხსნის, დღეს ირჩევს. */
function nextDays(count: number): Date[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    date.setHours(10, 0, 0, 0);
    return date;
  });
}

const HOURS = [10, 11, 12, 14, 15, 16, 17];

const WEEKDAYS = ['კვ', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];

export default function BookingScreen() {
  const activeChild = useActiveChild();
  const { items, quota, loading, error, notice, load, request, cancel } = useAppointments();

  const [day, setDay] = useState<Date>(nextDays(1)[0]);
  const [hour, setHour] = useState(10);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  const pending = items.some((item) => item.status === 'REQUESTED');

  const submit = () => {
    const when = new Date(day);
    when.setHours(hour, 0, 0, 0);

    void request({
      preferredAt: when.toISOString(),
      childId: activeChild?.id,
    });
  };

  return (
    <SkyBackground showDoves={false}>
      <ScreenHeader title="ვიზიტი პედიატრთან" onBack={goBack} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AuthCard style={quota.remaining > 0 ? styles.quotaFree : styles.card}>
          {quota.limit > 0 ? (
            <>
              <Text style={styles.quotaTitle}>
                უფასო ვიზიტი ამ თვეში: {quota.remaining} / {quota.limit}
              </Text>
              <Text style={styles.quotaMeta}>
                {quota.remaining > 0
                  ? 'შემდეგი მოთხოვნა პაკეტის უფასო ვიზიტით გაიგზავნება.'
                  : 'თვის კვოტა ამოწურულია — ვიზიტი ჩვეულებრივი წესით ანაზღაურდება.'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.quotaTitle}>უფასო ვიზიტი პრემიუმ პაკეტშია</Text>
              <Text style={styles.quotaMeta}>
                თვეში ერთი ვიზიტი პედიატრ თეონა ტაბატაძესთან.
              </Text>
              <Pressable onPress={() => router.push('/plans')}>
                <Text style={styles.link}>პაკეტების ნახვა</Text>
              </Pressable>
            </>
          )}
        </AuthCard>

        {loading && !items.length && <ActivityIndicator color={colors.primary} />}

        {pending ? (
          <AuthCard style={styles.card}>
            <Text style={styles.quotaMeta}>
              თქვენი მოთხოვნა განხილვაშია — პასუხის შემდეგ ახლის გაგზავნა შესაძლებელი იქნება.
            </Text>
          </AuthCard>
        ) : (
          <AuthCard style={styles.card}>
            <Text style={styles.formTitle}>სასურველი დღე</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {nextDays(10).map((date) => {
                const selected = date.toDateString() === day.toDateString();

                return (
                  <Pressable
                    key={date.toISOString()}
                    onPress={() => setDay(date)}
                    style={[styles.dayChip, selected && styles.chipActive]}
                  >
                    <Text style={styles.dayWeek}>{WEEKDAYS[date.getDay()]}</Text>
                    <Text style={styles.dayNumber}>{date.getDate()}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.formTitle}>დრო</Text>

            <View style={styles.chips}>
              {HOURS.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setHour(value)}
                  style={[styles.hourChip, value === hour && styles.chipActive]}
                >
                  <Text style={styles.hourText}>{value}:00</Text>
                </Pressable>
              ))}
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}
            {!!notice && <Text style={styles.notice}>{notice}</Text>}

            <Button title="ვიზიტის მოთხოვნა" onPress={submit} />
          </AuthCard>
        )}

        {items.length > 0 && (
          <AuthCard style={styles.card}>
            <Text style={styles.formTitle}>ჩემი ჯავშნები</Text>

            {items.map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <View style={styles.historyMain}>
                  <Text style={styles.historyDate}>
                    {(item.scheduledAt ?? item.preferredAt).replace('T', ' ').slice(0, 16)}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {STATUS_LABELS[item.status]}
                    {item.usedFreeVisit && ' · უფასო'}
                  </Text>
                  {!!item.staffNote && <Text style={styles.historyNote}>{item.staffNote}</Text>}
                </View>

                {(item.status === 'REQUESTED' || item.status === 'CONFIRMED') && (
                  <Pressable onPress={() => void cancel(item.id)}>
                    <Text style={styles.cancel}>გაუქმება</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </AuthCard>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xl },
  card: { gap: spacing.sm },
  quotaFree: { gap: spacing.xs, borderWidth: 1.5, borderColor: colors.success },

  quotaTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  quotaMeta: { ...typography.small, color: colors.textSecondary, lineHeight: 19 },
  link: { ...typography.small, color: colors.primaryText, fontWeight: '600' },

  formTitle: { ...typography.small, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dayChip: {
    width: 52,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  dayWeek: { ...typography.small, fontSize: 10, color: colors.textSecondary },
  dayNumber: { ...typography.bodyMedium, color: colors.textPrimary },
  hourChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary },
  hourText: { ...typography.small, fontSize: 12, color: colors.textPrimary },

  error: { ...typography.small, color: colors.danger },
  notice: { ...typography.small, color: colors.primaryDeep },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyMain: { flex: 1, gap: 2 },
  historyDate: { ...typography.small, color: colors.textPrimary },
  historyMeta: { ...typography.small, fontSize: 11, color: colors.textSecondary },
  historyNote: { ...typography.small, fontSize: 11, color: colors.primaryDeep },
  cancel: { ...typography.small, fontSize: 12, color: colors.danger },
});
