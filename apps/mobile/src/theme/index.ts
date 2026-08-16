import { Platform } from 'react-native';

/**
 * ერთადერთი წყარო ფერებისა და ზომებისთვის.
 * ეკრანებში hex კოდი პირდაპირ არასდროს იწერება — ყოველთვის აქედან.
 *
 * პალიტრა: სუფთა თეთრი ფონი + მზისფერი ყვითელი აქცენტი.
 */

export const colors = {
  // ფონი — სუფთა თეთრი
  skyTop: '#FFFFFF',
  skyMid: '#FFFFFF',
  skyBottom: '#FFFFFF',
  cloud: '#FFFFFF',

  // აქცენტი — მზე
  primary: '#FFCE1F',
  primaryDark: '#F5B800',
  primaryDeep: '#E8A400',
  primaryLight: '#FFE08A',
  primarySoft: '#FFF6DC',

  // ტექსტი
  textPrimary: '#2E2A22',
  textSecondary: '#8A8072',
  textMuted: '#BFB4A2',
  /** ყვითელ ღილაკზე ტექსტი მუქია — ყვითელზე თეთრი არ იკითხება */
  textOnPrimary: '#3A3020',

  // ზედაპირები
  surface: '#FFFFFF',
  surfaceTranslucent: 'rgba(255, 255, 255, 0.92)',
  border: '#E6E6E6',
  borderFocus: '#FFCE1F',

  // სტატუსები
  danger: '#E5484D',
  dangerSoft: '#FDF2F2',
  success: '#12A150',
  warning: '#F5A524',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/**
 * ქართული ტექსტი ლათინურზე ოდნავ მაღალია — line-height-ს დამატებით ვუშვებთ,
 * რომ ასოების თავები არ იჭრებოდეს.
 */
export const typography = {
  h1: { fontSize: 28, lineHeight: 40, fontWeight: '700' as const },
  h2: { fontSize: 22, lineHeight: 32, fontWeight: '700' as const },
  h3: { fontSize: 18, lineHeight: 28, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 26, fontWeight: '400' as const },
  bodyMedium: { fontSize: 16, lineHeight: 26, fontWeight: '600' as const },
  caption: { fontSize: 14, lineHeight: 22, fontWeight: '400' as const },
  small: { fontSize: 12, lineHeight: 18, fontWeight: '400' as const },
} as const;

/** რბილი, თბილი ჩრდილები — მკვეთრი კიდეების გარეშე. */
export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#8A6D3B',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
    },
    android: { elevation: 6 },
    default: {},
  }),
  button: Platform.select({
    ios: {
      shadowColor: '#E8A400',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
    },
    android: { elevation: 8 },
    default: {},
  }),
  input: Platform.select({
    ios: {
      shadowColor: '#8A6D3B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
    default: {},
  }),
} as const;

export const theme = { colors, spacing, radius, typography, shadows };
