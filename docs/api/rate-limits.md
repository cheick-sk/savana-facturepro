# Limites de Taux (Rate Limits)

Ce guide détaille les limitations de requêtes applicables à l'API SaaS Africa.

## Vue d'ensemble

Les limites de taux protègent notre infrastructure et garantissent un service équitable pour tous les utilisateurs.

## Limites par plan

| Plan | Requêtes/heure | Requêtes/minute |
|------|----------------|-----------------|
| **Starter** | 1 000 | 50 |
| **Pro** | 5 000 | 200 |
| **Business** | 20 000 | 500 |
| **Enterprise** | Illimité* | Illimité* |

*Sous réserve d'une utilisation raisonnable

## En-têtes de réponse

Chaque réponse API inclut des en-têtes indiquant votre consommation :

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4987
X-RateLimit-Reset: 1705312800
```

### Description des en-têtes

| En-tête | Description |
|---------|-------------|
| `X-RateLimit-Limit` | Nombre maximum de requêtes par heure |
| `X-RateLimit-Remaining` | Requêtes restantes dans la fenêtre actuelle |
| `X-RateLimit-Reset` | Timestamp Unix de la réinitialisation |

## Dépassement de limite

### Réponse d'erreur

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 3600

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 3600 seconds.",
    "details": {
      "limit": 5000,
      "remaining": 0,
      "reset_at": "2024-01-15T11:00:00Z"
    }
  }
}
```

### Gestion côté client

```javascript
async function apiCall(url, options) {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    const resetTime = response.headers.get('X-RateLimit-Reset');
    const waitTime = (resetTime * 1000) - Date.now();
    
    console.log(`Rate limit exceeded. Waiting ${waitTime/1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Retry the request
    return apiCall(url, options);
  }
  
  return response;
}
```

## Limites par endpoint

Certaines opérations ont des limites spécifiques :

### Authentification

| Endpoint | Limite |
|----------|--------|
| `POST /auth/login` | 10/minute |
| `POST /auth/refresh` | 60/heure |
| `POST /auth/password/reset` | 5/heure |

### Création de documents

| Endpoint | Limite |
|----------|--------|
| `POST /invoices` | 100/minute |
| `POST /quotes` | 100/minute |
| `POST /customers` | 200/minute |

### Export de données

| Endpoint | Limite |
|----------|--------|
| `GET /export/*` | 10/heure |
| `GET /reports/*` | 30/heure |

## Stratégies de gestion

### Backoff exponentiel

Implémentez un backoff exponentiel pour les erreurs 429 :

```python
import time
import requests

def api_call_with_retry(url, max_retries=5):
    for attempt in range(max_retries):
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            return response.json()
        
        if response.status_code == 429:
            wait_time = (2 ** attempt) + 1  # 1, 3, 5, 9, 17 seconds
            time.sleep(wait_time)
            continue
        
        response.raise_for_status()
    
    raise Exception("Max retries exceeded")
```

### Mise en cache

Réduisez les appels API en mettant en cache les données statiques :

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCached(url) {
  const cached = cache.get(url);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const response = await fetch(url, { headers });
  const data = await response.json();
  
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}
```

### Pagination

Utilisez la pagination pour limiter les données transférées :

```http
GET /invoices?page=1&per_page=50
```

## Monitoring

### Surveiller votre consommation

**Paramètres > API > Utilisation**

| Métrique | Valeur |
|----------|--------|
| Requêtes aujourd'hui | 1 245 |
| Requêtes ce mois | 28 456 |
| % du quota utilisé | 57% |

### Alertes de quota

Configurez des alertes pour être notifié :
- À 80% du quota
- À 95% du quota
- À 100% du quota

## Bonnes pratiques

### Optimisation des requêtes

- ✅ **Utilisez la pagination** pour les listes
- ✅ **Filtrez côté serveur** avec les paramètres de requête
- ✅ **Mettez en cache** les données qui changent peu
- ✅ **Regroupez les opérations** quand c'est possible
- ✅ **Évitez les requêtes redondantes**

### Exemple : Récupération efficace

**❌ Mauvais :** Récupérer toutes les factures, puis filtrer

```javascript
// Inefficient
const allInvoices = await fetch('/invoices');
const unpaid = allInvoices.filter(inv => inv.status === 'unpaid');
```

**✅ Bon :** Filtrer côté serveur

```javascript
// Efficient
const unpaid = await fetch('/invoices?status=unpaid');
```

### Batch operations

Pour les opérations en masse, utilisez les endpoints batch :

```http
POST /customers/batch
Content-Type: application/json

{
  "customers": [
    { "name": "Client 1", "email": "client1@example.com" },
    { "name": "Client 2", "email": "client2@example.com" },
    { "name": "Client 3", "email": "client3@example.com" }
  ]
}
```

## Augmenter vos limites

### Passer à un plan supérieur

Si vous atteignez régulièrement les limites :

1. Consultez **Paramètres > Abonnement**
2. Sélectionnez un plan supérieur
3. Les nouvelles limites s'appliquent immédiatement

### Plan Enterprise

Pour des besoins spécifiques :
- Limites personnalisées
- SLA garanti
- Support dédié

Contactez : enterprise@saasafrica.com

---

[← Authentification](./authentication.md) | [Endpoints Invoices →](./endpoints/invoices.md)
