import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { shortDate } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Text } from './Text';

type Point = { date: string; time?: string | null; value: number };

/** Linha de evolução (peso) a partir de dados reais, com meta opcional tracejada. */
export function LineChart({ points, height = 160, target, compact, formatValue }: { points: Point[]; height?: number; target?: number | null; compact?: boolean; formatValue?: (v: number) => string }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (points.length === 0) {
    return <View style={[styles.empty, { height }]}><Text variant="caption" tone="subtle">Sem registros no período</Text></View>;
  }

  const padX = compact ? 6 : 14;
  const padTop = compact ? 6 : 16;
  const padBottom = compact ? 6 : 22;
  const values = points.map((p) => p.value).concat(target != null && !compact ? [target] : []);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 1) { min -= 0.5; max += 0.5; }
  const span = max - min;
  min -= span * 0.1; max += span * 0.1;

  const times = points.map((p) => new Date(`${p.date}T${p.time ?? '12:00'}:00`).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const x = (t: number) => (t1 === t0 ? width / 2 : padX + ((t - t0) / (t1 - t0)) * (width - padX * 2));
  const y = (v: number) => padTop + (1 - (v - min) / (max - min)) * (height - padTop - padBottom);

  const coords = points.map((p, i) => ({ x: x(times[i]!), y: y(p.value) }));
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  // rótulos do eixo X: primeiro, meio e último — sem repetir data nem sobrepor (mín. 44 px)
  const labelIdx: number[] = [];
  for (const i of points.length <= 1 ? [0] : [0, Math.floor((points.length - 1) / 2), points.length - 1]) {
    const clash = labelIdx.some((j) => points[j]!.date === points[i]!.date || Math.abs(x(times[j]!) - x(times[i]!)) < 44);
    if (!clash) labelIdx.push(i);
  }
  if (points.length > 1 && !labelIdx.includes(points.length - 1)) labelIdx[labelIdx.length - 1] = points.length - 1;

  return (
    <View onLayout={onLayout} style={{ height }} accessibilityLabel={`Gráfico com ${points.length} registros`}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {!compact && [0.15, 0.5, 0.85].map((f) => (
            <Line key={f} x1={padX} x2={width - padX} y1={padTop + f * (height - padTop - padBottom)} y2={padTop + f * (height - padTop - padBottom)} stroke={colors.border} strokeDasharray="3 3" />
          ))}
          {target != null && !compact && (
            <Line x1={padX} x2={width - padX} y1={y(target)} y2={y(target)} stroke={colors.success} strokeWidth={1.5} strokeDasharray="5 4" />
          )}
          {points.length > 1 && <Path d={line} fill="none" stroke={colors.primary} strokeWidth={compact ? 2.5 : 3} strokeLinecap="round" strokeLinejoin="round" />}
          {(compact ? [coords[coords.length - 1]!] : coords).map((c, i, arr) => (
            <Circle key={i} cx={c.x} cy={c.y} r={i === arr.length - 1 ? 4 : 2.5} fill={i === arr.length - 1 ? colors.primary : colors.surface} stroke={i === arr.length - 1 && compact ? colors.surface : colors.primary} strokeWidth={2} />
          ))}
          {!compact && labelIdx.map((i) => (
            <SvgText key={i} x={coords[i]!.x} y={height - 6} fontSize={9} fill={colors.textSubtle} fontFamily={fonts.medium} textAnchor={i === 0 && points.length > 1 ? 'start' : i === points.length - 1 && points.length > 1 ? 'end' : 'middle'}>
              {shortDate(points[i]!.date, false)}
            </SvgText>
          ))}
          {!compact && formatValue && (
            <SvgText x={coords[coords.length - 1]!.x} y={Math.max(10, coords[coords.length - 1]!.y - 10)} fontSize={10} fontFamily={fonts.bold} fill={colors.primary} textAnchor={points.length > 1 ? 'end' : 'middle'}>
              {formatValue(points[points.length - 1]!.value)}
            </SvgText>
          )}
        </Svg>
      )}
    </View>
  );
}

/** Barras diárias vs meta (relatórios). Barras acima da meta em âmbar. */
/**
 * Barras diárias arredondadas vs meta. Barras em tom suave; a mais recente com valor fica destacada
 * (cor sólida + etiqueta com o valor). Barras acima da meta em mostarda.
 */
export function BarChart({ bars, goal, height = 150, color, formatValue }: {
  bars: { label: string; value: number | null; goal?: number | null }[]; goal?: number | null; height?: number; color?: string; formatValue?: (v: number) => string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...bars.map((b) => b.value ?? 0), goal ?? 0) * 1.15;
  const gap = bars.length > 14 ? 3 : 8;
  const barW = width > 0 ? (width - gap * (bars.length - 1)) / bars.length : 0;
  const top = 22;
  const plotH = height - 20;
  const scale = (v: number) => (v / max) * (plotH - top);
  let lastIdx = -1;
  bars.forEach((b, i) => { if (b.value) lastIdx = i; });
  const strong = color ?? colors.primary;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {bars.map((b, i) => {
            const x = i * (barW + gap);
            const h = b.value ? Math.max(scale(b.value), barW) : 0;
            const g = b.goal ?? goal;
            const over = g != null && b.value != null && b.value > g;
            const fill = over ? colors.carbs : i === lastIdx ? strong : colors.primarySofter;
            return (
              <Rect key={`v${i}`} x={x} y={h > 0 ? plotH - h : plotH - 4} width={barW} height={h > 0 ? h : 4} rx={Math.min(barW / 2, 10)}
                fill={h > 0 ? fill : colors.surfaceSunken} />
            );
          })}
          {goal != null && <Line x1={0} x2={width} y1={plotH - scale(goal)} y2={plotH - scale(goal)} stroke={colors.textSubtle} strokeDasharray="3 4" strokeWidth={1.2} />}
          {lastIdx >= 0 && formatValue && (() => {
            const v = bars[lastIdx]!.value!;
            const label = formatValue(v);
            const w = Math.max(40, label.length * 6.4 + 14);
            const cx = Math.min(width - w / 2, Math.max(w / 2, lastIdx * (barW + gap) + barW / 2));
            const y = Math.max(0, plotH - Math.max(scale(v), barW) - 22);
            return (
              <>
                <Rect x={cx - w / 2} y={y} width={w} height={18} rx={9} fill={colors.text} />
                <SvgText x={cx} y={y + 12.5} fontSize={10} fontFamily={fonts.bold} fill={colors.background} textAnchor="middle">{label}</SvgText>
              </>
            );
          })()}
          {bars.map((b, i) => (bars.length <= 10 || i % Math.ceil(bars.length / 7) === 0) && (
            <SvgText key={`l${i}`} x={i === 0 && bars.length > 10 ? 0 : i * (barW + gap) + barW / 2} y={height - 3} fontSize={10} fontFamily={fonts.medium} fill={colors.textMuted}
              textAnchor={i === 0 && bars.length > 10 ? 'start' : 'middle'}>{b.label}</SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
});
