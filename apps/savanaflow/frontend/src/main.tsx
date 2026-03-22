import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Import i18n configuration - MUST be imported before App
import './i18n'

// Loading component for Suspense
function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
      fontSize: 14,
      color: '#666'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid #ddd',
          borderTopColor: '#1F4E79',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <div>Chargement...</div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      <App />
    </Suspense>
  </React.StrictMode>
)

// Enregistrement du service worker pour PWA avec support offline complet
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker SavanaFlow enregistré:', registration.scope);
        
        // Vérifier les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nouvelle version disponible - proposer la mise à jour
                console.log('Nouvelle version disponible.');
                
                // Notifier l'utilisateur (peut être connecté à un toast)
                if (window.confirm('Une nouvelle version est disponible. Voulez-vous la charger ?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              }
            });
          }
        });
        
        // Vérifier périodiquement les mises à jour (toutes les heures)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.log('Erreur enregistrement Service Worker:', error);
      });
  });
  
  // Écouter les messages du Service Worker
  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_COMPLETE') {
      console.log('Synchronisation terminée:', event.data.count, 'ventes');
    }
  });
}

// Gestion de la mise à jour du Service Worker
let refreshing = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (!refreshing) {
    refreshing = true;
    window.location.reload();
  }
});

// Gestion de l'état de connexion
window.addEventListener('online', () => {
  console.log('Connexion rétablie');
  // Déclencher la synchronisation des ventes offline
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SYNC_OFFLINE_SALES' });
  }
});

window.addEventListener('offline', () => {
  console.log('Mode hors ligne');
});
