import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, spacing, typography } from '@/theme';

export interface Tile {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  /** წითელი ნიშანი — შეუვსებელი პროფილი, საგანგაშო შედეგი და მისთ. */
  badge?: boolean;
  /** ფუნქცია პაკეტში არ შედის — ხატულა საკეტით ჩანს */
  locked?: boolean;
}

/**
 * მთავარი ეკრანის ფილები.
 *
 * აპლიკაციის ხატულის ლოგიკა: მომრგვალებული კვადრატი, შიგნით ნახატი,
 * ქვემოთ წარწერა. თეთრი ბარათი განზრახ აღარ არის — ის ხატულის გარშემო
 * მეორე ჩარჩოს ქმნიდა და ორმაგი ოთხკუთხედი გამოდიოდა.
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
            {/* რბილ ველზე ღრმა ყვითელი ნახატი — კონტრასტიც არის და ყვითელიც */}
            <Icon
              name={tile.locked ? 'lock' : tile.icon}
              size={47}
              color={tile.locked ? colors.textMuted : colors.iconGlyph}
              strokeWidth={1.9}
            />

            {tile.badge && <View style={styles.badge} />}
          </View>

          <Text style={styles.label} numberOfLines={2}>
            {tile.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
    marginTop: spacing.md,
  },
  tile: {
    // სამი სვეტი — ქართული წარწერა ორ სტრიქონში თავისუფლად ეტევა
    width: '33.33%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tilePressed: { opacity: 0.7 },

  /** მომრგვალებული კვადრატი — შიგნით ნახატი ბრენდის ყვითელში */
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
  },
  iconWrapLocked: { backgroundColor: colors.surfaceMuted },

  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  label: {
    ...typography.small,
    fontSize: 12,
    color: colors.textOnCard,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
});
