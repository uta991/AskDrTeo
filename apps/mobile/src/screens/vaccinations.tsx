import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SkyBackground } from '@/components/SkyBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { goBack } from '@/navigation/goBack';
import { colors, radius, spacing, typography } from '@/theme';
import { useAuth } from '@/features/auth/auth.store';
import { useEntitlements } from '@/features/entitlements/entitlements.store';
import { useActiveChild } from '@/features/children/children.store';
import { useVaccinations, type VaccinationRow } from '@/features/vaccinations/vaccinations.store';

const STATUS_LABELS: Record<VaccinationRow['status'], string> = {
  DONE: 'გაკეთებულია',
  DUE: 'ვადა გავიდა',
  SOON: 'უახლოეს დღეებში',
  UPCOMING: 'მომავალში',
};

/** ასაკი წარწერად — 18 თვე „1 წელი 6 თვედ" უფრო იკითხება. */
function ageLabel(months: number): string {
  if (months === 0) return 'დაბადებისთანავე';
  if (months < 12) return `${months} თვე`;

  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} წელი` : `${years} წელი ${rest} თვე`;
}

export default function VaccinationsScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const historyMode = params.mode === 'history';

  const role = useAuth((state) => state.user?.role);
  const isStaff = !!role && role !== 'PARENT';
  const allowed = useEntitlements((state) => state.can('vaccination_calendar')) || isStaff;

  const activeChild = useActiveChild();
  const { rows, loading, error, missing, load, toggle, saveHistory, reset } = useVaccinations();

  // ისტორიის რეჟიმში მონიშვნა ჯერ ეკრანზეა და შენახვაზე ერთად იგზავნება
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    reset();
    if (allowed && activeChild) void load(activeChild.id, historyMode).catch(() => undefined);
  }, [allowed, activeChild, historyMode, load, reset]);

  useEffect(() => {
    setSelected(new Set(rows.filter((row) => row.doneAt).map((row) => row.vaccineId)));
  }, [rows]);

  if (!allowed) {
    return (
      <SkyBackground showDoves={false}>
        <ScreenHeader title="აცრების კალენდარი" onBack={goBack} />

        <View style={styles.locked}>
          <View style={styles.lockIcon}>
            <Icon name="lock" size={22} color={colors.primaryDeep} strokeWidth={2} />
          </View>

          <Text style={styles.lockedTitle}>ეს ფუნქცია ფასიან პაკეტშია</Text>
          <Text style={styles.lockedText}>
            ვადები ბავშვის დაბადების თარიღიდან ითვლება და შეხსენება სამი თვით ადრე მოდის.
          </Text>

          <Button title="პაკეტების ნახვა" onPress={() => router.push('/plans')} />
        </View>
      </SkyBackground>
    );
  }

  if (missing !== null) {
    return (
      <SkyBackground showDoves={false}>
        <ScreenHeader title="აცრების ისტორია" onBack={goBack} />

        <View style={styles.saved}>
          <Text style={styles.savedTitle}>
            {missing === 0 ? 'ყველა აცრა გაკეთებულია' : `დაგრჩენიათ ${missing} აცრა`}
          </Text>

          <Text style={styles.lockedText}>
            {missing === 0
              ? 'ამ ასაკის ყველა აცრა გაკეთებულია. მომდევნოზე სამი თვით ადრე შეგახსენებთ.'
              : 'დარჩენილი აცრების სია SMS-ითაც გამოგიგზავნეთ.'}
          </Text>

          <Button title="ვიზიტის დაჯავშნა" onPress={() => router.push('/video-visit')} />
          <Button
            title="კალენდარის ნახვა"
            variant="outline"
            onPress={() => router.replace('/vaccinations')}
          />
        </View>
      </SkyBackground>
    );
  }

  const done = rows.filter((row) => row.doneAt).length;

  return (
    <SkyBackground showDoves={false}>
      <ScreenHeader
        title={historyMode ? 'აცრების ისტორია' : 'აცრების კალენდარი'}
        subtitle={activeChild?.firstName}
        onBack={goBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && !rows.length && <ActivityIndicator color={colors.primary} />}

        {!activeChild && <Text style={styles.empty}>ჯერ დაამატეთ ბავშვის პროფილი.</Text>}

        {!!activeChild && (
          <Text style={styles.progress}>
            {historyMode
              ? 'მონიშნეთ, რომელი აცრები აქვს უკვე გაკეთებული — სიაში მხოლოდ მისი ასაკის აცრებია.'
              : `გაკეთებულია ${done} / ${rows.length}`}
          </Text>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        {rows.map((row) => {
          const checked = selected.has(row.vaccineId);

          return (
            <Pressable
              key={row.vaccineId}
              style={[styles.row, checked && styles.rowDone]}
              onPress={() => {
                const next = new Set(selected);
                if (checked) next.delete(row.vaccineId);
                else next.add(row.vaccineId);
                setSelected(next);

                // კალენდარში მონიშვნა მაშინვე ინახება; ისტორიაში — ღილაკზე
                if (!historyMode && activeChild) {
                  void toggle(activeChild.id, row.vaccineId, !checked);
                }
              }}
            >
              <View style={[styles.check, checked && styles.checkOn]}>
                {checked && <Text style={styles.checkMark}>✓</Text>}
              </View>

              <View style={styles.rowMain}>
                <Text style={styles.rowName}>{row.name}</Text>
                <Text style={styles.rowMeta}>
                  {ageLabel(row.ageMonths)} · {row.doneAt ? STATUS_LABELS.DONE : STATUS_LABELS[row.status]}
                </Text>
              </View>

              {row.status === 'DUE' && !row.doneAt && <View style={styles.dueDot} />}
            </Pressable>
          );
        })}

        {historyMode && rows.length > 0 && !!activeChild && (
          <Button
            title="შენახვა"
            onPress={() => void saveHistory(activeChild.id, [...selected])}
            style={styles.save}
          />
        )}

        {!historyMode && rows.length > 0 && (
          <Text style={styles.note}>
            კალენდარი ცნობარია და არა დანიშნულება — ზუსტ დროს პედიატრი განსაზღვრავს.
          </Text>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.xs, paddingBottom: spacing.xl },

  locked: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.sm },
  lockIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: { ...typography.h2, color: colors.textPrimary },
  lockedText: { ...typography.small, color: colors.textSecondary, lineHeight: 19 },

  saved: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.sm },
  savedTitle: { ...typography.h2, color: colors.textPrimary },

  empty: { ...typography.small, color: colors.textSecondary, textAlign: 'center' },
  progress: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.xs },
  error: { ...typography.small, color: colors.danger },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  rowDone: { borderColor: colors.success },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  checkMark: { color: colors.surface, fontSize: 13, fontWeight: '700', lineHeight: 15 },
  rowMain: { flex: 1, gap: 2 },
  rowName: { ...typography.small, color: colors.textPrimary, fontWeight: '600' },
  rowMeta: { ...typography.small, fontSize: 11, color: colors.textSecondary },
  dueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },

  save: { marginTop: spacing.md },
  note: {
    ...typography.small,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 17,
  },
});
