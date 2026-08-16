import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { colors, radius, spacing, typography } from '@/theme';
import { api } from '@/api/client';
import { useMedications, type Medication } from '@/features/medications/medications.store';

/** `აღწერა | მგ | მლ` ხაზები — ერთი ველი, რამდენიმე ჩანაწერი. */
function parseRows<T>(raw: string, build: (parts: string[]) => T | null): T[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => build(line.split('|').map((p) => p.trim())))
    .filter((row): row is T => row !== null);
}

const EMPTY = {
  name: '',
  slug: '',
  dosingType: 'PER_KG' as 'PER_KG' | 'BY_AGE',
  mgPerKgMin: '',
  mgPerKgMax: '',
  ageBands: '',
  intervalHoursMin: '',
  intervalHoursMax: '',
  maxDailyMg: '',
  minAgeMonths: '0',
  minWeightKg: '0',
  concentrations: '',
  note: '',
};

/**
 * წამლების ცნობარი — პროფილის გვერდზე.
 *
 * კალკულატორი ზუსტად ამ მონაცემებით ითვლის, ამიტომ რედაქტირება
 * ADMIN-სა და SUPER_ADMIN-ს ეკუთვნის; ოპერატორს ეს განყოფილება
 * საერთოდ არ უჩანს.
 */
