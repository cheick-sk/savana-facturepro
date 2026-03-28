# API Customers

Ce guide détaille les endpoints de l'API pour la gestion des clients.

## Vue d'ensemble

L'API Customers permet de :
- Gérer votre base de clients
- Synchroniser avec d'autres systèmes
- Accéder aux informations de facturation

## Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/customers` | Liste des clients |
| `POST` | `/customers` | Créer un client |
| `GET` | `/customers/{id}` | Détails d'un client |
| `PUT` | `/customers/{id}` | Modifier un client |
| `DELETE` | `/customers/{id}` | Supprimer un client |
| `GET` | `/customers/{id}/invoices` | Factures du client |
| `GET` | `/customers/{id}/payments` | Paiements du client |

## Lister les clients

### Requête

```http
GET /customers?page=1&per_page=50&search=entreprise
Authorization: Bearer YOUR_TOKEN
```

### Paramètres de requête

| Paramètre | Type | Description |
|-----------|------|-------------|
| `page` | integer | Numéro de page |
| `per_page` | integer | Éléments par page (max: 100) |
| `search` | string | Recherche par nom, email |
| `status` | string | "active", "inactive", "archived" |
| `category_id` | integer | Filtrer par catégorie |
| `has_balance` | boolean | Clients avec solde dû |
| `sort` | string | Champ de tri |

### Réponse

```json
{
  "data": [
    {
      "id": 45,
      "type": "company",
      "name": "Entreprise ABC",
      "email": "contact@abc.com",
      "phone": "+22507000000",
      "address": {
        "street": "Rue 12, Plateau",
        "city": "Abidjan",
        "country": "CI"
      },
      "tax_id": "CI1234567890",
      "currency": "XOF",
      "balance": 118000,
      "status": "active",
      "category": {
        "id": 1,
        "name": "Clients VIP"
      },
      "created_at": "2023-06-15T10:00:00Z",
      "updated_at": "2024-01-10T14:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 234
  }
}
```

## Créer un client

### Requête

```http
POST /customers
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "type": "company",
  "name": "Nouvelle Entreprise",
  "email": "contact@nouvelle.com",
  "phone": "+22507000001",
  "address": {
    "street": "Rue des Immeubles",
    "city": "Abidjan",
    "country": "CI"
  },
  "tax_id": "CI9876543210",
  "category_id": 1,
  "payment_terms": 30,
  "notes": "Client important"
}
```

### Corps de la requête

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `type` | string | ✅ | "individual" ou "company" |
| `name` | string | ✅ | Nom complet ou raison sociale |
| `email` | string | ✅ | Email du client |
| `phone` | string | ❌ | Numéro de téléphone |
| `address` | object | ❌ | Adresse postale |
| `address.street` | string | ❌ | Rue et numéro |
| `address.city` | string | ❌ | Ville |
| `address.country` | string | ❌ | Code pays ISO |
| `tax_id` | string | ❌ | Numéro fiscal |
| `category_id` | integer | ❌ | ID de la catégorie |
| `payment_terms` | integer | ❌ | Délai de paiement (jours) |
| `notes` | string | ❌ | Notes internes |
| `metadata` | object | ❌ | Données personnalisées |

### Réponse

```json
{
  "id": 46,
  "type": "company",
  "name": "Nouvelle Entreprise",
  "email": "contact@nouvelle.com",
  "phone": "+22507000001",
  "address": {
    "street": "Rue des Immeubles",
    "city": "Abidjan",
    "country": "CI"
  },
  "tax_id": "CI9876543210",
  "currency": "XOF",
  "balance": 0,
  "status": "active",
  "category": {
    "id": 1,
    "name": "Clients VIP"
  },
  "payment_terms": 30,
  "notes": "Client important",
  "portal_access": false,
  "created_at": "2024-01-15T10:00:00Z"
}
```

## Obtenir un client

### Requête

```http
GET /customers/45
Authorization: Bearer YOUR_TOKEN
```

### Réponse

