import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { apiClient, logoutSession, refreshSession } from '../../services/apiClient';
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
  const identityRequest = useRef<Promise<void> | null>(null);
  const clearLocalSession = useCallback(() => {
    generation.current += 1;
    tokenStore.clear();
    setUser(null);
    setLoading(false);
    setSessionVersion((version) => version + 1);
  }, []);
  const expireLocalSession = useCallback(() => {
    window.sessionStorage.setItem('auth_notice', 'Your session expired. Please sign in again.');
    clearLocalSession();
  }, [clearLocalSession]);

  useEffect(() => {
    let disposed = false;
    const reloadIdentity = () => {
      if (!tokenStore.get() || identityRequest.current) return;
      const current = generation.current;
      identityRequest.current = apiClient.get<AuthUser>('/auth/me').then(({ data }) => {
        if (!disposed && current === generation.current && tokenStore.get()) setUser(data);
      }).catch(async (error: unknown) => {
        if (disposed || current !== generation.current || !isAxiosError(error) || error.response?.status !== 401) return;
        // /auth/me deliberately bypasses the shared session interceptor.
        if (!tokenStore.getCsrf()) { expireLocalSession(); return; }
        try {
          const session = await refreshSession();
          if (!disposed && current === generation.current) setUser(session.user);
        } catch {
          if (!disposed && current === generation.current) expireLocalSession();
        }
      })
        .finally(() => { identityRequest.current = null; });
    };
    const onVisible = () => { if (document.visibilityState === 'visible') reloadIdentity(); };
    window.addEventListener('focus', reloadIdentity);
    window.addEventListener('auth:forbidden', reloadIdentity);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      window.removeEventListener('focus', reloadIdentity);
      window.removeEventListener('auth:forbidden', reloadIdentity);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [expireLocalSession]);
  const logout = useCallback(() => {
    void logoutSession();
    clearLocalSession();
  }, [clearLocalSession]);

  useEffect(() => {
    window.localStorage.removeItem('access_token');
    const onUnauthorized = () => clearLocalSession();
    const onRefreshed = (event: Event) => {
      setUser((event as CustomEvent<AuthUser>).detail);
      setSessionVersion((version) => version + 1);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    window.addEventListener('auth:session-refreshed', onRefreshed);
    return () => {
      window.removeEventListener('auth:unauthorized', onUnauthorized);
      window.removeEventListener('auth:session-refreshed', onRefreshed);
    };
  }, [clearLocalSession]);

  useEffect(() => {
    const token = tokenStore.get();
    const hadSession = Boolean(token || tokenStore.getCsrf());
    const current = generation.current;
    const controller = new AbortController();
    const restore = async () => {
      try {
        if (!token || expiration(token) <= Date.now()) {
          if (!tokenStore.getCsrf()) { clearLocalSession(); return; }
          const session = await refreshSession();
          if (!controller.signal.aborted && current === generation.current) setUser(session.user);
          return;
        }
        const { data } = await apiClient.get<AuthUser>('/auth/me', { signal: controller.signal });
        if (!controller.signal.aborted && current === generation.current) setUser(data);
      } catch {
        if (!controller.signal.aborted && current === generation.current)
          (hadSession ? expireLocalSession : clearLocalSession)();
      } finally {
        if (!controller.signal.aborted && current === generation.current) setLoading(false);
      }
    };
    void restore();
    return () => controller.abort();
  }, [clearLocalSession, expireLocalSession]);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token || !user) return;
    const remaining = expiration(token) - Date.now() - 60_000;
    const refresh = () => void refreshSession().catch(expireLocalSession);
    if (remaining <= 0) { refresh(); return; }
    const timer = window.setTimeout(refresh, Math.min(remaining, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [sessionVersion, user, expireLocalSession]);

  const login = useCallback(async (username: string, password: string) => {
    const current = ++generation.current;
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { username: username.trim(), password });
    if (current !== generation.current) return;
    tokenStore.setSession(data.accessToken, data.csrfToken);
    setUser(data.user);
    setLoading(false);
    setSessionVersion((version) => version + 1);
  }, []);

  const hasPermission = useCallback((permission: string) => user?.permissions.includes(permission) ?? false, [user]);

  return <AuthContext.Provider value={{ user, token: tokenStore.get(), isAuthenticated: !!user,
    isLoading, login, logout, hasPermission }}>{children}</AuthContext.Provider>;
}
