import { create } from 'zustand';
import { apiGet, apiPost, type User } from '../lib/api';

const STORAGE_KEY = 'co-code-auth';

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  hydrate: () => Promise<void>;
};

function loadStoredAuth(): { user: User | null; token: string | null } {
  if (typeof window === 'undefined') {
    return { user: null, token: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { user: null, token: null };
    }
    const parsed = JSON.parse(raw) as { user: User; token: string };
    return { user: parsed.user ?? null, token: parsed.token ?? null };
  } catch {
    return { user: null, token: null };
  }
}

function persistAuth(user: User | null, token: string | null) {
  if (typeof window === 'undefined') return;

  if (!user || !token) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ user, token })
  );
}

export const useAuthStore = create<AuthState>((set, get) => {
  const stored = loadStoredAuth();

  return {
    user: stored.user,
    token: stored.token,
    loading: false,
    error: null,
    setAuth: (user, token) => {
      persistAuth(user, token);
      set({ user, token, error: null });
    },
    clearAuth: () => {
      persistAuth(null, null);
      set({ user: null, token: null, error: null });
    },
    login: async (email, password) => {
      set({ loading: true, error: null });
      try {
        const data = await apiPost<{ user: User; token: string }>(
          '/auth/login',
          { email, password }
        );
        get().setAuth(data.user, data.token);
      } catch (error) {
        set({ error: (error as Error).message });
        throw error;
      } finally {
        set({ loading: false });
      }
    },
    register: async (name, email, password) => {
      set({ loading: true, error: null });
      try {
        const data = await apiPost<{ user: User; token: string }>(
          '/auth/register',
          { name, email, password }
        );
        get().setAuth(data.user, data.token);
      } catch (error) {
        set({ error: (error as Error).message });
        throw error;
      } finally {
        set({ loading: false });
      }
    },
    hydrate: async () => {
      const token = get().token;
      if (!token) return;

      set({ loading: true, error: null });
      try {
        const data = await apiGet<{ user?: User; agent?: User }>(
          '/auth/me',
          token
        );
        if (data.user) {
          get().setAuth(data.user, token);
        }
      } catch (error) {
        get().clearAuth();
        set({ error: (error as Error).message });
      } finally {
        set({ loading: false });
      }
    },
  };
});
