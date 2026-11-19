import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'water' | 'accent';
type Size = 'sm' | 'md' | 'lg';

export function Button({
  children, onPress, variant = 'primary', size = 'md', icon, iconRight, loading, disabled, fullWidth, style, accessibilityLabel,
}: {
  children?: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary, border: 'transparent' },
    secondary: { bg: colors.primarySoft, pressed: colors.primarySofter, fg: colors.primary, border: 'transparent' },
    outline: { bg: colors.surface, pressed: colors.surfaceMuted, fg: colors.text, border: colors.border },
    accent: { bg: colors.accent, pressed: colors.accent, fg: colors.onAccent, border: 'transparent' },
    ghost: { bg: 'transparent', pressed: colors.surfaceSunken, fg: colors.textMuted, border: 'transparent' },
    danger: { bg: colors.dangerSoft, pressed: colors.dangerSoft, fg: colors.danger, border: 'transparent' },
    water: { bg: colors.surface, pressed: colors.waterSoft, fg: colors.waterText, border: colors.waterBorder },
  }[variant];
  const dims = { sm: { h: 38, px: 14, fs: 13 }, md: { h: 48, px: 20, fs: 14 }, lg: { h: 56, px: 24, fs: 16 } }[size];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { minHeight: dims.h, paddingHorizontal: dims.px, backgroundColor: pressed ? palette.pressed : palette.bg, borderColor: palette.border },
        fullWidth && styles.full,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <View style={styles.row}>
          {icon}
          {children !== undefined && (
            <Text style={{ color: palette.fg, fontSize: dims.fs, fontFamily: size === 'lg' || variant === 'secondary' ? fonts.bold : fonts.semibold }} numberOfLines={1}>
              {children}
            </Text>
          )}
          {iconRight}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  full: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
});
