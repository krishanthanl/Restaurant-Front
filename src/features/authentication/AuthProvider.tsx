import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { apiClient } from '../../services/apiClient';
import { AuthContext } from './useAuth';
import type { AuthUser, LoginResponse } from './authTypes';
import { tokenStore } from './tokenStore';

function expiration(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch { return 0; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [sessionVersion, setSessionVersion] = useState(0);
  const generation = useRef(0);
  const logout = useCallback(() => {
    generation.current += 1;
    tokenStore.clear();
    setUser(null);
    setLoading(false);
    setSessionVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    window.localStorage.removeItem('access_token');
    const onUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [logout]);

  useEffect(() => {
    const token = tokenStore.get();
    const current = generation.current;
    const controller = new AbortController();
    if (!token || expiration(token) <= Date.now()) {
      logout();
      return;
    }
    apiClient.get<AuthUser>('/auth/me', { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted && current === generation.current) setUser(data);
      })
      .catch(() => {
        if (!controller.signal.aborted && current === generation.current) logout();
      })
      .finally(() => {
        if (!controller.signal.aborted && current === generation.current) setLoading(false);
      });
    return () => controller.abort();
  }, [logout]);

  // The server validates the JWT; this timer only avoids showing an expired session in the UI.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) return;
    const remaining = expiration(token) - Date.now();
    if (remaining <= 0) { logout(); return; }
    const timer = window.setTimeout(logout, Math.min(remaining, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [sessionVersion, logout]);

  const login = useCallback(async (username: string, password: string) => {
    const current = ++generation.current;
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { username: username.trim(), password });
    if (current !== generation.current) return;
    tokenStore.set(data.accessToken);
    setUser(data.user);
    setLoading(false);
    setSessionVersion((version) => version + 1);
  }, []);

  return <AuthContext.Provider value={{ user, token: tokenStore.get(), isAuthenticated: !!user,
    isLoading, login, logout }}>{children}</AuthContext.Provider>;
}
