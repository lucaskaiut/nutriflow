import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, text } from '@/theme/tokens';

type Variant = 'title' | 'heading' | 'subheading' | 'body' | 'label' | 'caption' | 'tiny' | 'number' | 'bigNumber';
type Tone = 'default' | 'secondary' | 'muted' | 'subtle' | 'primary' | 'success' | 'danger' | 'warning' | 'water' | 'inverse';

const variants: Record<Variant, TextStyle> = {
  title: { fontFamily: fonts.heading, fontSize: 24, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.heading, fontSize: 16 },
  subheading: { fontFamily: fonts.bold, fontSize: 14 },
  body: { fontFamily: fonts.regular, fontSize: text.base },
  label: { fontFamily: fonts.semibold, fontSize: 13 },
  caption: { fontFamily: fonts.medium, fontSize: 12 },
  tiny: { fontFamily: fonts.medium, fontSize: 11 },
  number: { fontFamily: fonts.display, fontSize: text.base, fontVariant: ['tabular-nums'] },
  bigNumber: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -1, fontVariant: ['tabular-nums'] },
};

export function Text({ variant = 'body', tone = 'default', weight, size, style, ...props }: TextProps & { variant?: Variant; tone?: Tone; weight?: keyof typeof fonts; size?: number }) {
  const { colors } = useTheme();
  const color = {
    default: colors.text, secondary: colors.textSecondary, muted: colors.textMuted, subtle: colors.textSubtle, primary: colors.primary,
    success: colors.success, danger: colors.danger, warning: colors.warning, water: colors.waterText, inverse: colors.panelText,
  }[tone];

  return <RNText {...props} style={[variants[variant], { color }, weight && { fontFamily: fonts[weight] }, size !== undefined && { fontSize: size }, style]} />;
}
