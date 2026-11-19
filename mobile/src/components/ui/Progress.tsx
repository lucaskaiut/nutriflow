import { StyleSheet, View } from 'react-native';

import { num } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export function ProgressBar({ value, max, color, height = 10 }: { value: number; max: number | null | undefined; color?: string; height?: number }) {
  const { colors } = useTheme();
  const pct = max ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;

  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }} style={[styles.track, { height, backgroundColor: colors.surfaceSunken }]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color ?? colors.primary }]} />
    </View>
  );
}

export function MacroBar({ label, current, target, color, unit = 'g' }: { label: string; current: number | null; target: number | null | undefined; color: string; unit?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.row}>
        <Text variant="caption" tone="secondary">{label}</Text>
        <Text variant="caption" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
          <Text variant="caption" weight="bold">{num(current ?? 0, 0)}</Text>
          {target ? ` / ${num(target, 0)}${unit}` : `${unit} · sem meta`}
        </Text>
      </View>
      <ProgressBar value={current ?? 0} max={target} color={color} height={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
