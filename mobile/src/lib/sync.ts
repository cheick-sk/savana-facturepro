import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { storage } from './storage';
import { api } from './api';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

interface SyncOptions {
  app: 'facturepro' | 'savanaflow' | 'schoolflow';
  onStatusChange?: (status: SyncStatus) => void;
  onError?: (error: Error) => void;
}

class SyncManager {
  private isOnline: boolean = true;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    NetInfo.addEventListener((state: NetInfoState) => {
      this.isOnline = state.isConnected ?? false;
      this.notifyListeners();
      
      if (this.isOnline) {
        this.syncPendingItems();
      }
    });
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isOnline); // Initial call
    return () => this.listeners.delete(listener);
  }

  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  // Add item to sync queue
  async addToQueue(type: string, data: any): Promise<void> {
    await storage.addToOfflineQueue({ type, data } as any);
  }

  // Sync pending items when online
  async syncPendingItems(): Promise<void> {
    if (!this.isOnline) return;

    const queue = await storage.getOfflineQueue();
    
    for (const item of queue) {
      try {
        await this.syncItem(item);
        await storage.removeFromOfflineQueue(item.id);
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
      }
    }
  }

  private async syncItem(item: any): Promise<void> {
    const { type, data } = item;
    
    switch (type) {
      case 'invoice':
        await api.post('facturepro', '/invoices', data);
        break;
      case 'sale':
        await api.post('savanaflow', '/sales', data);
        break;
      case 'customer':
        await api.post('facturepro', '/customers', data);
        break;
      case 'attendance':
        await api.post('schoolflow', '/attendance', data);
        break;
      default:
        console.warn(`Unknown sync type: ${type}`);
    }
  }

  // Force sync all items
  async forceSync(options?: SyncOptions): Promise<SyncStatus> {
    const { onStatusChange, onError } = options || {};
    
    if (!this.isOnline) {
      onStatusChange?.('error');
      onError?.(new Error('No internet connection'));
      return 'error';
    }

    onStatusChange?.('syncing');
    
    try {
      await this.syncPendingItems();
      onStatusChange?.('success');
      return 'success';
    } catch (error) {
      onStatusChange?.('error');
      onError?.(error as Error);
      return 'error';
    }
  }
}

export const syncManager = new SyncManager();

// Hook for network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(syncManager.getNetworkStatus());
  
  React.useEffect(() => {
    return syncManager.subscribe(setIsOnline);
  }, []);
  
  return isOnline;
}

import React from 'react';
