import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';

/**
 * Session state for the whole app.
 *
 * `status` is deliberately tri-state: on first paint we do not know whether an
 * httpOnly cookie exists, so the app shows a splash instead of flashing the
 * login screen at an already-signed-in user.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ status: 'loading', user: null });

  // Any authenticated request that comes back 401 means the cookie is gone.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession((current) =>
        current.status === 'authenticated' ? { status: 'anonymous', user: null } : current
      );
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Boot: ask the server who we are. 401 is the normal "not signed in" answer.
  useEffect(() => {
    let cancelled = false;

    authApi
      .fetchCurrentUser()
      .then((user) => {
        if (!cancelled) setSession({ status: 'authenticated', user });
      })
      .catch(() => {
        if (!cancelled) setSession({ status: 'anonymous', user: null });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const user = await authApi.login({ email, password });
    setSession({ status: 'authenticated', user });
    return user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const user = await authApi.register({ name, email, password });
    setSession({ status: 'authenticated', user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setSession({ status: 'anonymous', user: null });
    }
  }, []);

  const value = useMemo(
    () => ({ status: session.status, user: session.user, login, register, logout }),
    [session, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
