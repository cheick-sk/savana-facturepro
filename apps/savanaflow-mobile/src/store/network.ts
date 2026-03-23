import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  lastSyncTime: Date | null;
  pendingSyncCount: number;
  setConnected: (connected: boolean) => void;
  setLastSync: (time: Date) => void;
  incrementPendingSync: () => void;
  decrementPendingSync: () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: true,
  isInternetReachable: true,
  lastSyncTime: null,
  pendingSyncCount: 0,

  setConnected: (connected: boolean) => set({ isConnected: connected }),
  setLastSync: (time: Date) => set({ lastSyncTime: time }),
  incrementPendingSync: () => set((state) => ({ 
    pendingSyncCount: state.pendingSyncCount + 1 
  })),
  decrementPendingSync: () => set((state) => ({ 
    pendingSyncCount: Math.max(0, state.pendingSyncCount - 1) 
  })),
}));

// Subscribe to network changes
NetInfo.addEventListener((state) => {
  useNetworkStore.getState().setConnected(state.isConnected ?? false);
});
