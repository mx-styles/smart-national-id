import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface User {
  id: number;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: 'citizen' | 'staff' | 'admin';
  national_id?: string;
  phone?: string;
  phone_number?: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string; data?: any }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updateProfile: (profileData: any) => Promise<void>;
  isAdmin: () => boolean;
  isAuthenticated: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_BASE_URL}/auth/me`);
          setUser(response.data);
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await axios.post(`${API_BASE_URL}/auth/login`, formData);
      const { access_token, user: userData } = response.data;

      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData: any): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
      toast.success('Registration successful! Please log in.');
      return { success: true, data: response.data };
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = (): void => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    toast.info('You have been logged out');
  };

  const updateUser = (userData: Partial<User>): void => {
    setUser(prevUser => prevUser ? { ...prevUser, ...userData } : null);
  };

  const updateProfile = async (profileData: any): Promise<void> => {
    try {
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData);
      setUser(response.data);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to update profile';
      throw new Error(message);
    }
  };

  const isAdmin = (): boolean => {
    return !!(user && (user.role === 'admin' || user.role === 'staff'));
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    updateProfile,
    isAdmin,
    isAuthenticated: !!token && !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};