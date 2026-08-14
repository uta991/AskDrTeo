import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, shadows, typography } from '@/theme';
import { LANGUAGES, useLanguage } from '@/i18n';

/**
 * ენის გადამრთველი: ქარ | ENG | RUS
 *
 * სამივე ვარიანტი ერთდროულად ჩანს — ჩამოსაშლელ სიაში დამალვა
 * ავტორიზაციამდე მომხმარებელს ენის შეცვლას გაურთულებდა.
 */
/**
 * @param subtle — გამჭვირვალე ვარიანტი. Login-ზე გადამრთველი ფოტოს ზემოთ დგას
 * და მკვეთრი თეთრი ბარათი ფონს ჭრიდა.
 */
export function LanguageSwitch({
  style,
  subtle = false,
}: {
  style?: ViewStyle;
  subtle?: boolean;
}) {
  const { language, setLanguage } = useLanguage();

  return (
    <View style={[styles.wrapper, subtle && styles.wrapperSubtle, style]}>
      {LANGUAGES.map(({ code, label }, index) => {
        const active = code === language;
        return (
          <React.Fragment key={code}>
            {index > 0 && <View style={[styles.separator, subtle && styles.separatorSubtle]} />}
            <Pressable
              onPress={() => setLanguage(code)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.item, active && (subtle ? styles.itemActiveSubtle : styles.itemActive)]}
            >
              <Text
                style={[
                  styles.label,
                  subtle && styles.labelSubtle,
                  active && (subtle ? styles.labelActiveSubtle : styles.labelActive),
                ]}
              >
                {label}
              </Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 4,
    paddingVertical: 3,
    ...shadows.input,
  },
  // მკრტალი ვარიანტი — ფონს არ ჭრის
  // ფონისა და ჩარჩოს გარეშე — მხოლოდ ტექსტი. ბარათი, თუნდაც გამჭვირვალე,
  // ფოტოს ჭრიდა და ყურადღებას თავისკენ იტაცებდა
  wrapperSubtle: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    paddingHorizontal: 0,
  },
  item: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  itemActive: { backgroundColor: colors.primary },
  itemActiveSubtle: { backgroundColor: 'transparent' },
  label: {
    ...typography.small,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  labelActive: { color: colors.textOnPrimary },
  labelSubtle: { color: colors.textMuted, fontWeight: '400', opacity: 0.55 },
  labelActiveSubtle: { color: colors.textSecondary, fontWeight: '600', opacity: 0.8 },
  separator: { width: 1, height: 14, backgroundColor: colors.border },
  separatorSubtle: { backgroundColor: 'rgba(191, 180, 162, 0.2)', height: 10 },
});
