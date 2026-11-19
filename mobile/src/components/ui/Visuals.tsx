import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Text } from './Text';

/** Anel de progresso (ex.: calorias do dia vs. meta). Acima de 100% o arco fica completo. */
export function RingGauge({ value, max, size = 120, stroke = 12, color, track, children }: {
  value: number; max: number | null | undefined; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={{ width: size, height: size }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? colors.surface} strokeWidth={stroke} fill="none" />
        {pct > 0 && (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color ?? colors.primary} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

/** Barras verticais em pílula com o valor numa "bolha" no topo do preenchimento (macros, água). */
export function PillBars({ items, height = 150 }: { items: { label: string; value: number | null; max: number | null | undefined; display: string; color: string; track?: string }[]; height?: number }) {
  const { colors } = useTheme();
  const bubble = 42;
  return (
    <View style={styles.pills}>
      {items.map((it) => {
        const pct = it.max ? Math.max(0, Math.min(1, (it.value ?? 0) / it.max)) : 0;
        const fill = bubble + pct * (height - bubble);
        return (
          <View key={it.label} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessibilityLabel={`${it.label}: ${it.display}`}>
            <View style={[styles.pillTrack, { height, backgroundColor: it.track ?? colors.surfaceSunken }]}>
              <View style={[styles.pillFill, { height: fill, backgroundColor: it.color }]}>
                <View style={[styles.bubble, { width: bubble - 6, height: bubble - 6, backgroundColor: colors.surface }]}>
                  <Text variant="tiny" weight="bold" numberOfLines={1} adjustsFontSizeToFit>{it.display}</Text>
                </View>
              </View>
            </View>
            <Text variant="caption" tone="muted" numberOfLines={1}>{it.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Faixa de 7 dias em pílulas verticais; o dia selecionado fica preenchido. */
export function WeekStrip({ days, selected, onSelect, marked }: { days: { date: string; weekday: string; day: string }[]; selected: string; onSelect: (d: string) => void; marked?: (d: string) => boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.week} accessibilityRole="tablist">
      {days.map((d) => {
        const active = d.date === selected;
        return (
          <Pressable key={d.date} onPress={() => onSelect(d.date)} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={`${d.weekday} ${d.day}`}
            style={[styles.dayPill, { backgroundColor: active ? colors.primary : colors.surface }]}>
            <Text variant="caption" weight="semibold" style={{ color: active ? colors.onPrimary : colors.textMuted }}>{d.weekday}</Text>
            <View style={[styles.dot, { backgroundColor: marked?.(d.date) ? (active ? colors.accent : colors.primary) : 'transparent' }]} />
            <Text variant="heading" style={{ color: active ? colors.onPrimary : colors.text }}>{d.day}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', gap: 10 },
  pillTrack: { width: '100%', maxWidth: 52, borderRadius: radius.full, justifyContent: 'flex-end', overflow: 'hidden' },
  pillFill: { width: '100%', borderRadius: radius.full, alignItems: 'center', paddingTop: 3 },
  bubble: { borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  week: { flexDirection: 'row', gap: 6 },
  dayPill: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: radius.full },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
