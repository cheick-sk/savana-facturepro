import { create } from 'zustand';

interface SyncItem {
  id: string;
  type: 'invoice' | 'sale' | 'customer' | 'product';
  data: any;
  createdAt: string;
  attempts: number;
}

interface SyncState {
  pendingItems: SyncItem[];
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncErrors: string[];
  
  // Actions
  addToSyncQueue: (type: SyncItem['type'], data: any) => void;
  removeFromQueue: (id: string) => void;
  syncNow: () => Promise<void>;
  clearErrors: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  pendingItems: [],
  isSyncing: false,
  lastSyncAt: null,
  syncErrors: [],

  addToSyncQueue: (type, data) => {
    const item: SyncItem = {
      id: `${type}-${Date.now()}`,
      type,
      data,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    
    set((state) => ({
      pendingItems: [...state.pendingItems, item],
    }));
  },

  removeFromQueue: (id) => {
    set((state) => ({
      pendingItems: state.pendingItems.filter(item => item.id !== id),
    }));
  },

  syncNow: async () => {
    const { pendingItems } = get();
    
    if (pendingItems.length === 0) return;
    
    set({ isSyncing: true, syncErrors: [] });
    
    try {
      // Process each pending item
      for (const item of pendingItems) {
        try {
          // Simulate API call based on type
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Remove from queue on success
          get().removeFromQueue(item.id);
        } catch (error: any) {
          set((state) => ({
            syncErrors: [...state.syncErrors, `Failed to sync ${item.type}: ${error.message}`],
          }));
        }
      }
      
      set({
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
      });
    } catch (error) {
      set({ isSyncing: false });
      throw error;
    }
  },

  clearErrors: () => {
    set({ syncErrors: [] });
  },
}));
