import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  businessId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  selectedApp: 'facturepro' | 'savanaflow' | 'schoolflow' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  selectApp: (app: 'facturepro' | 'savanaflow' | 'schoolflow') => void;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  selectedApp: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful login
      const user: User = {
        id: '1',
        name: 'Amadou Diallo',
        email: email,
        phone: '+221 77 123 45 67',
        businessId: 'business-1',
      };
      const token = 'mock-jwt-token';
      
      // Store securely
      await SecureStore.setItemAsync('access_token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const user: User = {
        id: Date.now().toString(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        businessId: 'business-' + Date.now(),
      };
      const token = 'mock-jwt-token';
      
      await SecureStore.setItemAsync('access_token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('selected_app');
    } catch (error) {
      console.error('Error clearing secure store:', error);
    }
    
    set({
      user: null,
      token: null,
      selectedApp: null,
      isAuthenticated: false,
    });
  },

  selectApp: (app) => {
    SecureStore.setItemAsync('selected_app', app);
    set({ selectedApp: app });
  },

  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const userStr = await SecureStore.getItemAsync('user');
      const selectedApp = await SecureStore.getItemAsync('selected_app') as AuthState['selectedApp'];
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({
          user,
          token,
          selectedApp: selectedApp || null,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    }
  },
}));
