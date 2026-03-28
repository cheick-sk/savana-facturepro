import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@cache_';
const OFFLINE_QUEUE_KEY = '@offline_queue';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number; // in milliseconds
}

export const storage = {
  // Generic cache methods
  async setCache<T>(key: string, data: T, expiryMs: number = 3600000): Promise<void> {
    const cacheKey = CACHE_PREFIX + key;
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: expiryMs,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(item));
  },

  async getCache<T>(key: string): Promise<T | null> {
    const cacheKey = CACHE_PREFIX + key;
    const itemStr = await AsyncStorage.getItem(cacheKey);
    
    if (!itemStr) return null;
    
    try {
      const item: CacheItem<T> = JSON.parse(itemStr);
      const isExpired = Date.now() - item.timestamp > item.expiry;
      
      if (isExpired) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      return item.data;
    } catch {
      return null;
    }
  },

  async clearCache(key: string): Promise<void> {
    const cacheKey = CACHE_PREFIX + key;
    await AsyncStorage.removeItem(cacheKey);
  },

  async clearAllCache(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  },

  // Offline queue methods
  async addToOfflineQueue(item: {
    type: 'invoice' | 'sale' | 'customer' | 'attendance';
    data: any;
  }): Promise<void> {
    const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = queueStr ? JSON.parse(queueStr) : [];
    
    queue.push({
      ...item,
      id: `${item.type}-${Date.now()}`,
      createdAt: new Date().toISOString(),
    });
    
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  },

  async getOfflineQueue(): Promise<any[]> {
    const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return queueStr ? JSON.parse(queueStr) : [];
  },

  async removeFromOfflineQueue(id: string): Promise<void> {
    const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = queueStr ? JSON.parse(queueStr) : [];
    
    const filtered = queue.filter((item: any) => item.id !== id);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  },

  async clearOfflineQueue(): Promise<void> {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  },

  // Generic storage methods
  async setItem(key: string, value: any): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async getItem<T>(key: string): Promise<T | null> {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  // Multi methods
  async multiGet(keys: string[]): Promise<Record<string, any>> {
    const pairs = await AsyncStorage.multiGet(keys);
    const result: Record<string, any> = {};
    pairs.forEach(([key, value]) => {
      result[key] = value ? JSON.parse(value) : null;
    });
    return result;
  },

  async multiSet(items: Record<string, any>): Promise<void> {
    const pairs = Object.entries(items).map(([key, value]) => [
      key,
      JSON.stringify(value),
    ]);
    await AsyncStorage.multiSet(pairs as [string, string][]);
  },
};
