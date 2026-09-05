'use client';

import { AuthProvider } from '../contexts/AuthContext';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);
