import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { Icon } from '@/components/ui/Icon';
import { NumberPad } from '@/components/NumberPad';
import { SelectSheet } from '@/components/SelectSheet';
import { colors, radius, spacing, typography } from '@/theme';
import { useMedications } from '@/features/medications/medications.store';
import { calculateDose } from '@/features/medications/dose';

/** წლები და თვეები ერთ რიცხვში — ცნობარი თვეებში ითვლის. */
function toMonths(years: string, months: string): number {
  return (Number(years) || 0) * 12 + (Number(months) || 0);
}

export function CalculatorTab() {
  const insets = useSafeAreaInsets();

  const { medications, loading, load } = useMedications();

  const [slug, setSlug] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [years, setYears] = useState('');
  const [months, setMonths] = useState('');
  const [concIndex, setConcIndex] = useState(0);

  // რომელი ველი იმართება ციფრების კლავიატურით
  const [editing, setEditing] = useState<'weight' | 'years' | 'months' | null>(null);
  const [picking, setPicking] = useState<'medication' | 'concentration' | null>(null);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  const medication = medications.find((m) => m.slug === slug) ?? medications[0];

  const result = useMemo(() => {
    if (!medication) return null;

    const kg = Number(weight.replace(',', '.'));
    if (!kg || kg <= 0) return null;

    return calculateDose(
      medication,
      kg,
      toMonths(years, months),
      medication.concentrations[concIndex],
    );
  }, [medication, weight, years, months, concIndex]);

  const blocked = result && 'blocked' in result ? result.blocked : null;
  const dose = result && !('blocked' in result) ? result : null;

  const range = (min: number, max: number, unit: string) =>
    min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`;

  return (
    <SkyBackground showDoves={false}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>დოზის კალკულატორი</Text>
        <Text style={styles.subtitle}>აირჩიეთ წამალი და მიუთითეთ წონა და ასაკი</Text>

        {loading && !medications.length && <ActivityIndicator color={colors.primary} />}

        {!loading && !medications.length && (
          <Text style={styles.empty}>ცნობარი ჯერ ცარიელია.</Text>
        )}

        {!!medication && (
          <>
            <AuthCard style={styles.card}>
              <SelectField
                label="წამალი"
                value={medication.name}
                onPress={() => setPicking('medication')}
              />

              <NumberField
                label="ბავშვის წონა"
                value={weight}
                suffix="კგ"
                onPress={() => setEditing('weight')}
              />

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <NumberField
                    label="ასაკი — წელი"
                    value={years}
                    onPress={() => setEditing('years')}
                  />
                </View>
                <View style={styles.rowItem}>
                  <NumberField
                    label="თვე"
                    value={months}
                    onPress={() => setEditing('months')}
                  />
                </View>
              </View>

              <SelectField
                label="პრეპარატის კონცენტრაცია"
                value={medication.concentrations[concIndex]?.label ?? '—'}
                onPress={() => setPicking('concentration')}
              />
              <Text style={styles.hint}>
                შეამოწმეთ შეფუთვაზე — მილილიტრი სწორედ ამაზეა დამოკიდებული.
              </Text>
            </AuthCard>

            {/* ── შედეგი ─────────────────────────────────────── */}
            <AuthCard style={styles.card}>
              {!result && <Text style={styles.empty}>შეიყვანეთ წონა და ასაკი</Text>}

              {!!blocked && <Text style={styles.blocked}>{blocked}</Text>}

              {!!dose && (
                <>
                  <Text style={styles.doseLabel}>ერთჯერადი დოზა</Text>
                  <Text style={styles.doseMl}>
                    {range(dose.singleMlMin ?? 0, dose.singleMlMax ?? 0, 'მლ')}
                  </Text>
                  <Text style={styles.doseMg}>
                    {range(dose.singleMgMin, dose.singleMgMax, 'მგ')}
                  </Text>

                  <View style={styles.facts}>
                    <Fact
                      label="მიღების ინტერვალი"
                      value={
                        medication.intervalHoursMin === medication.intervalHoursMax
                          ? `${medication.intervalHoursMin} საათში ერთხელ`
                          : `${medication.intervalHoursMin}–${medication.intervalHoursMax} საათში ერთხელ`
                      }
                    />
                    <Fact
                      label="დღეში მაქსიმუმ"
                      value={`${dose.dosesPerDay} მიღება · ${dose.dailyMaxMg} მგ`}
                    />
                    {!!dose.bandLabel && (
                      <Fact label="ასაკობრივი საფეხური" value={dose.bandLabel} />
                    )}
                  </View>

                  {dose.warnings.map((warning) => (
                    <Text key={warning} style={styles.warning}>
                      {warning}
                    </Text>
                  ))}
                </>
              )}

              {!!medication.note && <Text style={styles.note}>{medication.note}</Text>}

              <Text style={styles.disclaimer}>
                გამოთვლა საორიენტაციოა და ექიმის დანიშნულებას არ ცვლის. ზუსტი დოზა
                დიაგნოზზე, თანმხლებ დაავადებებსა და სხვა მედიკამენტებზეა დამოკიდებული.
              </Text>
            </AuthCard>
          </>
        )}
      </ScrollView>

      <NumberPad
        visible={editing !== null}
        label={
          editing === 'weight' ? 'ბავშვის წონა' : editing === 'years' ? 'ასაკი — წელი' : 'ასაკი — თვე'
        }
        value={editing === 'weight' ? weight : editing === 'years' ? years : months}
        allowDecimal={editing === 'weight'}
        suffix={editing === 'weight' ? 'კგ' : undefined}
        onChange={(next) => {
          if (editing === 'weight') setWeight(next);
          else if (editing === 'years') setYears(next);
          else setMonths(next);
        }}
        onClose={() => setEditing(null)}
      />

      <SelectSheet
        visible={picking === 'medication'}
        title="აირჩიეთ წამალი"
        searchPlaceholder="წამლის ძებნა"
        selectedKey={medication?.slug}
        options={medications.map((med) => ({
          key: med.slug,
          label: med.name,
          detail:
            med.dosingType === 'PER_KG'
              ? `${med.mgPerKgMin}–${med.mgPerKgMax} მგ/კგ`
              : 'დოზა ასაკის მიხედვით',
        }))}
        onSelect={(key) => {
          setSlug(key);
          setConcIndex(0);
        }}
        onClose={() => setPicking(null)}
      />

      <SelectSheet
        visible={picking === 'concentration'}
        title="პრეპარატის კონცენტრაცია"
        selectedKey={String(concIndex)}
        options={(medication?.concentrations ?? []).map((c, index) => ({
          key: String(index),
          label: c.label,
        }))}
        onSelect={(key) => setConcIndex(Number(key))}
        onClose={() => setPicking(null)}
      />
    </SkyBackground>
  );
}

/** ასარჩევი ველი — პანელს ხსნის, თავად არაფერს წერს. */
function SelectField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.numberField}>
      <Text style={styles.numberLabel}>{label}</Text>
      <View style={styles.selectRow}>
        <Text style={styles.selectValue} numberOfLines={1}>
          {value}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

/** ველი, რომელიც სისტემურ კლავიატურას არ ხსნის — მხოლოდ ჩვენსას. */
function NumberField({
  label,
  value,
  suffix,
  onPress,
}: {
  label: string;
  value: string;
  suffix?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.numberField}>
      <Text style={styles.numberLabel}>{label}</Text>
      <View style={styles.numberValueRow}>
        <Text style={[styles.numberValue, !value && styles.numberPlaceholder]}>
          {value || '—'}
        </Text>
        {!!suffix && !!value && <Text style={styles.numberSuffix}>{suffix}</Text>}
      </View>
    </Pressable>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.md },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1 },
  hint: { ...typography.small, color: colors.textMuted },
  empty: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
  doseLabel: { ...typography.small, color: colors.textSecondary, textAlign: 'center' },
  doseMl: {
    ...typography.h1,
    color: colors.primaryDeep,
    textAlign: 'center',
  },
  doseMg: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
  facts: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  fact: {},
  factLabel: { ...typography.small, color: colors.textMuted, fontSize: 11 },
  factValue: { ...typography.small, color: colors.textPrimary, fontWeight: '600' },
  // შეზღუდვა თვალში უნდა მოხვდეს — უსაფრთხოების ინფორმაციაა
  blocked: {
    ...typography.small,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  warning: {
    ...typography.small,
    color: colors.primaryDeep,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  note: { ...typography.small, color: colors.textSecondary, marginTop: spacing.sm },
  disclaimer: {
    ...typography.small,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  numberField: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  numberLabel: { ...typography.small, color: colors.textMuted, fontSize: 11 },
  numberValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  numberValue: { ...typography.h3, color: colors.textPrimary },
  numberPlaceholder: { color: colors.textMuted },
  numberSuffix: { ...typography.small, color: colors.textSecondary },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  selectValue: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
});