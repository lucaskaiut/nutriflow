import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Check, ChevronRight, Minus, Plus } from 'lucide-react-native';

import { num } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Text } from './Text';

/** Seletor −/+ (quantidade, porções, rendimento). */
export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, decimals = 1, label }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; decimals?: number; label?: string }) {
  const { colors } = useTheme();
  const round = (v: number) => Math.round(v * 1000) / 1000;
  const canDec = value - step >= min - 1e-9;
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Diminuir ${label ?? ''}`} disabled={!canDec} onPress={() => onChange(round(Math.max(min, value - step)))}
        style={[styles.stepBtn, { backgroundColor: colors.surfaceSunken, borderColor: colors.surfaceSunken, opacity: canDec ? 1 : 0.4 }]}>
        <Minus size={16} color={colors.textSecondary} />
      </Pressable>
      <Text variant="number" size={18} style={styles.stepValue} accessibilityLabel={label}>{num(value, decimals)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Aumentar ${label ?? ''}`} disabled={value + step > max} onPress={() => onChange(round(Math.min(max, value + step)))}
        style={[styles.stepBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        <Plus size={16} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

/** Abas segmentadas (Todas / Favoritas / Recentes; filtros de período). */
export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string; icon?: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceSunken }]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable key={o.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onChange(o.id)}
            style={[styles.segment, active && { backgroundColor: colors.primary }]}>
            {o.icon}
            <Text variant="caption" weight="semibold" style={{ color: active ? colors.onPrimary : colors.textMuted }} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Pílulas roláveis (categorias). */
export function ChipRow<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} accessibilityRole="button" accessibilityState={{ selected: active }}
            style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surface }]}>
            <Text variant="caption" weight="semibold" style={{ color: active ? colors.onPrimary : colors.textMuted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Cartão selecionável (tipo de refeição, objetivo, nível de atividade). */
export function OptionTile({ selected, onPress, title, subtitle, icon, compact }: { selected: boolean; onPress: () => void; title: string; subtitle?: string; icon?: ReactNode; compact?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }}
      style={[styles.tile, compact && styles.tileCompact, {
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.tintSky : colors.surface,
      }]}>
      {icon && <View>{icon}</View>}
      <View style={{ flex: 1 }}>
        <Text variant="caption" weight="bold">{title}</Text>
        {subtitle ? <Text variant="tiny" tone="muted" style={{ marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {selected && !compact && (
        <View style={[styles.check, { backgroundColor: colors.primary }]}><Check size={12} color={colors.onPrimary} strokeWidth={3} /></View>
      )}
    </Pressable>
  );
}

export function SwitchRow({ title, subtitle, value, onChange, disabled }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.switchRow, { backgroundColor: colors.surface }]}>
      <View style={{ flex: 1 }}>
        <Text variant="caption" weight="bold">{title}</Text>
        {subtitle && <Text variant="tiny" tone="subtle" style={{ marginTop: 2 }}>{subtitle}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor={colors.white} accessibilityLabel={title} />
    </View>
  );
}

/** Linha de menu com ícone e chevron (Perfil, Configurações). */
export function MenuRow({ icon, title, subtitle, onPress, tone = 'default', right }: { icon: ReactNode; title: string; subtitle?: string; onPress: () => void; tone?: 'default' | 'danger'; right?: ReactNode }) {
  const { colors } = useTheme();
  const danger = tone === 'danger';
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [styles.menuRow, {
        backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
        borderColor: colors.border,
      }]}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? colors.dangerSoft : colors.surfaceSunken }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" weight="bold" tone={danger ? 'danger' : 'default'}>{title}</Text>
        {subtitle && <Text variant="tiny" tone="subtle" style={{ marginTop: 2 }}>{subtitle}</Text>}
      </View>
      {right ?? <ChevronRight size={16} color={colors.textSubtle} />}
    </Pressable>
  );
}

/** Agrupa linhas de menu numa única superfície, separadas por linhas finas. */
export function MenuGroup({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.menuGroup, { backgroundColor: colors.surface }]}>
      <View style={{ marginBottom: -StyleSheet.hairlineWidth }}>{children}</View>
    </View>
  );
}

export function IconButton({ icon, onPress, label, variant = 'muted', size = 32 }: { icon: ReactNode; onPress: () => void; label: string; variant?: 'muted' | 'plain' | 'primary'; size?: number }) {
  const { colors } = useTheme();
  const bg = { muted: colors.surface, plain: 'transparent', primary: colors.primarySoft }[variant];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, opacity: pressed ? 0.7 : 1 }]}>
      {icon}
    </Pressable>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="caption" tone="muted" weight="semibold">{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 40, textAlign: 'center' },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: radius.full, gap: 4 },
  segment: { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 6, borderRadius: radius.full },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1.5 },
  tileCompact: { padding: 10, borderRadius: radius.md },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  menuIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  menuGroup: { borderRadius: radius.xl, overflow: 'hidden' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 4 },
});
