/**
 * SavanaFlow POS Service Worker
 * Enables offline functionality for point-of-sale operations
 * Supports: offline sales, product search, customer lookup, sync on reconnect
 */

const CACHE_VERSION = 'savanaflow-v2';
const STATIC_CACHE = 'savanaflow-static-v2';
const DYNAMIC_CACHE = 'savanaflow-dynamic-v2';
const API_CACHE = 'savanaflow-api-v2';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API routes to cache
const CACHEABLE_APIS = [
  '/api/v1/products',
  '/api/v1/categories',
  '/api/v1/customers',
  '/api/v1/stores',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(key => !key.includes(CACHE_VERSION))
          .map(key => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  
  // Take control immediately
  self.clients.claim();
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    // For POST/PUT/DELETE, try network first, queue if offline
    if (isApiRequest(url)) {
      event.respondWith(handleMutationRequest(request));
    }
    return;
  }
  
  // API requests - Network first with cache fallback
  if (isApiRequest(url)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }
  
  // Static assets - Cache first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // Other requests - Network first
  event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
});

// Check if request is to API
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

// Check if request is for static asset
function isStaticAsset(url) {
  const extensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return extensions.some(ext => url.pathname.endsWith(ext)) || url.pathname === '/';
}

// Network first strategy with cache fallback
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone and cache the response
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API requests
    if (isApiRequest(new URL(request.url))) {
      return new Response(
        JSON.stringify({ 
          error: 'offline', 
          message: 'Vous êtes hors ligne. Cette action sera synchronisée ultérieurement.',
          offline: true 
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Cache first strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response);
      }
    }).catch(() => {});
    
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    return new Response('Offline', { status: 503 });
  }
}

// Handle mutation requests (POST, PUT, DELETE)
async function handleMutationRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Network failed - queue for later sync
    if (request.url.includes('/sales')) {
      await queueOfflineSale(request);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Vente enregistrée hors ligne. Synchronisation en cours...',
          offline: true,
          queued: true
        }),
        { 
          status: 202,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'offline', 
        message: 'Impossible d\'effectuer cette action hors ligne.' 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// Queue offline sale in IndexedDB
async function queueOfflineSale(request) {
  const body = await request.clone().json();
  
  // Open IndexedDB
  const db = await openOfflineDB();
  
  // Add to offline sales store
  const tx = db.transaction('offlineSales', 'readwrite');
  const store = tx.objectStore('offlineSales');
  
  const offlineSale = {
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    saleData: body,
    createdAt: new Date().toISOString(),
    synced: false,
    attempts: 0
  };
  
  await store.add(offlineSale);
  
  // Register for background sync
  if ('sync' in self.registration) {
    await self.registration.sync.register('sync-offline-sales');
  }
  
  return offlineSale.id;
}

// Open IndexedDB for offline data
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('savanaflow-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Offline sales store
      if (!db.objectStoreNames.contains('offlineSales')) {
        const salesStore = db.createObjectStore('offlineSales', { keyPath: 'id' });
        salesStore.createIndex('synced', 'synced');
        salesStore.createIndex('createdAt', 'createdAt');
      }
      
      // Cached products store
      if (!db.objectStoreNames.contains('products')) {
        const productsStore = db.createObjectStore('products', { keyPath: 'id' });
        productsStore.createIndex('barcode', 'barcode');
        productsStore.createIndex('categoryId', 'category_id');
      }
      
      // Cached customers store
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }
    };
  });
}

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-sales') {
    event.waitUntil(syncOfflineSales());
  }
});

// Sync offline sales to server
async function syncOfflineSales() {
  console.log('[SW] Starting offline sales sync...');
  
  const db = await openOfflineDB();
  const tx = db.transaction('offlineSales', 'readwrite');
  const store = tx.objectStore('offlineSales');
  const index = store.index('synced');
  
  // Get all unsynced sales
  const unsyncedSales = await new Promise((resolve) => {
    const request = index.getAll(IDBKeyRange.only(false));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });
  
  console.log(`[SW] Found ${unsyncedSales.length} offline sales to sync`);
  
  let synced = 0;
  let failed = 0;
  
  for (const sale of unsyncedSales) {
    try {
      const response = await fetch('/api/v1/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale.saleData)
      });
      
      if (response.ok) {
        // Mark as synced
        sale.synced = true;
        sale.syncedAt = new Date().toISOString();
        await store.put(sale);
        synced++;
        
        // Notify client
        await notifySyncProgress(sale.id, 'synced');
      } else {
        sale.attempts += 1;
        await store.put(sale);
        failed++;
      }
    } catch (error) {
      console.error('[SW] Sync failed for sale:', sale.id, error);
      sale.attempts += 1;
      await store.put(sale);
      failed++;
    }
  }
  
  console.log(`[SW] Sync complete: ${synced} synced, ${failed} failed`);
  
  // Notify all clients
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      synced,
      failed
    });
  });
}

// Notify sync progress
async function notifySyncProgress(saleId, status) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SALE_SYNCED',
      saleId,
      status
    });
  });
}

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: true
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'SavanaFlow', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  const action = event.action;
  
  let url = '/';
  
  if (data.url) {
    url = data.url;
  } else if (data.sale_id) {
    url = `/sales/${data.sale_id}`;
  } else if (data.product_id) {
    url = `/products/${data.product_id}`;
  }
  
  if (action === 'view' && data.id) {
    url = `${url}/${data.id}`;
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});

// Message event from clients
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_PRODUCTS':
      cacheProducts(payload.products);
      break;
      
    case 'CACHE_CUSTOMERS':
      cacheCustomers(payload.customers);
      break;
      
    case 'GET_OFFLINE_SALES':
      getOfflineSales().then(sales => {
        event.source.postMessage({
          type: 'OFFLINE_SALES',
          sales
        });
      });
      break;
      
    case 'FORCE_SYNC':
      syncOfflineSales();
      break;
  }
});

// Cache products in IndexedDB
async function cacheProducts(products) {
  const db = await openOfflineDB();
  const tx = db.transaction('products', 'readwrite');
  const store = tx.objectStore('products');
  
  for (const product of products) {
    product.cachedAt = new Date().toISOString();
    await store.put(product);
  }
  
  console.log(`[SW] Cached ${products.length} products`);
}

// Cache customers in IndexedDB
async function cacheCustomers(customers) {
  const db = await openOfflineDB();
  const tx = db.transaction('customers', 'readwrite');
  const store = tx.objectStore('customers');
  
  for (const customer of customers) {
    customer.cachedAt = new Date().toISOString();
    await store.put(customer);
  }
  
  console.log(`[SW] Cached ${customers.length} customers`);
}

// Get offline sales from IndexedDB
async function getOfflineSales() {
  const db = await openOfflineDB();
  const tx = db.transaction('offlineSales', 'readonly');
  const store = tx.objectStore('offlineSales');
  
  return new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });
}

console.log('[SW] SavanaFlow Service Worker loaded');
