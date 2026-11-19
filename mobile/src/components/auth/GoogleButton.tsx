import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';

import { authApi } from '@/api/endpoints';
import { googleConfigured } from '@/lib/googleConfig';

const GoogleSignIn = lazy(() => import('./GoogleSignIn'));

/** "Continuar com Google" — só aparece (e só carrega o fluxo OAuth) se o app e a API estiverem configurados. */
export function GoogleButton({ termsAccepted }: { termsAccepted?: boolean }) {
  const providers = useQuery({ queryKey: ['auth-providers'], queryFn: async () => (await authApi.providers()).data, staleTime: Infinity, enabled: googleConfigured });
  if (!googleConfigured || !providers.data?.google) return null;
  return (
    <Suspense fallback={null}>
      <GoogleSignIn termsAccepted={termsAccepted} />
    </Suspense>
  );
}
