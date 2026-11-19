import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { session } from '@/api/client';

const KEY = 'nutriflow.token';

/** Token guardado no armazenamento seguro do sistema (Keychain / Keystore). */
const storage = {
  async get() {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
    return SecureStore.getItemAsync(KEY);
  },
  async set(value: string | null) {
    if (Platform.OS === 'web') {
      if (value) globalThis.localStorage?.setItem(KEY, value);
      else globalThis.localStorage?.removeItem(KEY);
      return;
    }
    if (value) await SecureStore.setItemAsync(KEY, value);
    else await SecureStore.deleteItemAsync(KEY);
  },
};

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  restore: () => Promise<void>;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  async restore() {
    const token = await storage.get().catch(() => null);
    session.setToken(token);
    set({ status: token ? 'signedIn' : 'signedOut' });
  },
  async signIn(token) {
    session.setToken(token);
    await storage.set(token);
    set({ status: 'signedIn' });
  },
  async signOut() {
    session.setToken(null);
    await storage.set(null).catch(() => undefined);
    set({ status: 'signedOut' });
  },
}));

// Token revogado/expirado: volta para o login.
session.onUnauthorized(() => {
  void useSession.getState().signOut();
});
