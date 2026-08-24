import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SkyBackground } from '@/components/SkyBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { goBack } from '@/navigation/goBack';
import { api, ApiError } from '@/api/client';
import { colors, radius, spacing, typography } from '@/theme';

interface ChecklistItem {
  key: string;
  label: string;
  hint?: string;
  done: boolean;
}

interface Guide {
  slug: string;
  title: string;
  intro: string;
  cards: { key: string; title: string; meta?: string; body: string }[];
  checklist?: { key: string; title: string; items: ChecklistItem[] }[];
  vaccines?: { key: string; name: string; note: string }[];
  childName: string | null;
  videos: { slug: string; name: string; count: number } | null;
  disclaimer: string;
}

/**
 * ხუთივე გზამკვლევს ერთი ეკრანი ემსახურება — განსხვავება შიგთავსშია,
 * რომელიც სერვერიდან მოდის. მისამართის ფაილი მხოლოდ slug-ს გადმოსცემს.
 */
export default function GuideScreen({
  slug,
  accent,
  icon,
}: {
  slug: string;
  accent: string;
  icon: IconName;
}) {
  const tone = accent;

  const [guide, setGuide] = useState<Guide | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Guide>(`/guides/${slug}`);
      setGuide(data);
      setChecked(
        new Set(
          (data.checklist ?? []).flatMap((g) => g.items.filter((i) => i.done).map((i) => i.key)),
        ),
      );
      setLocked(false);
    } catch (error) {
      // 403 = პაკეტი არ აქვს; დანარჩენი შეცდომა ცარიელ ეკრანად ჩანს
      setLocked(error instanceof ApiError && error.status === 403);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  /** მონიშვნა მაშინვე ჩანს; შეცდომისას უკან ბრუნდება. */
  const toggle = (key: string) => {
    const done = !checked.has(key);

    setChecked((prev) => {
      const next = new Set(prev);
      if (done) next.add(key);
      else next.delete(key);
      return next;
    });

    void api(`/guides/${slug}/checklist`, { method: 'PATCH', body: { itemKey: key, done } }).catch(
      () =>
        setChecked((prev) => {
          const next = new Set(prev);
          if (done) next.delete(key);
          else next.add(key);
          return next;
        }),
    );
  };

  if (loading) {
    return (
      <SkyBackground showDoves={false}>
        <ScreenHeader title="" onBack={goBack} />
        <ActivityIndicator color={tone} style={styles.loader} />
      </SkyBackground>
    );
  }

  if (locked) {
    return (
      <SkyBackground showDoves={false}>
        <ScreenHeader title="გზამკვლევი" onBack={goBack} />

        <View style={styles.lockedWrap}>
          <AuthCard style={styles.card}>
            <Icon name={icon} size={40} color={tone} strokeWidth={1.9} />
            <Text style={styles.lockedTitle}>ეს განყოფილება პრემიუმ პაკეტშია</Text>
            <Text style={styles.body}>
              ახალშობილი, კვება, ძილი და მოგზაურობა — ოთხივე გზამკვლევი პრემიუმს მოყვება.
            </Text>
            <Button title="პაკეტების ნახვა" onPress={() => router.push('/plans')} />
          </AuthCard>
        </View>
      </SkyBackground>
    );
  }

  if (!guide) {
    return (
      <SkyBackground showDoves={false}>
        <ScreenHeader title="გზამკვლევი" onBack={goBack} />
        <View style={styles.lockedWrap}>
          <AuthCard style={styles.card}>
            <Text style={styles.body}>ვერ ჩაიტვირთა — სცადეთ ცოტა ხანში.</Text>
            <Button title="ხელახლა" onPress={() => void load()} />
          </AuthCard>
        </View>
      </SkyBackground>
    );
  }

  const total = (guide.checklist ?? []).reduce((sum, group) => sum + group.items.length, 0);

  return (
    <SkyBackground showDoves={false}>
      <ScreenHeader title={guide.title} onBack={goBack} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{guide.intro}</Text>

        {!!guide.checklist && (
          <AuthCard style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>
                ჩეკლისტი{guide.childName ? ` — ${guide.childName}` : ''}
              </Text>
              <Text style={[styles.progress, { color: tone }]}>
                {checked.size} / {total}
              </Text>
            </View>

            {guide.checklist.map((group) => (
              <View key={group.key} style={styles.group}>
                <Text style={styles.groupTitle}>{group.title}</Text>

                {group.items.map((item) => {
                  const done = checked.has(item.key);

                  return (
                    <Pressable
                      key={item.key}
                      style={styles.item}
                      onPress={() => toggle(item.key)}
                    >
                      <View
                        style={[
                          styles.box,
                          done && { backgroundColor: tone, borderColor: tone },
                        ]}
                      >
                        {done && <Icon name="check" size={13} color="#ffffff" strokeWidth={2.6} />}
                      </View>

                      <View style={styles.itemText}>
                        <Text style={[styles.itemLabel, done && styles.itemDone]}>
                          {item.label}
                        </Text>
                        {!!item.hint && <Text style={styles.hint}>{item.hint}</Text>}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </AuthCard>
        )}

        {guide.cards.map((card) => (
          <AuthCard key={card.key} style={styles.card}>
            <Text style={[styles.cardTitle, { color: tone }]}>{card.title}</Text>
            {!!card.meta && <Text style={styles.meta}>{card.meta}</Text>}
            <Text style={styles.body}>{card.body}</Text>
          </AuthCard>
        ))}

        {!!guide.vaccines?.length && (
          <AuthCard style={styles.card}>
            <Text style={styles.sectionTitle}>სამოგზაურო აცრები</Text>
            <Text style={styles.meta}>
              მიმართულებაზეა დამოკიდებული და ეროვნულ კალენდარში არ შედის. დაგეგმეთ
              გამგზავრებამდე მინიმუმ ერთი თვით ადრე.
            </Text>

            {guide.vaccines.map((vaccine) => (
              <View key={vaccine.key} style={styles.vaccine}>
                <Text style={styles.itemLabel}>{vaccine.name}</Text>
                <Text style={styles.hint}>{vaccine.note}</Text>
              </View>
            ))}
          </AuthCard>
        )}

        {!!guide.videos && (
          <Pressable onPress={() => router.push('/videos')}>
            <AuthCard style={styles.videoCard}>
              <Icon name="play" size={22} color={tone} strokeWidth={1.9} />
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>ვიდეოები ამ თემაზე</Text>
                <Text style={styles.hint}>{guide.videos.count} ვიდეო</Text>
              </View>
            </AuthCard>
          </Pressable>
        )}

        <Text style={styles.disclaimer}>{guide.disclaimer}</Text>
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: spacing.xl },
  content: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xl },
  lockedWrap: { padding: spacing.xl },

  card: { gap: spacing.xs },
  videoCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  intro: { ...typography.small, color: colors.textSecondary, lineHeight: 20 },
  lockedTitle: { ...typography.bodyMedium, color: colors.textPrimary },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  progress: { ...typography.bodyMedium, fontWeight: '700' },

  group: { gap: 6, marginTop: spacing.xs },
  groupTitle: { ...typography.small, fontSize: 11, color: colors.textSecondary },

  item: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingVertical: 4 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.6,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  itemText: { flex: 1, gap: 2 },
  itemLabel: { ...typography.small, color: colors.textPrimary, lineHeight: 19 },
  itemDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  hint: { ...typography.small, fontSize: 11, color: colors.textSecondary, lineHeight: 16 },

  cardTitle: { ...typography.bodyMedium },
  meta: { ...typography.small, fontSize: 11, color: colors.textSecondary },
  body: { ...typography.small, color: colors.textPrimary, lineHeight: 21 },

  vaccine: {
    gap: 2,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  disclaimer: {
    ...typography.small,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
  },
});
