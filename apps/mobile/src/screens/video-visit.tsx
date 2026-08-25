import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SkyBackground } from '@/components/SkyBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { goBack } from '@/navigation/goBack';
import { colors, radius, spacing, typography } from '@/theme';
import { useActiveChild } from '@/features/children/children.store';
import {
  cancelMyVisit,
  useVideoVisits,
  visitPresence,
  type MyVisit,
  type VisitStatus,
} from '@/features/video-visits/video-visits.store';

const STATUS_LABELS: Record<VisitStatus, string> = {
  REQUESTED: 'საათი ჯერ არ არის დანიშნული',
  SCHEDULED: 'დანიშნულია',
  LIVE: 'მიმდინარეობს',
  DONE: 'დასრულდა',
  CANCELED: 'გაუქმდა',
  NO_SHOW: 'დააგვიანეთ — ჩაეწერეთ ხელახლა',
};

const WEEKDAYS = ['კვ', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];

/** დრო საქართველოს დროით — სერვერი UTC-ში აბრუნებს. */
function tbilisi(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tbilisi',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('day')}.${get('month')} · ${get('hour')}:${get('minute')}`;
}

export default function VideoVisitScreen() {
  const activeChild = useActiveChild();
  const { offer, items, loading, error, notice, load, book, join } = useVideoVisits();

  const [selected, setSelected] = useState<string | null>(null);
  const [doctorIn, setDoctorIn] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!offer || selected) return;
    setSelected(offer.days.find((day) => day.free > 0)?.date ?? null);
  }, [offer, selected]);

  // ექიმის ჩართვა მშობელმა ღილაკზე დაწოლამდე უნდა დაინახოს
  const joinable = items.filter((visit) => visit.canJoin).map((visit) => visit.id);
  const key = joinable.join(',');

  useEffect(() => {
    if (!key) return;

    const tick = async () => {
      const pairs = await Promise.all(
        key.split(',').map(async (id) => {
          const presence = await visitPresence(id).catch(() => null);
          return [id, !!presence?.staffPresent] as const;
        }),
      );
      setDoctorIn(Object.fromEntries(pairs));
    };

    void tick();
    const timer = setInterval(() => void tick(), 8000);
    return () => clearInterval(timer);
  }, [key]);

  const drop = async (visit: MyVisit) => {
    setBusy(true);
    try {
      await cancelMyVisit(visit.id);
      await load();
    } catch {
      // შეცდომა სიაშივე გამოჩნდება — მდგომარეობა store-ში იწერება
    } finally {
      setBusy(false);
    }
  };

  const enter = async (visit: MyVisit) => {
    setBusy(true);
    const access = await join(visit.id);
    setBusy(false);

    if (access) router.push(`/video-visit/${visit.id}`);
  };

  return (
    <SkyBackground showDoves={false}>
      <ScreenHeader title="ვიზიტი პედიატრთან" onBack={goBack} tone="blue" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ახსნა თავშივე — მშობელს ჯერ უნდა ესმოდეს, რას ჯავშნის */}
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Icon name="consultation" size={34} color="#6FB6D9" strokeWidth={1.9} />
          </View>
          <Text style={styles.introTitle}>ონლაინ შეხვედრა ექიმთან</Text>
          <Text style={styles.introText}>ვიდეო, ხმა და ჩატი ერთ ოთახში.</Text>
        </View>

        {loading && !offer && <ActivityIndicator color={colors.skyBlue} />}

        {items.length > 0 && (
          <AuthCard style={styles.card}>
            <Text style={styles.cardTitle}>ჩემი ვიზიტები</Text>

            {items.map((visit) => (
              <View key={visit.id} style={styles.visitRow}>
                <View style={styles.visitHead}>
                  <Text style={styles.visitDate}>
                    {visit.scheduledAt ? tbilisi(visit.scheduledAt) : visit.date}
                  </Text>
                  {!!visit.child && (
                    <Text style={styles.visitChild}>{visit.child.firstName}</Text>
                  )}
                </View>

                <Text style={styles.visitMeta}>{STATUS_LABELS[visit.status]}</Text>

                {doctorIn[visit.id] && (
                  <View style={styles.doctorIn}>
                    <View style={styles.doctorDot} />
                    <Text style={styles.doctorInText}>ექიმი კავშირზეა</Text>
                  </View>
                )}

                {/* ღილაკი მთელ სიგანეზე — ვიწრო ეკრანზე გვერდით
                    ჩამატება წარწერას ორ სტრიქონად ტეხდა */}
                {visit.canJoin ? (
                  <Pressable
                    style={styles.joinButton}
                    disabled={busy}
                    onPress={() => void enter(visit)}
                  >
                    <Icon name="consultation" size={18} color="#ffffff" strokeWidth={1.9} />
                    <Text style={styles.joinText}>ონლაინ ჩართვა</Text>
                  </Pressable>
                ) : visit.status === 'REQUESTED' || visit.status === 'SCHEDULED' ? (
                  <Pressable
                    style={styles.cancelButton}
                    disabled={busy}
                    onPress={() => void drop(visit)}
                  >
                    <Text style={styles.cancelLink}>ჯავშნის გაუქმება</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </AuthCard>
        )}

        <AuthCard style={styles.card}>
          <Text style={styles.cardTitle}>აირჩიეთ დღე</Text>
          <Text style={styles.hint}>
            ზუსტ საათს ექიმი დანიშნავს და SMS-ით შეგატყობინებთ — ჩართვისთვის
            5 წუთით ადრე მზად იყავით.
          </Text>

          {offer?.freeCredits ? (
            <Text style={styles.freeNote}>
              თქვენ გაქვთ {offer.freeCredits} უფასო ვიზიტი
            </Text>
          ) : offer && offer.coverPercent > 0 ? (
            <Text style={styles.discountNote}>
              წინა ვიზიტზე დაგვიანების გამო იხდით ღირებულების მხოლოდ{' '}
              {100 - offer.coverPercent}%-ს — {offer.price} ({offer.basePrice}-ის ნაცვლად)
            </Text>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.days}
          >
            {(offer?.days ?? []).slice(0, 14).map((day) => {
              const date = new Date(`${day.date}T00:00:00`);
              const full = day.free === 0;

              return (
                <Pressable
                  key={day.date}
                  disabled={full}
                  onPress={() => setSelected(day.date)}
                  style={[
                    styles.day,
                    selected === day.date && styles.dayActive,
                    full && styles.dayFull,
                  ]}
                >
                  <Text style={styles.dayWeek}>{WEEKDAYS[date.getDay()]}</Text>
                  <Text style={styles.dayNumber}>{date.getDate()}</Text>
                  <Text style={styles.dayFree}>{full ? 'სავსეა' : `${day.free} ადგ.`}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!notice && <Text style={styles.notice}>{notice}</Text>}

          <Button
            title={offer?.freeCredits ? 'დაჯავშნა — 0 ₾' : `დაჯავშნა — ${offer?.price ?? ''}`}
            tone="blue"
            onPress={() =>
              selected && void book({ date: selected, childId: activeChild?.id })
            }
          />
        </AuthCard>
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xl },

  intro: { alignItems: 'center', gap: 6, paddingBottom: spacing.xs },
  introIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.skyBlueSoft,
  },
  introTitle: { ...typography.bodyMedium, fontSize: 17, color: colors.textPrimary },
  introText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  visitRow: {
    gap: 5,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  visitHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  visitChild: {
    ...typography.small,
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  doctorIn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  doctorDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2E9E5B' },
  doctorInText: { ...typography.small, fontSize: 12, color: '#2E9E5B', fontWeight: '600' },
  cancelButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  card: { gap: spacing.sm },

  cardTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  hint: { ...typography.small, color: colors.textSecondary, lineHeight: 19 },
  freeNote: { ...typography.small, color: '#2E9E5B', fontWeight: '600' },
  discountNote: {
    ...typography.small,
    color: colors.textPrimary,
    lineHeight: 19,
    backgroundColor: colors.primarySoft,
    padding: spacing.sm,
    borderRadius: radius.md,
  },

  days: { flexDirection: 'row', gap: spacing.xs, paddingVertical: 2 },
  day: {
    width: 58,
    alignItems: 'center',
    gap: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  dayActive: { borderColor: colors.skyBlue, backgroundColor: colors.skyBlueSoft },
  dayFull: { opacity: 0.4 },
  dayWeek: { ...typography.small, fontSize: 10, color: colors.textSecondary },
  dayNumber: { ...typography.bodyMedium, color: colors.textPrimary },
  dayFree: { ...typography.small, fontSize: 9.5, color: colors.textSecondary },

  visitDate: { ...typography.bodyMedium, fontSize: 15, color: colors.textPrimary },
  visitMeta: { ...typography.small, fontSize: 12, color: colors.textSecondary },
  visitWait: { ...typography.small, fontSize: 11, color: colors.textSecondary },
  cancelLink: { ...typography.small, fontSize: 12, color: colors.danger },

  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.skyBlueDeep,
    paddingVertical: 11,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  joinText: { ...typography.small, fontSize: 14, color: '#ffffff', fontWeight: '700' },

  error: { ...typography.small, color: colors.danger },
  notice: { ...typography.small, color: colors.skyBlueDeep },
});
