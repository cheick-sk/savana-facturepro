import { create } from 'zustand';
import * as AsyncStorage from '@react-native-async-storage/async-storage';
import * as NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string; // 'invoice', 'sale', 'customer', etc.
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data: any;
  createdAt: number;
  retries: number;
}

export interface OfflineState {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  
  // Actions
  addPendingAction: (action: Omit<OfflineAction, 'id' | 'createdAt' | 'retries'>) => Promise<void>;
  removePendingAction: (id: string) => Promise<void>;
  incrementRetry: (id: string) => Promise<void>;
  syncPendingActions: () => Promise<{ success: number; failed: number }>;
  setOnlineStatus: (isOnline: boolean) => void;
  clearPendingActions: () => Promise<void>;
}

const PENDING_ACTIONS_KEY = '@offline_pending_actions';
const MAX_RETRIES = 3;

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: true,
  pendingActions: [],

  addPendingAction: async (action) => {
    const newAction: OfflineAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      retries: 0,
    };
    
    const { pendingActions } = get();
    const updated = [...pendingActions, newAction];
    
    await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(updated));
    set({ pendingActions: updated });
  },

  removePendingAction: async (id: string) => {
    const { pendingActions } = get();
    const updated = pendingActions.filter(a => a.id !== id);
    
    await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(updated));
    set({ pendingActions: updated });
  },

  incrementRetry: async (id: string) => {
    const { pendingActions } = get();
    const updated = pendingActions.map(a => 
      a.id === id ? { ...a, retries: a.retries + 1 } : a
    );
    
    await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(updated));
    set({ pendingActions: updated });
  },

  syncPendingActions: async () => {
    const { pendingActions, isOnline, removePendingAction, incrementRetry } = get();
    
    if (!isOnline || pendingActions.length === 0) {
      return { success: 0, failed: 0 };
    }
    
    let success = 0;
    let failed = 0;
    
    // Process actions in order (FIFO)
    const sortedActions = [...pendingActions].sort((a, b) => a.createdAt - b.createdAt);
    
    for (const action of sortedActions) {
      if (action.retries >= MAX_RETRIES) {
        await removePendingAction(action.id);
        failed++;
        continue;
      }
      
      try {
        // Import apiClient dynamically to avoid circular deps
        const { apiClient } = await import('../lib/api');
        const client = apiClient('savanaflow'); // Default, should be dynamic
        
        await client.request({
          method: action.method,
          url: action.endpoint,
          data: action.data,
        });
        
        await removePendingAction(action.id);
        success++;
      } catch (error) {
        await incrementRetry(action.id);
        failed++;
      }
    }
    
    return { success, failed };
  },

  setOnlineStatus: (isOnline: boolean) => {
    const wasOffline = !get().isOnline;
    set({ isOnline });
    
    // If we just came back online, try to sync
    if (wasOffline && isOnline) {
      get().syncPendingActions();
    }
  },

  clearPendingActions: async () => {
    await AsyncStorage.removeItem(PENDING_ACTIONS_KEY);
    set({ pendingActions: [] });
  },
}));

// Initialize network listener
export const initNetworkListener = () => {
  NetInfo.addEventListener(state => {
    useOfflineStore.getState().setOnlineStatus(state.isConnected ?? false);
  });
};

// Load pending actions from storage on app start
export const loadPendingActions = async () => {
  try {
    const stored = await AsyncStorage.getItem(PENDING_ACTIONS_KEY);
    if (stored) {
      const actions = JSON.parse(stored) as OfflineAction[];
      useOfflineStore.setState({ pendingActions: actions });
    }
  } catch (error) {
    console.error('Failed to load pending actions:', error);
  }
};
