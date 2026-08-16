import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * ციფრების კლავიატურა.
 *
 * სისტემური `number-pad` განზრახ არ გამოიყენება: iOS-ზე მას დახურვის
 * ღილაკიც არ აქვს და აპლიკაციის სტილსაც არღვევს. ეს კი იმავე თბილი
 * პალიტრისაა და ერთ ხელში იკითხება — მშობელი ხშირად ბავშვს იჭერს.
 */
export function NumberPad({
  visible,
  label,
  value,
  allowDecimal = false,
  suffix,
  onChange,
  onClose,
}: {
  visible: boolean;
  label: string;
  value: string;
  allowDecimal?: boolean;
  suffix?: string;
  onChange: (next: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  const press = (key: string) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }

    if (key === '.') {
      // ერთზე მეტი წერტილი რიცხვს გააფუჭებდა
      if (value.includes('.')) return;
      onChange((value || '0') + '.');
      return;
    }

    // წამყვანი ნული აზრს კარგავს — „05" ნაცვლად „5"
    onChange(value === '0' ? key : value + key);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', allowDecimal ? '.' : '', '0', '⌫'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.header}>
          <Text style={styles.label}>{label}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.done}>დასრულება</Text>
          </Pressable>
        </View>

        <View style={styles.display}>
          <Text style={styles.value}>{value || '0'}</Text>
          {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}
        </View>

        <View style={styles.keys}>
          {keys.map((key, index) =>
            key ? (
              <Pressable
                key={key}
                onPress={() => press(key)}
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
              >
                {key === '⌫' ? (
                  <Icon name="chevron-left" size={22} color={colors.textPrimary} strokeWidth={2.2} />
                ) : (
                  <Text style={styles.keyText}>{key}</Text>
                )}
              </Pressable>
            ) : (
              <View key={`gap-${index}`} style={styles.key} />
            ),
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: { ...typography.small, color: colors.textSecondary },
  done: { ...typography.small, color: colors.primaryDeep, fontWeight: '700' },
  display: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  value: { ...typography.h1, color: colors.textPrimary },
  suffix: { ...typography.body, color: colors.textSecondary },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  key: {
    // სამ სვეტად — დანარჩენს ღრეჩოები იკავებს
    width: '31%',
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  keyPressed: { backgroundColor: colors.primary },
  keyText: { ...typography.h3, color: colors.textPrimary },
});
