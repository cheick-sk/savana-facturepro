import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URLS: Record<string, string> = {
  facturepro: 'http://localhost:8001/api/v1',
  savanaflow: 'http://localhost:8003/api/v1',
  schoolflow: 'http://localhost:8002/api/v1',
  // Production URLs
  facturepro_prod: 'https://api.saasafrica.com/facturepro/api/v1',
  savanaflow_prod: 'https://api.saasafrica.com/savanaflow/api/v1',
  schoolflow_prod: 'https://api.saasafrica.com/schoolflow/api/v1',
};

const instances: Record<string, AxiosInstance> = {};

export const apiClient = (app: string): AxiosInstance => {
  if (instances[app]) {
    return instances[app];
  }

  const isProduction = __DEV__ ? false : true;
  const baseUrlKey = isProduction ? `${app}_prod` : app;
  
  const instance = axios.create({
    baseURL: API_BASE_URLS[baseUrlKey] || API_BASE_URLS[app],
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await SecureStore.getItemAsync('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle token refresh
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If 401 and not already retrying
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const refreshToken = await SecureStore.getItemAsync('refresh_token');
          if (refreshToken) {
            const response = await axios.post(
              `${API_BASE_URLS[app]}/auth/refresh`,
              { refresh_token: refreshToken }
            );
            
            const { access_token, refresh_token } = response.data;
            
            await SecureStore.setItemAsync('access_token', access_token);
            await SecureStore.setItemAsync('refresh_token', refresh_token);
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }
            
            return instance(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed - user needs to login again
          await SecureStore.deleteItemAsync('access_token');
          await SecureStore.deleteItemAsync('refresh_token');
          await SecureStore.deleteItemAsync('user');
          // Navigation to login will be handled by auth state
          return Promise.reject(refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );

  instances[app] = instance;
  return instance;
};

// Helper for file uploads
export const uploadFile = async (
  app: string,
  endpoint: string,
  file: Blob,
  fieldName: string = 'file',
  additionalData?: Record<string, string>
): Promise<any> => {
  const formData = new FormData();
  formData.append(fieldName, file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  
  const client = apiClient(app);
  return client.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Offline-first helper
export const offlineRequest = async <T>(
  key: string,
  request: () => Promise<T>,
  getFromCache: () => Promise<T | null>,
  saveToCache: (data: T) => Promise<void>
): Promise<T> => {
  try {
    const data = await request();
    await saveToCache(data);
    return data;
  } catch (error) {
    // Network error, try cache
    const cached = await getFromCache();
    if (cached) {
      return cached;
    }
    throw error;
  }
};
