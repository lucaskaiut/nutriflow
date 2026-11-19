import { useQueryClient } from '@tanstack/react-query';

import { session } from '@/api/client';
import { accountApi } from '@/api/endpoints';
import { keys } from '@/features/queries';
import { useSession } from '@/stores/session';

/**
 * Conclui o login: carrega a conta ANTES de trocar o estado da sessão, para que a navegação
 * vá direto ao destino certo (onboarding ou app) sem desmontar o navegador.
 */
export function useCompleteSignIn() {
  const qc = useQueryClient();
  const signIn = useSession((s) => s.signIn);

  return async (token: string) => {
    session.setToken(token);
    try {
      const { data } = await accountApi.me();
      qc.setQueryData(keys.me, data);
    } catch (e) {
      session.setToken(null);
      throw e;
    }
    await signIn(token);
  };
}
