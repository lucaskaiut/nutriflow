import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Text } from './Text';

/** Bottom sheet do protótipo: alça, título/subtítulo, botão fechar e corpo rolável. */
export function Sheet({ visible, onClose, title, subtitle, children, footer }: {
  visible: boolean; onClose: () => void; title?: string; subtitle?: string; children: ReactNode; footer?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
          <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 12) }]} accessibilityViewIsModal>
            <View style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
            </View>
            {(title || subtitle) && (
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={styles.flex}>
                  {title && <Text variant="heading" size={16}>{title}</Text>}
                  {subtitle && <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>{subtitle}</Text>}
                </View>
                <CloseButton onPress={onClose} />
              </View>
            )}
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            {footer && <View style={styles.footer}>{footer}</View>}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Modal central (ex.: registrar peso), como o Modal do protótipo. */
export function Dialog({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={[styles.center, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
          <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityViewIsModal>
            <View style={[styles.dialogHeader, { borderBottomColor: colors.border }]}>
              <Text variant="heading" size={16} style={styles.flex}>{title}</Text>
              <CloseButton onPress={onClose} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function CloseButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8} style={[styles.close, { backgroundColor: colors.surfaceSunken }]}>
      <X size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, maxHeight: '92%', overflow: 'hidden' },
  handleArea: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 24, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  body: { padding: 24, gap: 16 },
  footer: { paddingHorizontal: 24, paddingTop: 8 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 440, borderRadius: radius.xxl, borderWidth: 1, padding: 24, maxHeight: '85%' },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, marginBottom: 16, borderBottomWidth: 1 },
});
