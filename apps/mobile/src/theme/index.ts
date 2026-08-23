import { Platform } from 'react-native';

/**
 * ერთადერთი წყარო ფერებისა და ზომებისთვის.
 * ეკრანებში hex კოდი პირდაპირ არასდროს იწერება — ყოველთვის აქედან.
 *
 * პალიტრა: სუფთა თეთრი ფონი + მზისფერი ყვითელი აქცენტი.
 */

export const colors = {
  // ფონი — სუფთა თეთრი
  skyTop: '#F5F5F6',
  skyMid: '#F3F3F4',
  skyBottom: '#F1F1F2',
  cloud: '#FFFFFF',

  // აქცენტი — მზე. საბაზისო ტონი ექიმის მიერაა არჩეული (#FFEC4F);
  // დანარჩენი მისგანაა გამოყვანილი. `primaryDeep` განზრახ ბევრად
  // მუქია: ღია ყვითელი ტექსტად თეთრზე საერთოდ არ იკითხება.
  primary: '#FFEC4F',
  primaryDark: '#F0D93A',
  primaryDeep: '#9C7C00',
  primaryLight: '#FFF6A8',
  primarySoft: '#FFFDEB',
  /** ხატულის ველი — ბრენდის მუქი ყვითელი */
  ivory: '#E8D900',
  /** კვადრატის შევსება — ღია ყვითელი */
  tileFill: '#FFF7D1',
  /** მოცისფრო ტონი — ვიზიტის ჯავშანი */
  skyBlue: '#8ECAE6',
  skyBlueDeep: '#6FB6D9',
  skyBlueSoft: '#E7F4FA',
  /** ღია ნაცრისფერი აქცენტი — დოზის კალკულატორი */
  slate: '#B8BCC2',
  slateDeep: '#9AA0A8',
  slateSoft: '#F0F1F3',
  /** ხატულის ნახატი — მკვეთრი ყვითელი */
  iconGlyph: '#1A1A1A',
  /** ნახატის კონტური — ღია ყვითელი ღია ფონზე თორემ იკარგება */
  iconOutline: '#C9A200',
  /** ყვითელი წვრილი ტექსტისთვის — #FFEC4F თეთრზე ძალიან ღიაა */
  primaryText: '#E8A400',

  // ტექსტი — პალიტრა ორფერიანია: ყვითელი აქცენტად, შავი ტექსტად.
  // ნაცრისფრები მხოლოდ იერარქიისთვისაა და ფერს არ ამატებს.
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#9E9E9E',
  /** ბარათის სათაური — ბრენდის მუქი ყვითელი */
  textOnCard: '#E8D900',
  /** მეორეხარისხოვანი ტექსტი — თბილი ნაცრისფერი */
  textSoft: '#8A857A',
  /** ყვითელ ღილაკზე ტექსტი შავია — ყვითელზე თეთრი არ იკითხება */
  textOnPrimary: '#1A1A1A',

  // ზედაპირები
  surface: '#FFFFFF',
  /** ოდნავ ნაცრისფერი ბლოკი — ბარათებისა და ღილაკების გამოსაყოფად.
   *  ყვითელი აქცენტი ფონად აღარ გამოიყენება: ფონი სუფთა თეთრია. */
  surfaceMuted: '#F7F7F7',
  surfaceTranslucent: 'rgba(255, 255, 255, 0.92)',
  border: '#E6E6E6',
  borderFocus: '#FFEC4F',

  // სტატუსები
  danger: '#D92D20',
  /**
   * განვითარების შედეგი — შუქნიშანი.
   *
   * სემანტიკური ფერებია და არა სტილი: მწვანე — რიგზეა, ყვითელი —
   * ვიზიტი სასურველია, წითელი — პედიატრთან მისვლა საჭიროა.
   */
  statusOk: '#2F9E5E',
  statusWatch: '#E8A400',
  statusAlert: '#D92D20',
  dangerSoft: '#FEF3F2',
  success: '#9C7C00',
  warning: '#9C7C00',
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
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
    },
    android: { elevation: 6 },
    default: {},
  }),
  button: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
    },
    android: { elevation: 8 },
    default: {},
  }),
  input: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
    default: {},
  }),
} as const;

export const theme = { colors, spacing, radius, typography, shadows };
