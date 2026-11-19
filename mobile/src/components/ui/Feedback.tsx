import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, CheckCircle2, Info, RefreshCw } from 'lucide-react-native';

import { useToastStore } from '@/stores/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

export function ToastHost() {
  const { toast, dismiss } = useToastStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!toast) return null;

  const icon = { success: <CheckCircle2 size={18} color="#8CCFA6" />, info: <Info size={18} color="#D3CFC6" />, error: <AlertCircle size={18} color="#F2A097" /> }[toast.type];

  return (
    <View pointerEvents="box-none" style={[styles.toastWrap, { top: insets.top + 8 }]}>
      <Pressable
        onPress={dismiss}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: toast.type === 'error' ? '#4A1814' : colors.toast }]}
      >
        {icon}
        <Text variant="caption" weight="medium" style={{ color: '#FFFFFF', flex: 1 }}>{toast.text}</Text>
      </Pressable>
    </View>
  );
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: { icon?: ReactNode; title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
      {icon ? <View style={styles.emptyIcon}>{icon}</View> : null}
      <Text variant="heading" size={16} style={styles.centerText}>{title}</Text>
      <Text variant="caption" tone="muted" style={[styles.centerText, { maxWidth: 280, lineHeight: 17 }]}>{description}</Text>
      {actionLabel && onAction && <Button variant="secondary" size="sm" onPress={onAction} style={{ marginTop: 8 }}>{actionLabel}</Button>}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder }]}>
      <AlertCircle size={26} color={colors.danger} />
      <Text variant="subheading" style={styles.centerText}>Não foi possível carregar</Text>
      <Text variant="caption" tone="muted" style={styles.centerText}>{message ?? 'Verifique sua conexão e tente novamente.'}</Text>
      {onRetry && <Button variant="outline" size="sm" icon={<RefreshCw size={14} color={colors.textSecondary} />} onPress={onRetry}>Tentar novamente</Button>}
    </View>
  );
}

/** Bloco pulsante para skeleton loaders. */
export function Skeleton({ height, width = '100%', rounded = radius.lg }: { height: number; width?: number | `${number}%`; rounded?: number }) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={{ height, width, borderRadius: rounded, backgroundColor: colors.skeleton, opacity }} />;
}

export function SkeletonList({ type }: { type: 'dashboard' | 'meals' | 'recipes' | 'list' }) {
  if (type === 'dashboard') {
    return (
      <View style={{ gap: 16 }} accessibilityLabel="Carregando">
        <Skeleton height={44} /><Skeleton height={200} /><Skeleton height={150} /><Skeleton height={140} />
      </View>
    );
  }
  const h = type === 'recipes' ? 120 : type === 'meals' ? 112 : 64;
  return (
    <View style={{ gap: 12 }} accessibilityLabel="Carregando">
      {type === 'meals' && <Skeleton height={56} />}
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={h} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000, elevation: 1000 },
  toast: { width: '90%', maxWidth: 380, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.lg, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, elevation: 6 },
  empty: { alignItems: 'center', padding: 24, borderRadius: radius.lg, borderWidth: 1, gap: 6 },
  emptyIcon: { marginBottom: 4 },
  centerText: { textAlign: 'center' },
});
