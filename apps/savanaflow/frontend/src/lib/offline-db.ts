import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SavanaFlowDB extends DBSchema {
  offlineSales: {
    key: string;
    value: {
      id: string;
      saleData: any;
      createdAt: Date;
      synced: boolean;
    };
  };
  products: {
    key: number;
    value: {
      id: number;
      name: string;
      barcode: string | null;
      sell_price: number;
      stock_quantity: number;
      category_id: number | null;
      syncedAt: Date;
    };
    indexes: { 'by-barcode': string };
  };
  customers: {
    key: number;
    value: {
      id: number;
      name: string;
      phone: string | null;
      loyalty_points: number;
    };
  };
}

const DB_NAME = 'savanaflow-offline';
const DB_VERSION = 1;

export async function getDB(): Promise<IDBPDatabase<SavanaFlowDB>> {
  return openDB<SavanaFlowDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store pour les ventes offline
      if (!db.objectStoreNames.contains('offlineSales')) {
        db.createObjectStore('offlineSales', { keyPath: 'id' });
      }
      
      // Store pour les produits (cache local)
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('barcode', 'barcode');
      }
      
      // Store pour les clients
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }
    },
  });
}

// Sauvegarder une vente offline
export async function saveOfflineSale(saleData: any): Promise<string> {
  const db = await getDB();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await db.put('offlineSales', {
    id,
    saleData,
    createdAt: new Date(),
    synced: false
  });
  
  return id;
}

// Récupérer toutes les ventes offline
export async function getOfflineSales(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('offlineSales');
}

// Supprimer une vente syncée
export async function removeOfflineSale(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('offlineSales', id);
}

// Cache des produits pour recherche offline
export async function cacheProducts(products: any[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('products', 'readwrite');
  
  for (const product of products) {
    await tx.store.put({
      ...product,
      syncedAt: new Date()
    });
  }
  
  await tx.done;
}

// Recherche produit par barcode (offline)
export async function findProductByBarcode(barcode: string): Promise<any | undefined> {
  const db = await getDB();
  return db.getFromIndex('products', 'barcode', barcode);
}

// Récupérer tous les produits (offline)
export async function getCachedProducts(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('products');
}

// Cache des clients pour recherche offline
export async function cacheCustomers(customers: any[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('customers', 'readwrite');
  
  for (const customer of customers) {
    await tx.store.put(customer);
  }
  
  await tx.done;
}

// Récupérer tous les clients (offline)
export async function getCachedCustomers(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('customers');
}

// Vérifier si on est en mode offline
export function isOffline(): boolean {
  return !navigator.onLine;
}

// Obtenir le nombre de ventes en attente
export async function getPendingSalesCount(): Promise<number> {
  const db = await getDB();
  return db.count('offlineSales');
}

// Vider le cache des produits
export async function clearProductsCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('products', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

// Vider toutes les données offline
export async function clearAllOfflineData(): Promise<void> {
  const db = await getDB();
  
  const salesTx = db.transaction('offlineSales', 'readwrite');
  await salesTx.store.clear();
  await salesTx.done;
  
  const productsTx = db.transaction('products', 'readwrite');
  await productsTx.store.clear();
  await productsTx.done;
  
  const customersTx = db.transaction('customers', 'readwrite');
  await customersTx.store.clear();
  await customersTx.done;
}
