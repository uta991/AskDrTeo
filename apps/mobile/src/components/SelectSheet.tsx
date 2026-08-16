import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { colors, radius, spacing, typography } from '@/theme';

export interface SelectOption {
  key: string;
  label: string;
  /** დამატებითი ხაზი — მაგ. დოზირების წესი */
  detail?: string;
}

/**
 * არჩევანის პანელი ძებნით.
 *
 * სია ცნობარიდან მოდის და ადმინს მისი გაზრდა შეუძლია — ეკრანზე
 * პირდაპირ ჩამოწერა მალე აღარ დაეტეოდა. ძებნა მხოლოდ მაშინ ჩნდება,
 * როცა ვარიანტები საკმარისად ბევრია.
 */
export function SelectSheet({
  visible,
  title,
  options,
  selectedKey,
  searchPlaceholder = 'ძებნა',
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedKey?: string;
  searchPlaceholder?: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const showSearch = options.length > 5;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.detail?.toLowerCase().includes(q),
    );
  }, [options, query]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={close} hitSlop={12}>
            <Text style={styles.close}>დახურვა</Text>
          </Pressable>
        </View>

        {showSearch && (
          <View style={styles.searchBox}>
            <Icon name="chevron-right" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCorrect={false}
              autoFocus
            />
          </View>
        )}

        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {!filtered.length && <Text style={styles.empty}>ვერაფერი მოიძებნა</Text>}

          {filtered.map((option) => {
            const active = option.key === selectedKey;
            return (
              <Pressable
                key={option.key}
                onPress={() => {
                  onSelect(option.key);
                  close();
                }}
                style={[styles.row, active && styles.rowActive]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
                    {option.label}
                  </Text>
                  {!!option.detail && <Text style={styles.rowDetail}>{option.detail}</Text>}
                </View>

                {active && <Icon name="check" size={18} color={colors.primaryDeep} strokeWidth={2.4} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    maxHeight: '78%',
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
  title: { ...typography.bodyMedium, color: colors.textPrimary },
  close: { ...typography.small, color: colors.primaryDeep, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, padding: 0 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    marginBottom: 6,
    backgroundColor: colors.surfaceMuted,
  },
  rowActive: { backgroundColor: colors.primary },
  rowText: { flex: 1 },
  rowLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  rowLabelActive: { color: colors.textOnPrimary, fontWeight: '700' },
  rowDetail: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  empty: { ...typography.small, color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
});
