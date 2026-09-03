import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeStorage } from '../utils/safeStorage';
import { apiClient } from '../api/apiClient';

export interface UserProfile {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
  industryId?: string;
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: { name: string; email: string; password: string; role?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await safeStorage.getItem('@auth_token');
        const storedUser = await safeStorage.getItem('@user_data');
        if (storedToken && storedUser) {
          const parsedUser: UserProfile = JSON.parse(storedUser);
          // Safety check for persisted SuperAdmin session
          if (parsedUser.role === 'superAdmin') {
            await safeStorage.removeItem('@auth_token');
            await safeStorage.removeItem('@user_data');
          } else {
            setToken(storedToken);
            setUser(parsedUser);
          }
        }
      } catch (e) {
        console.error('Error loading stored auth state:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;

    // Strict SuperAdmin restriction for Mobile App
    if (newUser?.role === 'superAdmin') {
      const err: any = new Error(
        'SuperAdmin access is restricted to the Web Portal. Please use the Web app to access SuperAdmin features.'
      );
      err.isSuperAdminRestriction = true;
      throw err;
    }

    setToken(newToken);
    setUser(newUser);
    await safeStorage.setItem('@auth_token', newToken);
    await safeStorage.setItem('@user_data', JSON.stringify(newUser));
  };

  const signup = async (payload: { name: string; email: string; password: string; role?: string }) => {
    const response = await apiClient.post('/auth/signup', payload);
    const { token: newToken, user: newUser } = response.data;

    if (newUser?.role === 'superAdmin') {
      const err: any = new Error(
        'SuperAdmin access is restricted to the Web Portal. Please use the Web app to access SuperAdmin features.'
      );
      err.isSuperAdminRestriction = true;
      throw err;
    }

    setToken(newToken);
    setUser(newUser);
    await safeStorage.setItem('@auth_token', newToken);
    await safeStorage.setItem('@user_data', JSON.stringify(newUser));
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await safeStorage.removeItem('@auth_token');
    await safeStorage.removeItem('@user_data');
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
