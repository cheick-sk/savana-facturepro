import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { authStorage } from '@/lib/auth';

export function useAuth() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    selectApp,
    selectedApp,
    loadStoredAuth,
  } = useAuthStore();

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadStoredAuth();
      setIsInitialized(true);
    };
    init();
  }, [loadStoredAuth]);

  const checkAuth = useCallback(async () => {
    const storedToken = await authStorage.getAccessToken();
    return !!storedToken;
  }, []);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    isInitialized,
    selectedApp,
    login,
    logout,
    register,
    selectApp,
    checkAuth,
  };
}
