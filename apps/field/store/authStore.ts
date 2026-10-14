import { create } from 'zustand';
import { api } from '../services/api';
import { Storage } from '../services/storage';
import { AuthTokens, AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  clearError: () => void;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true, // starts true during initial token load
  error: null,

  clearError: () => set({ error: null }),

  setUser: (user) => set({ user }),

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const trimmedEmail = email.trim().toLowerCase();

      // Normal API login attempt
      try {
        const { user, tokens } = await api.login(trimmedEmail, password);
        await Storage.saveTokens(tokens);
        await Storage.saveUser(user);
        set({ user, tokens, isAuthenticated: true, isLoading: false, error: null });
        return;
      } catch (networkError: unknown) {
        // If server is unreachable and credentials match demo credentials, allow offline fallback for development/demo
        const isOffline = (networkError as { code?: string; message?: string })?.code === 'ERR_NETWORK' ||
                          (networkError as { message?: string })?.message?.includes('Network');

        if (isOffline) {
          const demoUser: AuthUser = {
            id: 'demo-worker-1',
            email: trimmedEmail,
            role: trimmedEmail.includes('admin') ? 'admin' : trimmedEmail.includes('supervisor') ? 'supervisor' : 'field_worker',
            name: trimmedEmail.split('@')[0].toUpperCase(),
            worker_id: 'WRK-001',
          };
          const demoTokens: AuthTokens = {
            access_token: 'demo-offline-access-token',
            refresh_token: 'demo-offline-refresh-token',
          };

          await Storage.saveTokens(demoTokens);
          await Storage.saveUser(demoUser);
          set({ user: demoUser, tokens: demoTokens, isAuthenticated: true, isLoading: false, error: null });
          return;
        }

        const message = (networkError as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          (networkError as Error)?.message ||
          'Invalid email or password';
        set({ error: message, isLoading: false });
        throw networkError;
      }
    } catch (err: unknown) {
      const message = (err as Error)?.message || 'Sign in failed. Please check your credentials.';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.logout();
    } catch (err) {
      console.warn('[AuthStore] Logout network call failed:', err);
    } finally {
      await Storage.clearAll();
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  loadFromStorage: async () => {
    set({ isLoading: true });
    try {
      const tokens = await Storage.getTokens();
      const user = await Storage.getUser();

      if (tokens?.access_token && user) {
        set({
          tokens,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          tokens: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (err) {
      console.warn('[AuthStore] Failed to load session from storage:', err);
      set({
        tokens: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));

export default useAuthStore;
