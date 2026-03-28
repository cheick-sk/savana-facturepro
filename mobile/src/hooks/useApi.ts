import { useState, useCallback } from 'react';
import { AxiosRequestConfig } from 'axios';
import { api } from '../lib/api';
import { useSyncStore } from '../stores/syncStore';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (config?: AxiosRequestConfig) => Promise<T | null>;
  reset: () => void;
  isOffline: boolean;
}

/**
 * Hook for making API calls with loading and error states
 */
export const useApi = <T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  initialData?: T
): UseApiReturn<T> => {
  const [state, setState] = useState<UseApiState<T>>({
    data: initialData ?? null,
    loading: false,
    error: null,
  });

  const { isOnline } = useSyncStore();

  const execute = useCallback(
    async (config?: AxiosRequestConfig): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        let response: T;

        switch (method) {
          case 'GET':
            response = await api.get<T>(url, config);
            break;
          case 'POST':
            response = await api.post<T>(url, config?.data, config);
            break;
          case 'PUT':
            response = await api.put<T>(url, config?.data, config);
            break;
          case 'PATCH':
            response = await api.patch<T>(url, config?.data, config);
            break;
          case 'DELETE':
            response = await api.delete<T>(url, config);
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        setState({ data: response, loading: false, error: null });
        return response;
      } catch (error: any) {
        const errorMessage = error.message || 'Une erreur est survenue';
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
        return null;
      }
    },
    [url, method]
  );

  const reset = useCallback(() => {
    setState({ data: initialData ?? null, loading: false, error: null });
  }, [initialData]);

  return {
    ...state,
    execute,
    reset,
    isOffline: !isOnline,
  };
};

/**
 * Hook for making a single API call on mount
 */
export const useFetch = <T>(
  url: string,
  options?: {
    immediate?: boolean;
    initialData?: T;
  }
): UseApiReturn<T> & { refetch: () => Promise<T | null> } => {
  const { immediate = true, initialData } = options || {};
  const apiHook = useApi<T>(url, 'GET', initialData);

  const refetch = useCallback(() => apiHook.execute(), [apiHook]);

  // Auto-fetch on mount if immediate is true
  useState(() => {
    if (immediate) {
      apiHook.execute();
    }
  });

  return {
    ...apiHook,
    refetch,
  };
};

/**
 * Hook for paginated API calls
 */
export const usePaginatedApi = <T>(
  url: string,
  pageSize: number = 20
) => {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isOnline } = useSyncStore();

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get<{ items: T[]; total: number; hasMore: boolean }>(
        `${url}?page=${page}&pageSize=${pageSize}`
      );

      setData((prev) => [...prev, ...response.items]);
      setHasMore(response.hasMore);
      setPage((prev) => prev + 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url, page, pageSize, loading, hasMore]);

  const refresh = useCallback(async () => {
    setPage(1);
    setData([]);
    setHasMore(true);
    setLoading(false);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    hasMore,
    isOffline: !isOnline,
    fetchMore,
    refresh,
  };
};

export default useApi;
