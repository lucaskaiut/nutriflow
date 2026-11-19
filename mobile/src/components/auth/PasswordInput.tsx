import { forwardRef, useState } from 'react';
import { Pressable, TextInput } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { Input, type InputProps } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export const PasswordInput = forwardRef<React.ComponentRef<typeof TextInput>, InputProps>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();
  return (
    <Input
      ref={ref}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      placeholder="••••••••"
      right={
        <Pressable onPress={() => setVisible((v) => !v)} accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'} hitSlop={8}>
          {visible ? <EyeOff size={16} color={colors.textSubtle} /> : <Eye size={16} color={colors.textSubtle} />}
        </Pressable>
      }
      {...props}
    />
  );
});
