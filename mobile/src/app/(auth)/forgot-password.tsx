import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';

import { authApi } from '@/api/endpoints';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button, Input, Text } from '@/components/ui';
import { applyApiErrors } from '@/lib/forms';
import { toast } from '@/stores/toast';

const emailSchema = z.object({ email: z.string().trim().email('Informe um e-mail válido.') });
const resetSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, 'O código tem 6 dígitos.'),
    password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.'),
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, { path: ['password_confirmation'], message: 'As senhas não coincidem.' });

/**
 * Recuperação em duas etapas: e-mail → código de 6 dígitos enviado por e-mail + nova senha.
 */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const first = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });
  const second = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { code: '', password: '', password_confirmation: '' } });

  const requestCode = first.handleSubmit(async ({ email: value }) => {
    try {
      const { message } = await authApi.forgot(value.toLowerCase());
      setEmail(value.toLowerCase());
      if (message) toast.info(message);
    } catch (e) {
      applyApiErrors(e, first.setError, ['email']);
    }
  });

  const reset = second.handleSubmit(async (values) => {
    try {
      await authApi.reset({ email: email!, ...values });
      setDone(true);
    } catch (e) {
      applyApiErrors(e, second.setError, ['code', 'password', 'password_confirmation']);
    }
  });

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (done) {
    return (
      <AuthShell title="Senha redefinida">
        <Text variant="body" tone="secondary">Por segurança, encerramos as sessões abertas. Entre novamente com a nova senha.</Text>
        <Button fullWidth onPress={() => router.replace('/')}>Voltar para o login</Button>
      </AuthShell>
    );
  }

  if (!email) {
    return (
      <AuthShell title="Recuperar senha" subtitle="Enviaremos um código de verificação para o seu e-mail.">
        <Controller control={first.control} name="email" render={({ field }) => (
          <Input label="E-mail" placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" value={field.value} onChangeText={field.onChange} error={first.formState.errors.email?.message} />
        )} />
        <Button fullWidth loading={first.formState.isSubmitting} onPress={() => void requestCode()}>Enviar código</Button>
        <Pressable onPress={back} style={{ alignItems: 'center' }} accessibilityRole="link"><Text variant="caption" tone="primary" weight="bold">Voltar para o login</Text></Pressable>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Criar nova senha" subtitle={`Se houver uma conta para ${email}, você receberá um código de 6 dígitos (válido por 30 minutos).`}>
      <Controller control={second.control} name="code" render={({ field }) => (
        <Input label="Código de verificação" placeholder="000000" keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode"
          value={field.value} onChangeText={(v) => field.onChange(v.replace(/\D/g, ''))} error={second.formState.errors.code?.message} style={{ letterSpacing: 6, fontSize: 18 }} />
      )} />
      <Controller control={second.control} name="password" render={({ field }) => (
        <PasswordInput label="Nova senha" autoComplete="new-password" value={field.value} onChangeText={field.onChange} error={second.formState.errors.password?.message} />
      )} />
      <Controller control={second.control} name="password_confirmation" render={({ field }) => (
        <PasswordInput label="Confirmar nova senha" autoComplete="new-password" value={field.value} onChangeText={field.onChange} error={second.formState.errors.password_confirmation?.message} />
      )} />
      <Button fullWidth loading={second.formState.isSubmitting} onPress={() => void reset()}>Redefinir senha</Button>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable onPress={() => setEmail(null)} accessibilityRole="link"><Text variant="caption" tone="primary" weight="semibold">Trocar e-mail</Text></Pressable>
        <Pressable onPress={() => void requestCode()} accessibilityRole="link"><Text variant="caption" tone="primary" weight="semibold">Reenviar código</Text></Pressable>
      </View>
    </AuthShell>
  );
}
