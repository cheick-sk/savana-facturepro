import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const API_URL = 'http://localhost:8003/api/v1';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  store_id?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  storeId: number | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setStore: (storeId: number) => void;
}

// Helper to safely parse JSON
function safeJsonParse<T>(value: string | null): T | null {
  if (!value || value === 'undefined' || value === 'null') {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  storeId: null,

  login: async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { access_token, user } = response.data;

      if (access_token && user) {
        // Store token securely
        await SecureStore.setItemAsync('auth_token', access_token);
        await SecureStore.setItemAsync('user_data', JSON.stringify(user));

        set({ 
          user, 
          token: access_token,
          storeId: user.store_id || null,
          isLoading: false 
        });

        // Set default auth header
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      } else {
        throw new Error('Invalid login response');
      }

    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Erreur de connexion');
    }
  },

  logout: async () => {
    try {
      // Clear secure storage
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('user_data');
      await SecureStore.deleteItemAsync('store_id');

      // Clear state
      set({ 
        user: null, 
        token: null,
        storeId: null,
        isLoading: false 
      });

      // Clear auth header
      delete axios.defaults.headers.common['Authorization'];

    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userData = await SecureStore.getItemAsync('user_data');

      const user = safeJsonParse<User>(userData);

      if (token && user) {
        // Set default auth header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        set({ 
          user, 
          token,
          storeId: user.store_id || null,
          isLoading: false 
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      set({ isLoading: false });
    }
  },

  setStore: (storeId: number) => {
    set({ storeId });
    SecureStore.setItemAsync('store_id', storeId.toString());
  },
}));
