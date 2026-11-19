import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { z } from 'zod';

import { authApi } from '@/api/endpoints';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button, Input, Text } from '@/components/ui';
import { applyApiErrors } from '@/lib/forms';
import { useCompleteSignIn } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome.').max(255),
    email: z.string().trim().email('Informe um e-mail válido.'),
    password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.'),
    password_confirmation: z.string(),
    accept_terms: z.boolean().refine((v) => v, 'É preciso aceitar os termos para criar a conta.'),
  })
  .refine((v) => v.password === v.password_confirmation, { path: ['password_confirmation'], message: 'As senhas não coincidem.' });
type Form = z.infer<typeof schema>;

export default function RegisterScreen() {
  const signIn = useCompleteSignIn();
  const { colors } = useTheme();
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', password_confirmation: '', accept_terms: false },
  });

  const termsAccepted = useWatch({ control, name: 'accept_terms' });

  const submit = handleSubmit(async (values) => {
    try {
      const { data } = await authApi.register({ ...values, email: values.email.toLowerCase() });
      await signIn(data.token);
    } catch (e) {
      applyApiErrors(e, setError, ['name', 'email', 'password', 'password_confirmation', 'accept_terms']);
    }
  });

  return (
    <AuthShell title="Criar conta">
      <Controller control={control} name="name" render={({ field }) => (
        <Input label="Nome completo" placeholder="Seu nome" autoComplete="name" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />
      )} />
      <Controller control={control} name="email" render={({ field }) => (
        <Input label="E-mail" placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={field.value} onChangeText={field.onChange} error={errors.email?.message} />
      )} />
      <Controller control={control} name="password" render={({ field }) => (
        <PasswordInput label="Senha" autoComplete="new-password" textContentType="newPassword" value={field.value} onChangeText={field.onChange} error={errors.password?.message} helper="Mínimo de 8 caracteres." />
      )} />
      <Controller control={control} name="password_confirmation" render={({ field }) => (
        <PasswordInput label="Confirmar senha" autoComplete="new-password" value={field.value} onChangeText={field.onChange} error={errors.password_confirmation?.message} />
      )} />
      <Controller control={control} name="accept_terms" render={({ field }) => (
        <View style={{ gap: 4 }}>
          <Pressable onPress={() => field.onChange(!field.value)} accessibilityRole="checkbox" accessibilityState={{ checked: field.value }} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, marginTop: 1, alignItems: 'center', justifyContent: 'center', borderColor: field.value ? colors.primary : colors.borderStrong, backgroundColor: field.value ? colors.primary : colors.surface }}>
              {field.value && <Check size={13} color={colors.onPrimary} strokeWidth={3} />}
            </View>
            <Text variant="caption" tone="muted" style={{ flex: 1, lineHeight: 17 }}>
              Li e concordo com os Termos de Uso e a Política de Privacidade, incluindo o tratamento dos meus dados de saúde.
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/legal')} accessibilityRole="link" style={{ marginLeft: 30 }} hitSlop={6}>
            <Text variant="caption" tone="primary" weight="semibold" style={{ textDecorationLine: 'underline' }}>Ler os termos e a política</Text>
          </Pressable>
          {errors.accept_terms && <Text variant="caption" tone="danger">{errors.accept_terms.message}</Text>}
        </View>
      )} />
      <Button fullWidth loading={isSubmitting} onPress={() => void submit()}>Criar minha conta</Button>
      <GoogleButton termsAccepted={termsAccepted} />
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <Text variant="caption" tone="muted">Já possui uma conta?</Text>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="link"><Text variant="caption" tone="primary" weight="bold">Fazer login</Text></Pressable>
      </View>
    </AuthShell>
  );
}
