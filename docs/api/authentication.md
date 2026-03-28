# Authentification API

L'API SaaS Africa vous permet d'intégrer nos services dans vos applications. Ce guide explique comment vous authentifier et utiliser l'API.

## Méthodes d'authentification

L'API supporte deux méthodes d'authentification selon votre cas d'usage.

---

### 1. Bearer Token (Utilisateurs connectés)

Pour les applications qui agissent au nom d'un utilisateur connecté.

#### Obtenir un token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "votre_mot_de_passe"
}
```

#### Réponse

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "Jean",
    "last_name": "Dupont",
    "organisation_id": 1
  }
}
```

#### Utiliser le token

```http
GET /api/v1/invoices
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

#### Rafraîchir le token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

### 2. API Key (Intégrations)

Pour les intégrations système et automatisées.

#### Créer une clé API

1. Connectez-vous à votre compte
2. Allez dans **Paramètres > API > Clés API**
3. Cliquez sur **"Nouvelle clé API"**
4. Configurez :
   - Nom de la clé (ex: "Integration CRM")
   - Permissions (scopes)
   - Limite de requêtes
5. Copiez la clé (elle ne sera plus affichée)

#### Utiliser la clé API

```http
GET /api/v1/public/invoices
X-API-Key: fp_live_abc123def456...
```

---

## Permissions (Scopes)

Les API Keys utilisent un système de permissions granulaire.

### Scopes disponibles

| Scope | Description |
|-------|-------------|
| `read:invoices` | Lire les factures |
| `write:invoices` | Créer et modifier les factures |
| `read:customers` | Lire les clients |
| `write:customers` | Créer et modifier les clients |
| `read:products` | Lire les produits |
| `write:products` | Créer et modifier les produits |
| `read:payments` | Lire les paiements |
| `write:payments` | Enregistrer des paiements |
| `read:reports` | Accéder aux rapports |
| `*` | Accès complet (admin) |

### Exemple de configuration

```json
{
  "name": "Integration CRM",
  "scopes": ["read:customers", "write:customers", "read:invoices"]
}
```

---

## Rate Limiting

Les limites de requêtes dépendent de votre plan d'abonnement.

### Limites par plan

| Plan | Requêtes/heure | Requêtes/jour |
|------|----------------|---------------|
| Starter | 1 000 | 10 000 |
| Pro | 5 000 | 50 000 |
| Business | 20 000 | 200 000 |
| Enterprise | Illimité | Illimité |

### Headers de réponse

Chaque réponse inclut les headers suivants :

```http
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4998
X-RateLimit-Reset: 1710489600
```

### Dépassement de limite

Si vous dépassez la limite :

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "rate_limit_exceeded",
  "message": "Vous avez dépassé la limite de requêtes. Réessayez dans 3600 secondes.",
  "retry_after": 3600
}
```

---

## Erreurs courantes

### 401 Unauthorized

```json
{
  "detail": "Invalid API key"
}
```

**Solutions :**
- Vérifiez que la clé est correcte
- Assurez-vous que la clé n'est pas expirée

### 403 Forbidden

```json
{
  "detail": "Missing required scope: write:invoices"
}
```

**Solutions :**
- Vérifiez les permissions de votre clé API
- Contactez l'administrateur pour ajouter le scope

### 404 Not Found

```json
{
  "detail": "Invoice not found"
}
```

**Solutions :**
- Vérifiez l'ID de la ressource
- Assurez-vous que la ressource appartient à votre organisation

---

## Exemples de code

### Python

```python
import requests

API_KEY = "fp_live_abc123..."
BASE_URL = "https://api.saasafrica.com/facturepro"

headers = {"X-API-Key": API_KEY}

# Lister les factures
response = requests.get(f"{BASE_URL}/api/v1/public/invoices", headers=headers)
invoices = response.json()

# Créer une facture
data = {
    "customer_id": 1,
    "items": [
        {"product_id": 1, "quantity": 2, "unit_price": 50000}
    ]
}
response = requests.post(f"{BASE_URL}/api/v1/public/invoices", 
                         headers=headers, json=data)
```

### JavaScript

```javascript
const API_KEY = 'fp_live_abc123...';
const BASE_URL = 'https://api.saasafrica.com/facturepro';

const headers = {
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json'
};

// Lister les factures
const response = await fetch(`${BASE_URL}/api/v1/public/invoices`, { headers });
const invoices = await response.json();

// Créer une facture
const data = {
  customer_id: 1,
  items: [
    { product_id: 1, quantity: 2, unit_price: 50000 }
  ]
};
const createResponse = await fetch(`${BASE_URL}/api/v1/public/invoices`, {
  method: 'POST',
  headers,
  body: JSON.stringify(data)
});
```

### cURL

```bash
# Lister les factures
curl -H "X-API-Key: fp_live_abc123..." \
  https://api.saasafrica.com/facturepro/api/v1/public/invoices

# Créer une facture
curl -X POST \
  -H "X-API-Key: fp_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"customer_id":1,"items":[{"product_id":1,"quantity":2,"unit_price":50000}]}' \
  https://api.saasafrica.com/facturepro/api/v1/public/invoices
```

---

## Prochaines étapes

- [Explorer les endpoints API](./endpoints/invoices.md)
- [Configurer les webhooks](./endpoints/webhooks.md)
- [Télécharger les SDK](../sdks/python.md)
