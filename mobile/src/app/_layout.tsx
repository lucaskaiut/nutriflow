import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import {
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { ErrorState, ToastHost } from '@/components/ui';
import { useAccount } from '@/features/queries';
import { useReminderSync } from '@/lib/reminders';
import { useSession } from '@/stores/session';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => !(error instanceof ApiError && [401, 403, 404, 422].includes(error.status)) && count < 2,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
    Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold,
  });
  const restore = useSession((s) => s.restore);

  useEffect(() => {
    void restore();
  }, [restore]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>{fontsLoaded ? <Root /> : null}</QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Root() {
  const status = useSession((s) => s.status);
  const signedIn = status === 'signedIn';
  const account = useAccount(signedIn);
  const ready = status === 'signedOut' || (signedIn && (account.isSuccess || account.isError));

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  useEffect(() => {
    if (status === 'signedOut') queryClient.clear(); // nada de dados de outra sessão em cache
  }, [status]);

  useReminderSync(signedIn ? account.data?.preferences : undefined);

  if (!ready) return null;

  const onboarded = !!account.data?.onboarding_completed;

  return (
    <ThemeProvider preference={account.data?.preferences.theme ?? 'system'}>
      <Shell>
        {signedIn && account.isError && !account.data ? (
          <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
            <ErrorState message={account.error instanceof ApiError ? account.error.message : undefined} onRetry={() => account.refetch()} />
          </View>
        ) : (
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Protected guard={!signedIn}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
            <Stack.Protected guard={signedIn && !onboarded}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
            <Stack.Protected guard={signedIn && onboarded}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="foods/search" />
              <Stack.Screen name="foods/[id]" />
              <Stack.Screen name="foods/form" />
              <Stack.Screen name="recipes/[id]" />
              <Stack.Screen name="recipes/form" />
              <Stack.Screen name="saved-meals/index" />
              <Stack.Screen name="saved-meals/form" />
              <Stack.Screen name="meals/[id]" />
              <Stack.Screen name="water" />
              <Stack.Screen name="goals" />
              <Stack.Screen name="reports" />
              <Stack.Screen name="measurements" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="profile-edit" />
            </Stack.Protected>
            {/* termos: no cadastro e dentro do app — nunca durante o onboarding, para não virar o destino dos guards */}
            <Stack.Protected guard={!signedIn || onboarded}>
              <Stack.Screen name="legal" />
            </Stack.Protected>
          </Stack>
        )}
      </Shell>
    </ThemeProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { name, colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      {children}
      <ToastHost />
    </View>
  );
}
