import { useState, useEffect, useCallback } from 'react';
import { getOfflineSales, removeOfflineSale } from '../lib/offline-db';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSales, setPendingSales] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connexion rétablie');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Mode hors ligne activé');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Charger les ventes en attente au démarrage
    loadPendingSales();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingSales.length > 0) {
      syncOfflineSales();
    }
  }, [isOnline]);

  const loadPendingSales = useCallback(async () => {
    const sales = await getOfflineSales();
    setPendingSales(sales);
  }, []);

  const syncOfflineSales = useCallback(async () => {
    const sales = await getOfflineSales();
    setPendingSales(sales);

    if (sales.length === 0) return;

    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    for (const sale of sales) {
      try {
        await api.post('/sales', sale.saleData);
        await removeOfflineSale(sale.id);
        synced++;
      } catch (error) {
        console.error('Erreur sync:', error);
        failed++;
      }
    }

    setIsSyncing(false);
    
    // Recharger les ventes en attente
    const remainingSales = await getOfflineSales();
    setPendingSales(remainingSales);
    
    if (synced > 0) {
      toast.success(`${synced} vente(s) synchronisée(s)`);
    }
    if (failed > 0) {
      toast.error(`${failed} vente(s) en échec`);
    }
  }, []);

  const forceSync = useCallback(async () => {
    if (!isOnline) {
      toast.error('Pas de connexion internet');
      return;
    }
    await syncOfflineSales();
  }, [isOnline, syncOfflineSales]);

  return {
    isOnline,
    pendingSales,
    isSyncing,
    pendingCount: pendingSales.length,
    sync: forceSync,
    loadPendingSales
  };
}

// Hook pour surveiller l'état de connexion
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
