import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, text } from '@/theme/tokens';
import { Text } from './Text';

export type InputProps = TextInputProps & { label?: string; error?: string; helper?: string; left?: ReactNode; right?: ReactNode; suffix?: string };

export const Input = forwardRef<React.ComponentRef<typeof TextInput>, InputProps>(function Input({ label, error, helper, left, right, suffix, style, editable = true, ...props }, ref) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      {label && <Text variant="label" tone="secondary">{label}</Text>}
      <View
        style={[
          styles.field,
          { backgroundColor: editable ? colors.surface : colors.surfaceSunken, borderColor: error ? colors.danger : colors.border },
        ]}
      >
        {left && <View style={styles.adorn}>{left}</View>}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textSubtle}
          editable={editable}
          accessibilityLabel={label}
          {...props}
          style={[styles.input, { color: colors.text, paddingLeft: left ? 4 : 16, paddingRight: right || suffix ? 4 : 16 }, style]}
        />
        {suffix && <Text variant="caption" tone="subtle" style={styles.suffix}>{suffix}</Text>}
        {right && <View style={styles.adorn}>{right}</View>}
      </View>
      {error ? <Text variant="caption" tone="danger" weight="medium">{error}</Text> : helper ? <Text variant="caption" tone="muted">{helper}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6, alignSelf: 'stretch' },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.md, minHeight: 50 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: text.base, paddingVertical: 10 },
  adorn: { paddingHorizontal: 12 },
  suffix: { paddingRight: 14 },
});
