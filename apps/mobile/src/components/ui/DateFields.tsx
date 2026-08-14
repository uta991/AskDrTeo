import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useT } from '@/i18n';

export interface DateParts {
  day: string;
  month: string;
  year: string;
}

export const EMPTY_DATE: DateParts = { day: '', month: '', year: '' };

interface DateFieldsProps {
  label: string;
  value: DateParts;
  onChange: (value: DateParts) => void;
  error?: string;
  /** წლის გარეშე შევსება — მამის თარიღისთვის დღე არ არის სავალდებულო */
  hideDay?: boolean;
}

/**
 * თარიღი სამ ცალკე ველად: დღე / თვე / წელი.
 *
 * ნატიური date picker აქ განზრახ არ გამოვიყენეთ — მშობელს ხშირად
 * წლების უკან გადახვევა უწევს (განსაკუთრებით საკუთარი დაბადების
 * თარიღისთვის), რაც პიკერით ნელია.
 */
export function DateFields({ label, value, onChange, error, hideDay }: DateFieldsProps) {
  const t = useT();

  const set = (key: keyof DateParts) => (text: string) =>
    onChange({ ...value, [key]: text.replace(/\D/g, '') });

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.row}>
        {!hideDay && (
          <Cell
            placeholder={t('child', 'day')}
            value={value.day}
            onChangeText={set('day')}
            maxLength={2}
            error={!!error}
          />
        )}
        <Cell
          placeholder={t('child', 'month')}
          value={value.month}
          onChangeText={set('month')}
          maxLength={2}
          error={!!error}
        />
        <Cell
          placeholder={t('child', 'year')}
          value={value.year}
          onChangeText={set('year')}
          maxLength={4}
          flex={1.4}
          error={!!error}
        />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function Cell({
  flex = 1,
  error,
  ...props
}: React.ComponentProps<typeof TextInput> & { flex?: number; error?: boolean }) {
  return (
    <TextInput
      {...props}
      keyboardType="number-pad"
      placeholderTextColor={colors.textMuted}
      style={[styles.cell, { flex }, error && styles.cellError]}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: {
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
    ...typography.body,
    color: colors.textPrimary,
    ...shadows.input,
  },
  cellError: { borderColor: colors.danger },
  error: { ...typography.small, color: colors.danger, marginTop: spacing.xs },
});

/**
 * სამი ველიდან ISO თარიღი.
 * აბრუნებს null-ს, თუ თარიღი არასრული ან არარსებულია (მაგ. 31 თებერვალი).
 */
export function partsToISO(parts: DateParts, defaultDay = 1): string | null {
  const day = parts.day ? Number(parts.day) : defaultDay;
  const month = Number(parts.month);
  const year = Number(parts.year);

  if (!month || !year || year < 1900) return null;

  const date = new Date(Date.UTC(year, month - 1, day));

  // Date თავად ასწორებს გადაცილებულ რიცხვს (32 იანვარი → 1 თებერვალი),
  // ამიტომ უკუშემოწმება აუცილებელია
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date.toISOString();
}

export function isEmptyDate(parts: DateParts): boolean {
  return !parts.day && !parts.month && !parts.year;
}
