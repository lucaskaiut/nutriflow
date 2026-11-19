import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

/** Moldura das telas de acesso: marca em texto, título e formulário direto sobre o fundo. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <View style={[styles.brand, { backgroundColor: colors.tintMint }]}>
            <Text variant="title" size={20} style={{ color: colors.onTint }}>NutriFlow</Text>
            <Text variant="caption" style={{ color: colors.onTint }}>Diário alimentar, receitas por porção e evolução do peso.</Text>
            <View style={styles.dots}>
              {[colors.tintSky, colors.tintLilac, colors.tintButter].map((c) => <View key={c} style={[styles.dot, { backgroundColor: c }]} />)}
            </View>
          </View>
          <View style={styles.header}>
            <Text variant="title" size={26}>{title}</Text>
            {subtitle ? <Text variant="body" tone="muted">{subtitle}</Text> : null}
          </View>
          <View style={{ gap: 14 }}>{children}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24 },
  inner: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 28 },
  header: { gap: 6 },
  brand: { borderRadius: 28, padding: 22, gap: 6, overflow: 'hidden' },
  dots: { position: 'absolute', right: -18, top: -18, flexDirection: 'row', gap: 6 },
  dot: { width: 56, height: 56, borderRadius: 28, opacity: 0.9 },
});
