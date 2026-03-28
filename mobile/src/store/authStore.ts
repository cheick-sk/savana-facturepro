import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../lib/api';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  organisation_id: number;
  organisation_name: string;
  organisation_plan: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  selectedApp: 'facturepro' | 'savanaflow' | 'schoolflow' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  init: () => Promise<void>;
  login: (email: string, password: string, app: string) => Promise<void>;
  logout: () => Promise<void>;
  selectApp: (app: 'facturepro' | 'savanaflow' | 'schoolflow') => void;
  refreshTokens: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  selectedApp: null,
  isLoading: true,
  isAuthenticated: false,

  init: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      const selectedApp = await SecureStore.getItemAsync('selected_app') as 'facturepro' | 'savanaflow' | 'schoolflow' | null;
      const userJson = await SecureStore.getItemAsync('user');
      
      if (token && userJson) {
        const user = JSON.parse(userJson);
        set({ 
          user, 
          token, 
          refreshToken, 
          selectedApp,
          isAuthenticated: true, 
          isLoading: false 
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Init error:', error);
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string, app: string) => {
    try {
      const response = await apiClient(app).post('/auth/login', { email, password });
      const { access_token, refresh_token, user } = response.data;

      await SecureStore.setItemAsync('access_token', access_token);
      await SecureStore.setItemAsync('refresh_token', refresh_token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      await SecureStore.setItemAsync('selected_app', app);

      set({
        user,
        token: access_token,
        refreshToken: refresh_token,
        selectedApp: app as any,
        isAuthenticated: true,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Erreur de connexion');
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('selected_app');
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    set({
      user: null,
      token: null,
      refreshToken: null,
      selectedApp: null,
      isAuthenticated: false,
    });
  },

  selectApp: async (app: 'facturepro' | 'savanaflow' | 'schoolflow') => {
    await SecureStore.setItemAsync('selected_app', app);
    set({ selectedApp: app });
  },

  refreshTokens: async () => {
    const { refreshToken } = get();
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    try {
      const app = await SecureStore.getItemAsync('selected_app') || 'facturepro';
      const response = await apiClient(app).post('/auth/refresh', {
        refresh_token: refreshToken,
      });
      
      const { access_token, refresh_token } = response.data;
      
      await SecureStore.setItemAsync('access_token', access_token);
      await SecureStore.setItemAsync('refresh_token', refresh_token);
      
      set({ token: access_token, refreshToken: refresh_token });
    } catch (error) {
      // Refresh failed, logout user
      get().logout();
      throw error;
    }
  },

  setUser: (user: User) => set({ user }),
}));
