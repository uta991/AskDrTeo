import React from 'react';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '@/theme';

/**
 * ბრენდის ნიშანი: ამომავალი მზე — სითბო, ახალი დღე, იმედი.
 * ჰორიზონტის ხაზზე ნახევარწრე და ზემოთ გაშლილი სხივები.
 */
export function Logo({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.72} viewBox="0 0 120 86">
      <Defs>
        <LinearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.primary} />
          <Stop offset="1" stopColor={colors.primaryDark} />
        </LinearGradient>
      </Defs>

      {/* სხივები — ცენტრიდან მარაოსებრ, ჰორიზონტის ზემოთ */}
      {RAYS.map(({ angle, length }) => (
        <Rect
          key={angle}
          x={58.5}
          y={62 - 26 - length}
          width={3}
          height={length}
          rx={1.5}
          fill="url(#sun)"
          origin="60, 62"
          rotation={angle}
        />
      ))}

      {/* მზის დისკი — ჰორიზონტზე ნახევრად ამოსული */}
      <Path d="M36 62 A24 24 0 0 1 84 62 Z" fill="url(#sun)" />

      {/* ჰორიზონტის ხაზები */}
      <Rect x="26" y="66" width="68" height="4.5" rx="2.25" fill="url(#sun)" />
      <Rect x="40" y="76" width="40" height="4" rx="2" fill={colors.primaryLight} />
    </Svg>
  );
}

/** სხივები: ცენტრალური ყველაზე გრძელია, კიდეებისკენ თანდათან მოკლდება. */
const RAYS = [
  { angle: -70, length: 10 },
  { angle: -50, length: 13 },
  { angle: -25, length: 16 },
  { angle: 0, length: 18 },
  { angle: 25, length: 16 },
  { angle: 50, length: 13 },
  { angle: 70, length: 10 },
];

/**
 * სათაურის ქვეშ მოთავსებული დეკორაცია: ორმხრივი ტალღა გულით შუაში.
 */
export function HeartFlourish({ width = 150 }: { width?: number }) {
  return (
    <Svg width={width} height={width * 0.24} viewBox="0 0 150 36">
      <Path
        d="M6 12 C22 12 30 26 44 26 C56 26 62 18 70 14"
        stroke={colors.primaryDark}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M144 12 C128 12 120 26 106 26 C94 26 88 18 80 14"
        stroke={colors.primaryDark}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M75 20 C71 15 65 15 64 20 C63 24 69 28 75 32 C81 28 87 24 86 20 C85 15 79 15 75 20 Z"
        fill="none"
        stroke={colors.primaryDark}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
