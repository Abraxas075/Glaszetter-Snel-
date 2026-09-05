import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@glaszetter/shared';
import { getMe, login as loginRequest } from '../api/auth';
import { clearToken, getToken, setToken } from '../utils/tokenStorage';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = await getToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const { user: currentUser } = await getMe(storedToken);
        setTokenState(storedToken);
        setUser(currentUser);
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const { user: loggedInUser, token: newToken } = await loginRequest(email, password);
    await setToken(newToken);
    setTokenState(newToken);
    setUser(loggedInUser);
  };

  const logout = async () => {
    await clearToken();
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
