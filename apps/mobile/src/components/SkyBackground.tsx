import React from 'react';
import { Dimensions, Image, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse, G } from 'react-native-svg';
import { colors } from '@/theme';
import { imageRatios, images } from '@/assets/images';

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * აპლიკაციის საერთო ფონი: თბილი კრემისფერი გრადიენტი, რბილი ღრუბლები და
 * მტრედები ზედა კუთხეებში.
 *
 * მტრედები ნახატი არ არის — ორიგინალი ფოტოდანაა ამოჭრილი და ცისფერი ცა
 * გამჭვირვალედ არის ქცეული (იხ. `scratchpad/extract_doves.py`).
 */

function Cloud({ width, opacity = 0.9 }: { width: number; opacity?: number }) {
  return (
    <Svg width={width} height={width * 0.45} viewBox="0 0 200 90" opacity={opacity}>
      <G fill={colors.cloud}>
        <Ellipse cx="60" cy="58" rx="46" ry="26" />
        <Ellipse cx="104" cy="44" rx="40" ry="32" />
        <Ellipse cx="146" cy="60" rx="38" ry="24" />
        <Ellipse cx="100" cy="70" rx="76" ry="18" />
      </G>
    </Svg>
  );
}

export interface SkyBackgroundProps {
  children?: React.ReactNode;
  /** ჩვენება მტრედების — შიდა ეკრანებზე შეიძლება გამოირთოს. */
  showDoves?: boolean;
  style?: ViewStyle;
}

const DOVE_LEFT_W = 128;
const DOVE_RIGHT_W = 140;

export function SkyBackground({ children, showDoves = true, style }: SkyBackgroundProps) {
  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={[colors.skyTop, colors.skyMid, colors.skyBottom]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* დეკორაცია არ უნდა იჭერდეს შეხებას — pointerEvents="none" აუცილებელია */}
      <View style={styles.decor} pointerEvents="none">
        <View style={[styles.cloud, { top: 150, left: -60 }]}>
          <Cloud width={SCREEN_W * 0.7} opacity={0.6} />
        </View>
        <View style={[styles.cloud, { top: 210, right: -70 }]}>
          <Cloud width={SCREEN_W * 0.8} opacity={0.5} />
        </View>

        {showDoves && images.doveLeft && images.doveRight && (
          <>
            <Image
              source={images.doveLeft}
              style={[
                styles.dove,
                {
                  // left: 0 — უფრო მარცხნივ გაწევა ფრთას ეკრანს გარეთ ტოვებს
                  top: 62,
                  left: 0,
                  width: DOVE_LEFT_W,
                  height: DOVE_LEFT_W * imageRatios.doveLeft,
                },
              ]}
              resizeMode="contain"
            />
            <Image
              source={images.doveRight}
              style={[
                styles.dove,
                {
                  // საკმარისად მაღლა, რომ სათაურმა ნისკარტი არ დაფაროს
                  top: 40,
                  right: 0,
                  width: DOVE_RIGHT_W,
                  height: DOVE_RIGHT_W * imageRatios.doveRight,
                },
              ]}
              resizeMode="contain"
            />
          </>
        )}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.skyBottom },
  decor: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cloud: { position: 'absolute' },
  dove: { position: 'absolute' },
});