```json
{
  "id": 45,
  "type": "company",
  "name": "Entreprise ABC",
  "email": "contact@abc.com",
  "phone": "+22507000000",
  "address": {
    "street": "Rue 12, Plateau",
    "city": "Abidjan",
    "country": "CI"
  },
  "tax_id": "CI1234567890",
  "currency": "XOF",
  "balance": 118000,
  "status": "active",
  "category": {
    "id": 1,
    "name": "Clients VIP"
  },
  "payment_terms": 30,
  "notes": null,
  "portal_access": true,
  "portal_last_login": "2024-01-10T08:00:00Z",
  "statistics": {
    "total_invoices": 24,
    "total_paid": 2500000,
    "total_outstanding": 118000,
    "average_payment_days": 28
  },
  "created_at": "2023-06-15T10:00:00Z",
  "updated_at": "2024-01-10T14:30:00Z"
}
```

## Modifier un client

### Requête

```http
PUT /customers/45
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "phone": "+22507000002",
  "category_id": 2
}
```

### Réponse

Retourne le client complet mis à jour.

## Supprimer un client

### Requête

```http
DELETE /customers/46
Authorization: Bearer YOUR_TOKEN
```

### Réponse

```json
{
  "success": true,
  "message": "Customer deleted successfully"
}
```

⚠️ Un client ne peut être supprimé que s'il n'a aucune facture associée.

## Factures d'un client

### Requête

```http
GET /customers/45/invoices?status=unpaid
Authorization: Bearer YOUR_TOKEN
```

### Réponse

```json
{
  "data": [
    {
      "id": 1234,
      "number": "FAC-2024-0001",
      "status": "sent",
      "date": "2024-01-15",
      "due_date": "2024-02-14",
      "total": 118000,
      "amount_paid": 0,
      "amount_due": 118000
    }
  ],
  "meta": {
    "total": 1,
    "total_amount_due": 118000
  }
}
```

## Paiements d'un client

### Requête

```http
GET /customers/45/payments
Authorization: Bearer YOUR_TOKEN
```

### Réponse

```json
{
  "data": [
    {
      "id": 789,
      "date": "2024-01-10",
      "amount": 50000,
      "method": "mobile_money",
      "reference": "OMP123456789",
      "invoice": {
        "id": 1233,
        "number": "FAC-2023-0120"
      }
    }
  ]
}
```

## Import en masse

### Requête

```http
POST /customers/import
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

file: customers.csv
```

### Format CSV

```csv
name,email,phone,address,city,country
Entreprise X,contact@x.com,+22507000000,Rue 1,Abidjan,CI
Entreprise Y,contact@y.com,+22507000001,Rue 2,Lagos,NG
```

### Réponse

```json
{
  "success": true,
  "imported": 98,
  "errors": 2,
  "error_details": [
    {
      "line": 5,
      "error": "Invalid email format"
    },
    {
      "line": 12,
      "error": "Duplicate email"
    }
  ]
}
```

## Recherche avancée

### Requête

```http
POST /customers/search
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "query": "entreprise",
  "filters": {
    "balance_min": 50000,
    "status": "active"
  },
  "sort": "-balance"
}
```

### Réponse

Retourne une liste de clients correspondant aux critères.

## Webhooks

| Événement | Description |
|-----------|-------------|
| `customer.created` | Nouveau client créé |
| `customer.updated` | Client modifié |
| `customer.deleted` | Client supprimé |

## Exemples de code

### JavaScript

```javascript
const createCustomer = async (customerData) => {
  const response = await fetch('https://api.saasafrica.com/facturepro/api/v1/customers', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(customerData)
  });
  
  return response.json();
};

// Créer un client
const customer = await createCustomer({
  type: 'company',
  name: 'Ma Société',
  email: 'contact@masociete.com',
  phone: '+22507000000'
});
```

### Python

```python
import requests

def get_customer(customer_id):
    response = requests.get(
        f'https://api.saasafrica.com/facturepro/api/v1/customers/{customer_id}',
        headers={'Authorization': 'Bearer YOUR_TOKEN'}
    )
    return response.json()

customer = get_customer(45)
print(f"Client: {customer['name']}, Solde: {customer['balance']}")
```

---

[← API Invoices](./invoices.md) | [Webhooks →](./webhooks.md)
