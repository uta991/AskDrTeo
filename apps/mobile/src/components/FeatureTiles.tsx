import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export interface Tile {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  /** წითელი ნიშანი — შეუვსებელი პროფილი, საგანგაშო შედეგი და მისთ. */
  badge?: boolean;
  /** ფუნქცია პაკეტში არ შედის — ფილა ჩანს, მაგრამ საკეტით */
  locked?: boolean;
}

/**
 * მთავარი ეკრანის ფილები.
 *
 * ორსვეტიანი ბადე ჩამონათვალის ნაცვლად: ხატულა და მოკლე წარწერა
 * ერთი შეხედვით იკითხება, სქროლვა კი აღარ სჭირდება.
 */
export function FeatureTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.key}
          onPress={tile.onPress}
          style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        >
          <View style={[styles.iconWrap, tile.locked && styles.iconWrapLocked]}>
            <Icon
              name={tile.locked ? 'lock' : tile.icon}
              size={26}
              color={tile.locked ? colors.textMuted : colors.textOnPrimary}
              strokeWidth={1.9}
            />
            {tile.badge && <View style={styles.badge} />}
          </View>

          <Text style={styles.label}>{tile.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tile: {
    // ორი სვეტი — დანარჩენს ღრეჩო იკავებს
    width: '48.5%',
    aspectRatio: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.card,
  },
  tilePressed: { borderColor: colors.primary },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  iconWrapLocked: { backgroundColor: colors.surfaceMuted },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  label: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
