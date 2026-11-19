/**
 * Client IDs públicos do Google (OAuth) por plataforma — não são segredos.
 * Sem eles (ou com o login Google desligado na API) o botão não é exibido.
 * Fica separado de `google.ts` para que as telas de acesso não carreguem o expo-auth-session
 * (e o módulo nativo expo-application) quando o Google não está configurado.
 */
export const googleIds = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};

export const googleConfigured = !!(googleIds.webClientId || googleIds.iosClientId || googleIds.androidClientId);
