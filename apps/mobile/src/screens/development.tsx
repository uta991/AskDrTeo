import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ANSWER_LABELS,
  DOMAIN_LABELS,
  DOMAIN_ORDER,
  STATUS_LABELS,
  type AssessmentResult,
  type MilestoneAnswer,
} from '@askdrteo/milestones';
import { SkyBackground } from '@/components/SkyBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing, typography } from '@/theme';
import { NumberPad } from '@/components/NumberPad';
import { useActiveChild } from '@/features/children/children.store';
import { useMilestones } from '@/features/milestones/milestones.store';

const ANSWERS: MilestoneAnswer[] = ['YES', 'SOMETIMES', 'NOT_YET', 'UNKNOWN'];

const STATUS_COLOR: Record<string, string> = {
  ON_TRACK: colors.success,
  WATCH: colors.primaryDark,
  DISCUSS: colors.danger,
};

/**
 * განვითარების მონიტორინგი.
 *
 * ⚠️ არ არის დიაგნოსტიკური ტესტი — მშობლის დაკვირვებას აჯამებს და
 * ეუბნება, ღირს თუ არა ექიმთან საუბარი. გამოთვლა საერთო პაკეტშია,
 * ანუ ვებთან იდენტურია.
 */
export function DevelopmentTab() {
  const activeChild = useActiveChild();
  const { questions, loading, load, submit } = useMilestones();

  const [answers, setAnswers] = useState<Record<string, MilestoneAnswer>>({});

  // ასაკს მშობელი უთითებს — პროფილის თარიღიდან განზრახ არ ვიღებთ
  const [years, setYears] = useState('');
  const [months, setMonths] = useState('');
  const [editing, setEditing] = useState<'years' | 'months' | null>(null);
  const [started, setStarted] = useState(false);
  const [ageError, setAgeError] = useState<string | null>(null);

  const ageMonths = (Number(years) || 0) * 12 + (Number(months) || 0);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setAgeError(null);

    if (!years && !months) {
      setAgeError('მიუთითეთ ბავშვის ასაკი');
      return;
    }
    if (ageMonths > 72) {
      setAgeError('კითხვარი 6 წლამდე ასაკზეა გათვლილი.');
      return;
    }

    setAnswers({});
    setResult(null);
    setStarted(true);
    void load(ageMonths).catch(() => undefined);
  };

  const answered = useMemo(() => Object.keys(answers).length, [answers]);

  const handleSubmit = async () => {
    if (!activeChild) return;

    setError(null);
    setBusy(true);
    try {
      setResult(await submit(activeChild.id, ageMonths, answers));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'შენახვა ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setAnswers({});
    setStarted(false);
  };

  return (
    <SkyBackground showDoves={false}>
      <ScreenHeader title="განვითარების მონიტორინგი" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {!activeChild && (
          <AuthCard style={styles.card}>
            <Text style={styles.empty}>
              კითხვები ასაკზეა შერჩეული — ჯერ დაამატეთ ბავშვის პროფილი.
            </Text>
          </AuthCard>
        )}

        {!!activeChild && !result && !started && (
          <AuthCard style={styles.card}>
            <Text style={styles.subtitle}>
              მიუთითეთ ბავშვის ასაკი — კითხვები სწორედ ამის მიხედვით შეირჩევა.
            </Text>

            <View style={styles.ageRow}>
              <Pressable style={styles.ageField} onPress={() => setEditing('years')}>
                <Text style={styles.ageLabel}>წელი</Text>
                <Text style={[styles.ageValue, !years && styles.agePlaceholder]}>
                  {years || '—'}
                </Text>
              </Pressable>

              <Pressable style={styles.ageField} onPress={() => setEditing('months')}>
                <Text style={styles.ageLabel}>თვე</Text>
                <Text style={[styles.ageValue, !months && styles.agePlaceholder]}>
                  {months || '—'}
                </Text>
              </Pressable>
            </View>

            {!!ageError && <Text style={styles.error}>{ageError}</Text>}

            <Button title="კითხვარის დაწყება" onPress={start} />
          </AuthCard>
        )}

        {!!activeChild && !result && started && (
          <>
            <Text style={styles.subtitle}>
              {activeChild.firstName} — {ageText(ageMonths)}.{' '}
              <Text style={styles.changeAge} onPress={() => setStarted(false)}>
                ასაკის შეცვლა
              </Text>
            </Text>

            {loading && !questions.length && <ActivityIndicator color={colors.primary} />}

            {DOMAIN_ORDER.map((domain) => {
              const items = questions.filter((q) => q.domain === domain);
              if (!items.length) return null;

              return (
                <AuthCard key={domain} style={styles.card}>
                  <Text style={styles.domainTitle}>{DOMAIN_LABELS[domain]}</Text>

                  {items.map((question) => (
                    <View key={question.id} style={styles.question}>
                      <Text style={styles.questionText}>{question.questionKa}</Text>

                      <View style={styles.options}>
                        {ANSWERS.map((answer) => {
                          const active = answers[question.id] === answer;
                          return (
                            <Pressable
                              key={answer}
                              onPress={() =>
                                setAnswers((prev) => ({ ...prev, [question.id]: answer }))
                              }
                              style={[styles.option, active && styles.optionActive]}
                            >
                              <Text
                                style={[styles.optionText, active && styles.optionTextActive]}
                              >
                                {ANSWER_LABELS[answer]}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </AuthCard>
              );
            })}

            {!!error && <Text style={styles.error}>{error}</Text>}

            {!!questions.length && (
              <Button
                title={`შედეგის ნახვა (${answered}/${questions.length})`}
                onPress={handleSubmit}
                loading={busy}
                disabled={!answered}
              />
            )}
          </>
        )}

        {!!result && (
          <AuthCard style={styles.card}>
            <Text style={[styles.headline, result.hasRedFlag && styles.headlineAlert]}>
              {result.headline}
            </Text>
            <Text style={styles.advice}>{result.advice}</Text>

            {result.domains.map((domain) => (
              <View key={domain.domain} style={styles.domainResult}>
                <Text style={styles.domainName}>{DOMAIN_LABELS[domain.domain]}</Text>

                <View style={styles.bar}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.round(domain.ratio * 100)}%`,
                        backgroundColor: STATUS_COLOR[domain.status],
                      },
                    ]}
                  />
                </View>

                <View style={styles.domainMeta}>
                  <Text style={styles.metaText}>{STATUS_LABELS[domain.status]}</Text>
                  <Text style={styles.metaText}>
                    {domain.achieved} / {domain.total}
                  </Text>
                </View>

                {domain.redFlags.map((flag) => (
                  <Text key={flag} style={styles.redFlag}>
                    {flag}
                  </Text>
                ))}
              </View>
            ))}

            <Text style={styles.disclaimer}>
              ეს განვითარების მონიტორინგია და არა დიაგნოსტიკური ტესტი. დიაგნოზს
              მხოლოდ პედიატრი სვამს.
            </Text>

            <Button title="თავიდან შევსება" variant="outline" onPress={reset} />
          </AuthCard>
        )}
      </ScrollView>

      <NumberPad
        visible={editing !== null}
        label={editing === 'years' ? 'ასაკი — წელი' : 'ასაკი — თვე'}
        value={editing === 'years' ? years : months}
        onChange={(next) => (editing === 'years' ? setYears(next) : setMonths(next))}
        onClose={() => setEditing(null)}
      />
    </SkyBackground>
  );
}

/** ასაკის წარწერა — 26 თვე „2 წელი 2 თვედ" იკითხება. */
function ageText(months: number): string {
  if (months < 12) return `${months} თვე`;
  const y = Math.floor(months / 12);
  const r = months % 12;
  return r === 0 ? `${y} წელი` : `${y} წელი ${r} თვე`;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 19,
  },
  card: { marginBottom: spacing.sm },
  empty: { ...typography.small, color: colors.textSecondary },
  domainTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  question: { paddingVertical: spacing.sm },
  questionText: { ...typography.small, color: colors.textPrimary, lineHeight: 19 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  option: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { ...typography.small, color: colors.textSecondary },
  optionTextActive: { color: colors.textOnPrimary, fontWeight: '700' },
  headline: { ...typography.h3, color: colors.textPrimary },
  headlineAlert: { color: colors.danger },
  advice: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 19,
    marginVertical: spacing.sm,
  },
  domainResult: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  domainName: { ...typography.small, color: colors.textPrimary, fontWeight: '600' },
  bar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: 6,
  },
  barFill: { height: '100%', borderRadius: 4 },
  domainMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metaText: { ...typography.small, fontSize: 11, color: colors.textSecondary },
  redFlag: {
    ...typography.small,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  disclaimer: {
    ...typography.small,
    fontSize: 11,
    color: colors.textMuted,
    marginVertical: spacing.md,
    lineHeight: 16,
  },
  error: { ...typography.small, color: colors.danger, marginBottom: spacing.sm },
  ageRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  ageField: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ageLabel: { ...typography.small, fontSize: 11, color: colors.textMuted },
  ageValue: { ...typography.h3, color: colors.textPrimary },
  agePlaceholder: { color: colors.textMuted },
  changeAge: { color: colors.primaryDeep, fontWeight: '700' },
});