export function MedicationsSection() {
  const { medications, load } = useMedications();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const startEdit = (med: Medication) => {
    setEditingId(med.id);
    setOpen(true);
    setForm({
      name: med.name,
      slug: med.slug,
      dosingType: med.dosingType,
      mgPerKgMin: med.mgPerKgMin?.toString() ?? '',
      mgPerKgMax: med.mgPerKgMax?.toString() ?? '',
      ageBands: (med.ageBands ?? [])
        .map((b) => `${b.label} | ${b.untilMonths} | ${b.mg}`)
        .join('\n'),
      intervalHoursMin: String(med.intervalHoursMin),
      intervalHoursMax: String(med.intervalHoursMax),
      maxDailyMg: String(med.maxDailyMg),
      minAgeMonths: String(med.minAgeMonths),
      minWeightKg: String(med.minWeightKg),
      concentrations: med.concentrations.map((c) => `${c.label} | ${c.mg} | ${c.ml}`).join('\n'),
      note: med.note ?? '',
    });
  };

  const close = () => {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  };

  const num = (value: string) => Number(value.replace(',', '.'));

  const handleSave = async () => {
    setError(null);

    const concentrations = parseRows(form.concentrations, (parts) => {
      const [label, mg, ml] = parts;
      if (!label || !mg || !ml) return null;
      return { label, mg: num(mg), ml: num(ml) };
    });

    if (!concentrations.length) {
      setError('მიუთითეთ კონცენტრაცია: აღწერა | მგ | მლ');
      return;
    }

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      dosingType: form.dosingType,
      intervalHoursMin: num(form.intervalHoursMin),
      intervalHoursMax: num(form.intervalHoursMax),
      maxDailyMg: num(form.maxDailyMg),
      minAgeMonths: num(form.minAgeMonths) || 0,
      minWeightKg: num(form.minWeightKg) || 0,
      concentrations,
      note: form.note.trim() || undefined,
    };

    if (form.dosingType === 'PER_KG') {
      body.mgPerKgMin = num(form.mgPerKgMin);
      body.mgPerKgMax = num(form.mgPerKgMax) || num(form.mgPerKgMin);
    } else {
      const bands = parseRows(form.ageBands, (parts) => {
        const [label, untilMonths, mg] = parts;
        if (!label || !untilMonths || !mg) return null;
        return { label, untilMonths: Number(untilMonths), mg: num(mg) };
      });

      if (!bands.length) {
        setError('ასაკობრივ დოზირებას სჭირდება: აღწერა | თვემდე | მგ');
        return;
      }
      body.ageBands = bands;
    }

    setBusy(true);
    try {
      await api(editingId ? `/admin/medications/${editingId}` : '/admin/medications', {
        method: editingId ? 'PATCH' : 'POST',
        body,
      });
      await load(true);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'შენახვა ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      await api(`/admin/medications/${id}`, { method: 'DELETE' });
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'წაშლა ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>წამლების ცნობარი</Text>
      <Text style={styles.hint}>
        კალკულატორი ზუსტად ამ მონაცემებით ითვლის — შეყვანამდე გადაამოწმეთ.
      </Text>

      {medications.map((med) => {
        const expanded = openId === med.id;
        const dose =
          med.dosingType === 'PER_KG'
            ? med.mgPerKgMin === med.mgPerKgMax
              ? `${med.mgPerKgMin} მგ/კგ`
              : `${med.mgPerKgMin}–${med.mgPerKgMax} მგ/კგ`
            : 'დოზა ასაკის მიხედვით';

        return (
          <AuthCard key={med.id} style={styles.card}>
            {/* დაკეცილში მთავარია დოზა — სწორედ ის იძებნება თვალით */}
            <Pressable
              onPress={() => setOpenId(expanded ? null : med.id)}
              style={styles.cardHead}
            >
              <View style={styles.headText}>
                <Text style={styles.name}>{med.name}</Text>
                <Text style={styles.dose}>{dose}</Text>
              </View>
              <Icon
                name={expanded ? 'chevron-down' : 'chevron-right'}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>

            {expanded && (
              <View style={styles.details}>
                <Text style={styles.meta}>
                  ინტერვალი:{' '}
                  {med.intervalHoursMin === med.intervalHoursMax
                    ? `${med.intervalHoursMin} სთ-ში ერთხელ`
                    : `${med.intervalHoursMin}–${med.intervalHoursMax} სთ-ში ერთხელ`}
                </Text>
                <Text style={styles.meta}>დღეში მაქსიმუმ: {med.maxDailyMg} მგ</Text>
                <Text style={styles.meta}>
                  {med.minAgeMonths} თვიდან · {med.minWeightKg} კგ-დან
                </Text>

                {med.concentrations.map((c) => (
                  <Text key={c.label} style={styles.meta}>
                    · {c.label}
                  </Text>
                ))}

                {!!med.note && <Text style={styles.note}>{med.note}</Text>}

                <View style={styles.actions}>
                  <Pressable onPress={() => startEdit(med)}>
                    <Text style={styles.editLink}>რედაქტირება</Text>
                  </Pressable>
                  <Pressable disabled={busy} onPress={() => handleDelete(med.id)}>
                    <Text style={styles.deleteLink}>წაშლა</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </AuthCard>
        );
      })}

      {!open ? (
        <Button title="+ ახალი წამალი" variant="outline" onPress={() => setOpen(true)} />
      ) : (
        <AuthCard style={styles.card}>
          <Input placeholder="დასახელება" value={form.name} onChangeText={set('name')} />
          <Input
            placeholder="იდენტიფიკატორი (ლათინურად)"
            value={form.slug}
            onChangeText={set('slug')}
            autoCapitalize="none"
          />

          <View style={styles.typeRow}>
            {(['PER_KG', 'BY_AGE'] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => setForm((p) => ({ ...p, dosingType: type }))}
                style={[styles.typeChip, form.dosingType === type && styles.typeChipActive]}
              >
                <Text
                  style={[
                    styles.typeText,
                    form.dosingType === type && styles.typeTextActive,
                  ]}
                >
                  {type === 'PER_KG' ? 'დოზა წონაზე' : 'დოზა ასაკზე'}
                </Text>
              </Pressable>
            ))}
          </View>

          {form.dosingType === 'PER_KG' ? (
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Input
                  placeholder="მგ/კგ მინ."
                  value={form.mgPerKgMin}
                  onChangeText={set('mgPerKgMin')}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.rowItem}>
                <Input
                  placeholder="მგ/კგ მაქს."
                  value={form.mgPerKgMax}
                  onChangeText={set('mgPerKgMax')}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          ) : (
            <>
              <Input
                placeholder="აღწერა | თვემდე | მგ"
                value={form.ageBands}
                onChangeText={set('ageBands')}
                multiline
              />
              <Text style={styles.hint}>თითო ხაზზე ერთი საფეხური</Text>
            </>
          )}

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Input
                placeholder="ინტერვალი მინ. (სთ)"
                value={form.intervalHoursMin}
                onChangeText={set('intervalHoursMin')}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.rowItem}>
              <Input
                placeholder="ინტერვალი მაქს. (სთ)"
                value={form.intervalHoursMax}
                onChangeText={set('intervalHoursMax')}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Input
            placeholder="მაქს. დოზა დღეში (მგ)"
            value={form.maxDailyMg}
            onChangeText={set('maxDailyMg')}
            keyboardType="decimal-pad"
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Input
                placeholder="მინ. ასაკი (თვე)"
                value={form.minAgeMonths}
                onChangeText={set('minAgeMonths')}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.rowItem}>
              <Input
                placeholder="მინ. წონა (კგ)"
                value={form.minWeightKg}
                onChangeText={set('minWeightKg')}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Input
            placeholder="აღწერა | მგ | მლ"
            value={form.concentrations}
            onChangeText={set('concentrations')}
            multiline
          />
          <Text style={styles.hint}>კონცენტრაციები — თითო ხაზზე ერთი</Text>

          <Input placeholder="შენიშვნა" value={form.note} onChangeText={set('note')} />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Button title="გაუქმება" variant="outline" onPress={close} />
            </View>
            <View style={styles.rowItem}>
              <Button
                title={editingId ? 'შენახვა' : 'დამატება'}
                loading={busy}
                onPress={handleSave}
              />
            </View>
          </View>
        </AuthCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.lg },
  title: { ...typography.h3, color: colors.textPrimary },
  hint: { ...typography.small, color: colors.textMuted, marginBottom: spacing.sm },
  card: { marginBottom: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headText: { flex: 1 },
  name: { ...typography.bodyMedium, color: colors.textPrimary },
  dose: { ...typography.small, color: colors.primaryDeep, fontWeight: '600', marginTop: 2 },
  details: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  note: { ...typography.small, color: colors.textSecondary, marginTop: spacing.xs },
  meta: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  editLink: { ...typography.small, color: colors.primaryDeep, fontWeight: '600' },
  deleteLink: { ...typography.small, color: colors.danger, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1 },
  typeRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  typeChip: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { ...typography.small, color: colors.textSecondary },
  typeTextActive: { color: colors.textOnPrimary, fontWeight: '700' },
  error: { ...typography.small, color: colors.danger, marginTop: spacing.xs },
});
