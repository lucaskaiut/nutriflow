import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';

import { authApi } from '@/api/endpoints';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button, Input, Text } from '@/components/ui';
import { applyApiErrors } from '@/lib/forms';
import { useCompleteSignIn } from '@/lib/auth';

const schema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});
type Form = z.infer<typeof schema>;

export default function LoginScreen() {
  const signIn = useCompleteSignIn();
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const submit = handleSubmit(async (values) => {
    try {
      const { data } = await authApi.login(values.email.toLowerCase(), values.password);
      await signIn(data.token);
    } catch (e) {
      applyApiErrors(e, setError, ['email', 'password']);
    }
  });

  return (
    <AuthShell title="Acesse sua conta">
      <Controller control={control} name="email" render={({ field }) => (
        <Input label="E-mail" placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress"
          value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.email?.message} />
      )} />
      <Controller control={control} name="password" render={({ field }) => (
        <PasswordInput label="Senha" autoComplete="current-password" textContentType="password" value={field.value} onChangeText={field.onChange}
          onBlur={field.onBlur} error={errors.password?.message} onSubmitEditing={() => void submit()} returnKeyType="go" />
      )} />
      <View style={{ alignItems: 'flex-end' }}>
        <Link href="/forgot-password" asChild>
          <Pressable accessibilityRole="link" hitSlop={6}><Text variant="caption" tone="primary" weight="semibold">Esqueci minha senha</Text></Pressable>
        </Link>
      </View>
      <Button fullWidth loading={isSubmitting} onPress={() => void submit()}>Entrar</Button>
      <GoogleButton />
      <View style={{ flexDirection: 'row', gap: 4, paddingTop: 4 }}>
        <Text variant="caption" tone="muted">Não tem uma conta?</Text>
        <Pressable onPress={() => router.push('/register')} accessibilityRole="link"><Text variant="caption" tone="primary" weight="bold">Criar conta</Text></Pressable>
      </View>
    </AuthShell>
  );
}
