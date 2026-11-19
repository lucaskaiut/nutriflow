import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, tint, type TintName } from '@/theme/tokens';

type Variant = 'default' | 'flat' | 'primary' | 'water' | 'panel' | TintName;

/** Superfície arredondada. As variantes pastel agrupam um assunto (calorias, água, refeição…). */
export function Card({ children, variant = 'default', onPress, style, padded = true, accessibilityLabel }: {
  children: ReactNode; variant?: Variant; onPress?: () => void; style?: StyleProp<ViewStyle>; padded?: boolean; accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const bg = {
    default: colors.surface,
    flat: colors.surfaceMuted,
    primary: colors.primarySoft,
    water: colors.tintSky,
    panel: colors.panel,
  }[variant as string] ?? tint(colors, variant as TintName);
  const content = [styles.card, { backgroundColor: bg }, padded && styles.padded, style];

  if (!onPress) return <View style={content}>{children}</View>;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [...content, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl },
  padded: { padding: 18 },
  pressed: { opacity: 0.85 },
});
