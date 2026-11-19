import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

import { googleIds as ids } from './googleConfig';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleIdToken(onToken: (idToken: string) => void, onError: (message: string) => void) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: ids.webClientId ?? 'nao-configurado',
    iosClientId: ids.iosClientId,
    androidClientId: ids.androidClientId,
    webClientId: ids.webClientId,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.params.id_token;
      if (token) onToken(token);
      else onError('O Google não retornou a identificação da conta.');
    } else if (response?.type === 'error') {
      onError('Não foi possível entrar com o Google.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return { ready: !!request, prompt: () => promptAsync() };
}
