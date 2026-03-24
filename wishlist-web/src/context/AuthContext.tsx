import React, { createContext, useEffect, useState, type ReactNode } from 'react';
import { registerAuthClear } from '../api/authSession';
import { fetchCurrentUser } from '../api/usersApi';
import { forgotPasswordRequest, loginRequest, registerRequest, resetPasswordRequest } from '../api/authApi';
import { getAccessToken, removeAccessToken, setAccessToken } from '../utils/storage';
import type { User } from '../types';

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    registerAuthClear(() => setUser(null));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!getAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const u = await fetchCurrentUser();
        if (!cancelled) setUser(u);
      } catch {
        removeAccessToken();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token } = await loginRequest(email, password);
    setAccessToken(access_token);
    const u = await fetchCurrentUser();
    setUser(u);
  };

  const register = async (email: string, password: string) => {
    await registerRequest(email, password);
  };

  const logout = () => {
    removeAccessToken();
    setUser(null);
  };

  const forgotPassword = async (email: string) => {
    await forgotPasswordRequest(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    await resetPasswordRequest(token, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, forgotPassword, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}
