import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AuthTokens, AuthUser } from '../types';

const TOKEN_KEY = 'teavision_tokens';
const USER_KEY = 'teavision_user';
const AUTO_SYNC_KEY = 'teavision_auto_sync';

// In-memory fallback for environments where SecureStore is not supported (e.g. web fallback)
const memoryStore = new Map<string, string>();

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryStore.set(key, value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore localStorage errors
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    console.warn(`[SecureStore] Failed to write key "${key}":`, err);
    memoryStore.set(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fallback to memory
    }
    return memoryStore.get(key) ?? null;
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.warn(`[SecureStore] Failed to read key "${key}":`, err);
    return memoryStore.get(key) ?? null;
  }
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryStore.delete(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.warn(`[SecureStore] Failed to delete key "${key}":`, err);
    memoryStore.delete(key);
  }
}

export const Storage = {
  async saveTokens(tokens: AuthTokens): Promise<void> {
    await setItem(TOKEN_KEY, JSON.stringify(tokens));
  },

  async getTokens(): Promise<AuthTokens | null> {
    const raw = await getItem(TOKEN_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthTokens;
    } catch {
      return null;
    }
  },

  async removeTokens(): Promise<void> {
    await deleteItem(TOKEN_KEY);
  },

  async saveUser(user: AuthUser): Promise<void> {
    await setItem(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<AuthUser | null> {
    const raw = await getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  async removeUser(): Promise<void> {
    await deleteItem(USER_KEY);
  },

  async setAutoSync(enabled: boolean): Promise<void> {
    await setItem(AUTO_SYNC_KEY, enabled ? 'true' : 'false');
  },

  async getAutoSync(): Promise<boolean> {
    const raw = await getItem(AUTO_SYNC_KEY);
    return raw !== 'false'; // default true
  },

  async clearAll(): Promise<void> {
    await deleteItem(TOKEN_KEY);
    await deleteItem(USER_KEY);
    memoryStore.clear();
  },
};

export default Storage;
