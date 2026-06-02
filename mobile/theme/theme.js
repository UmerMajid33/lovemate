// theme/theme.js — LoveMate design system (dark editorial / premium)
// Single source of truth for color, type, spacing, radius, shadow.
import { Platform } from 'react-native';

export const colors = {
  // base surfaces — near-black charcoal, layered
  bg:        '#0E0E10',
  bgElev:    '#161618',
  surface:   '#1A1A1D',
  surface2:  '#212126',
  hairline:  'rgba(245,241,234,0.08)',
  hairline2: 'rgba(245,241,234,0.14)',

  // warm ivory text
  text:      '#F2EDE4',
  textSoft:  'rgba(242,237,228,0.62)',
  textMuted: 'rgba(242,237,228,0.38)',
  textFaint: 'rgba(242,237,228,0.22)',

  // warm rose accent — editorial but alive
  accent:     '#E0506E',
  accentSoft: '#F08FA0',
  accentDim:  'rgba(224,80,110,0.15)',
  accentLine: 'rgba(224,80,110,0.32)',

  // functional, all muted (no neon)
  gold:    '#C9A86A',
  sage:    '#7FA98C',
  slate:   '#7E8AA0',
  danger:  '#C2615B',

  black:   '#000000',
  white:   '#FFFFFF',
};

// Editorial pairing: serif display + clean system sans.
export const fonts = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' }),
  sans:  Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui, -apple-system, sans-serif' }),
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40 };

export const radius = { sm: 12, md: 16, lg: 20, xl: 26, pill: 100 };

export const shadow = {
  // soft, low, premium — not glowy
  card: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35, shadowRadius: 24, elevation: 8,
  },
  soft: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  accent: {
    shadowColor: '#E0506E', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 18, elevation: 8,
  },
};

// Reusable type ramp. Headings use serif; labels/body use sans.
export const type = {
  display: { fontFamily: fonts.serif, fontSize: 40, color: colors.text, letterSpacing: -0.5, lineHeight: 46 },
  title:   { fontFamily: fonts.serif, fontSize: 28, color: colors.text, letterSpacing: -0.3, lineHeight: 34 },
  heading: { fontFamily: fonts.serif, fontSize: 20, color: colors.text, lineHeight: 26 },
  body:    { fontFamily: fonts.sans, fontSize: 15, color: colors.textSoft, lineHeight: 22 },
  label:   { fontFamily: fonts.sans, fontSize: 13, color: colors.text, fontWeight: '600' },
  // small uppercase tracking — the editorial "kicker"
  kicker:  { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 3 },
  caption: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted },
};

export default { colors, fonts, spacing, radius, shadow, type };
