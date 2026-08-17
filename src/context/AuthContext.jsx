import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { setUnauthorizedHandler } from '../services/api';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)));

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)) return;
    authService
      .me()
      .then((res) => setUser(res.data?.data ?? null))
      .catch(() => clearSession())
      .finally(() => setIsLoading(false));
  }, [clearSession]);

  const login = useCallback(async (credentials) => {
    const res = await authService.login(credentials);
    const { accessToken, user: loggedInUser } = res.data.data;
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await authService.register(payload);
    const { accessToken, user: newUser } = res.data.data;
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const res = await authService.me();
    setUser(res.data?.data ?? null);
    return res.data?.data ?? null;
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
