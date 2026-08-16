import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, G } from 'react-native-svg';
import { colors, spacing, typography } from '@/theme';
import { images } from '@/assets/images';

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * ფოტოს სიმაღლე. ორიგინალის პროპორციაა 1.7, მაგრამ აქ უფრო განიერს
 * ვიყენებთ, რომ login ეკრანი სქროლის გარეშე ჩაეტიოს — cover-ი ზედა
 * გამჭვირვალე ზოლს ჭრის და ბავშვს არ ეხება.
 */
const PHOTO_HEIGHT = SCREEN_W / 2.05;

/**
 * Login ეკრანის ზედა ბლოკი: ლოგო და სათაური, ქვემოთ კი ბავშვის ფოტო
 * კიდიდან კიდემდე.
 *
 * გრადიენტები აქ არ არის და არც არის საჭირო — ფოტო თავად არის გამჭვირვალე
 * PNG, რომელსაც ცისფერი ცა მოცილებული აქვს და კიდეები ჩამქრალი (იხ.
 * `scratchpad/extract_hero.py`). კოდში დამატებული გრადიენტი ორმაგ ჩრდილს
 * ქმნიდა.
 */
export function HeroBaby({ children }: { children?: React.ReactNode }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.content}>{children}</View>

      <View style={styles.photoLayer}>
        {images.heroBaby ? (
          <Image source={images.heroBaby} style={styles.photo} resizeMode="cover" />
        ) : (
          <PhotoPlaceholder />
        )}
      </View>
    </View>
  );
}

function PhotoPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <Svg width="100%" height="100%" viewBox="0 0 300 140" style={StyleSheet.absoluteFill}>
        <G fill={colors.cloud}>
          <Ellipse cx="80" cy="100" rx="70" ry="34" />
          <Ellipse cx="150" cy="86" rx="66" ry="42" />
          <Ellipse cx="222" cy="102" rx="62" ry="32" />
          <Ellipse cx="150" cy="122" rx="130" ry="26" />
        </G>
      </Svg>
      <Text style={styles.placeholderHint}>assets/images/hero-baby.png</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: SCREEN_W },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  photoLayer: {
    width: SCREEN_W,
    height: PHOTO_HEIGHT,
    // ფოტოს ზედა ნაწილი ისედაც გამჭვირვალეა — ტექსტს უსაფრთხოდ ეკვრის
    marginTop: -spacing.xl,
  },
  photo: { width: '100%', height: '100%' },
  placeholder: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderHint: { ...typography.small, color: colors.textMuted },
});
