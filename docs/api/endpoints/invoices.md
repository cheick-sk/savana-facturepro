# API Invoices

Ce guide détaille les endpoints de l'API pour la gestion des factures.

## Vue d'ensemble

L'API Invoices permet de :
- Lister et rechercher des factures
- Créer de nouvelles factures
- Mettre à jour les factures existantes
- Envoyer et gérer les factures

## Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/invoices` | Liste des factures |
| `POST` | `/invoices` | Créer une facture |
| `GET` | `/invoices/{id}` | Détails d'une facture |
| `PUT` | `/invoices/{id}` | Modifier une facture |
| `DELETE` | `/invoices/{id}` | Supprimer une facture |
| `POST` | `/invoices/{id}/send` | Envoyer une facture |
| `POST` | `/invoices/{id}/cancel` | Annuler une facture |
| `GET` | `/invoices/{id}/pdf` | Télécharger le PDF |

## Lister les factures

### Requête

```http
GET /invoices?page=1&per_page=20&status=sent&customer_id=123
Authorization: Bearer YOUR_TOKEN
```

### Paramètres de requête

| Paramètre | Type | Description |
|-----------|------|-------------|
| `page` | integer | Numéro de page (défaut: 1) |
| `per_page` | integer | Éléments par page (défaut: 20, max: 100) |
| `status` | string | Filtrer par statut |
| `customer_id` | integer | Filtrer par client |
| `from_date` | date | Date minimum (YYYY-MM-DD) |
| `to_date` | date | Date maximum (YYYY-MM-DD) |
| `search` | string | Recherche texte libre |
| `sort` | string | Champ de tri (défaut: `-date`) |

### Réponse

```json
{
  "data": [
    {
      "id": 1234,
      "number": "FAC-2024-0001",
      "status": "sent",
      "customer": {
        "id": 45,
        "name": "Entreprise ABC",
        "email": "contact@abc.com"
      },
      "date": "2024-01-15",
      "due_date": "2024-02-14",
      "subtotal": 100000,
      "tax": 18000,
      "total": 118000,
      "amount_paid": 0,
      "amount_due": 118000,
      "currency": "XOF",
      "created_at": "2024-01-15T09:30:00Z",
      "updated_at": "2024-01-15T09:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

## Créer une facture

### Requête

```http
POST /invoices
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "customer_id": 45,
  "date": "2024-01-15",
  "due_date": "2024-02-14",
  "items": [
    {
      "description": "Service de consultation",
      "quantity": 10,
      "unit_price": 10000,
      "tax_rate": 18
    }
  ],
  "notes": "Merci pour votre confiance",
  "terms": "Paiement à 30 jours"
}
```

### Corps de la requête

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `customer_id` | integer | ✅ | ID du client |
| `date` | date | ❌ | Date de facture (défaut: aujourd'hui) |
| `due_date` | date | ❌ | Date d'échéance |
| `items` | array | ✅ | Lignes de facturation |
| `items[].description` | string | ✅ | Description |
| `items[].quantity` | number | ✅ | Quantité |
| `items[].unit_price` | number | ✅ | Prix unitaire HT |
| `items[].tax_rate` | number | ❌ | Taux TVA (défaut: 0) |
| `items[].product_id` | integer | ❌ | ID produit (optionnel) |
| `discount_type` | string | ❌ | "percentage" ou "fixed" |
| `discount_value` | number | ❌ | Valeur de la remise |
| `notes` | string | ❌ | Note publique |
| `terms` | string | ❌ | Conditions |

### Réponse

```json
{
  "id": 1235,
  "number": "FAC-2024-0002",
  "status": "draft",
  "customer": {
    "id": 45,
    "name": "Entreprise ABC",
    "email": "contact@abc.com"
  },
  "date": "2024-01-15",
  "due_date": "2024-02-14",
  "items": [
    {
      "id": 1,
      "description": "Service de consultation",
      "quantity": 10,
      "unit_price": 10000,
      "tax_rate": 18,
      "tax_amount": 18000,
      "total": 118000
    }
  ],
  "subtotal": 100000,
  "discount": 0,
  "tax": 18000,
  "total": 118000,
  "amount_paid": 0,
  "amount_due": 118000,
  "currency": "XOF",
  "notes": "Merci pour votre confiance",
  "terms": "Paiement à 30 jours",
  "created_at": "2024-01-15T10:00:00Z"
}
```

## Obtenir une facture

### Requête

```http
GET /invoices/1234
Authorization: Bearer YOUR_TOKEN
```

### Réponse

```json
{
  "id": 1234,
  "number": "FAC-2024-0001",
  "status": "sent",
  "customer": {
    "id": 45,
    "name": "Entreprise ABC",
    "email": "contact@abc.com",
    "phone": "+22507000000",
    "address": "Rue 12, Abidjan"
  },
  "date": "2024-01-15",
  "due_date": "2024-02-14",
  "items": [
    {
      "id": 1,
      "description": "Service de consultation",
      "quantity": 10,
      "unit_price": 10000,
      "tax_rate": 18,
      "tax_amount": 18000,
      "total": 118000
    }
  ],
  "subtotal": 100000,
  "discount": 0,
  "tax": 18000,
  "total": 118000,
  "amount_paid": 50000,
  "amount_due": 68000,
  "currency": "XOF",
  "payments": [
    {
      "id": 789,
      "date": "2024-01-20",
      "amount": 50000,
      "method": "mobile_money",
      "reference": "OMP123456789"
    }
  ],
  "notes": "Merci pour votre confiance",
  "terms": "Paiement à 30 jours",
  "public_url": "https://view.saasafrica.com/i/abc123",
  "created_at": "2024-01-15T09:30:00Z",
  "updated_at": "2024-01-20T14:00:00Z",
  "sent_at": "2024-01-15T09:31:00Z"
}
```

## Modifier une facture

### Requête

```http
PUT /invoices/1234
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "due_date": "2024-02-28",
  "notes": "Notes mises à jour"
}
```

### Réponse

Retourne la facture complète mise à jour.

## Supprimer une facture

### Requête

```http
DELETE /invoices/1234
Authorization: Bearer YOUR_TOKEN
```

### Réponse

```json
{
  "success": true,
  "message": "Invoice deleted successfully"
}
```

⚠️ Seules les factures en brouillon peuvent être supprimées.

## Envoyer une facture

### Requête

```http
POST /invoices/1234/send
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "channels": ["email"],
  "message": "Veuillez trouver ci-joint votre facture."
}
```

### Paramètres

| Champ | Type | Description |
|-------|------|-------------|
| `channels` | array | Canaux : "email", "sms", "whatsapp" |
| `message` | string | Message personnalisé |

### Réponse

```json
{
  "success": true,
  "message": "Invoice sent successfully",
  "sent_at": "2024-01-15T10:00:00Z"
}
```

## Annuler une facture

### Requête

```http
POST /invoices/1234/cancel
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "reason": "Erreur de facturation"
}
```

### Réponse

```json
{
  "success": true,
  "message": "Invoice cancelled successfully",
  "status": "cancelled"
}
```

## Télécharger le PDF

### Requête

```http
GET /invoices/1234/pdf
Authorization: Bearer YOUR_TOKEN
Accept: application/pdf
```

### Réponse

Le fichier PDF en binaire.

## Statuts de facture

| Statut | Description |
|--------|-------------|
| `draft` | Brouillon |
| `sent` | Envoyée au client |
| `viewed` | Consultée par le client |
| `partial` | Partiellement payée |
| `paid` | Payée intégralement |
| `overdue` | En retard de paiement |
| `cancelled` | Annulée |

## Webhooks

Les événements suivants peuvent déclencher un webhook :

| Événement | Description |
|-----------|-------------|
| `invoice.created` | Facture créée |
| `invoice.sent` | Facture envoyée |
| `invoice.viewed` | Facture consultée |
| `invoice.paid` | Facture payée |
| `invoice.cancelled` | Facture annulée |
| `payment.received` | Paiement reçu |

Voir la documentation complète : [Webhooks](./webhooks.md)

## Exemples de code

### JavaScript

```javascript
// Créer une facture
const createInvoice = async (invoiceData) => {
  const response = await fetch('https://api.saasafrica.com/facturepro/api/v1/invoices', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(invoiceData)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Utilisation
const invoice = await createInvoice({
  customer_id: 45,
  items: [
    {
      description: "Service consulting",
      quantity: 10,
      unit_price: 10000,
      tax_rate: 18
    }
  ]
});
```

### Python

```python
import requests

def create_invoice(invoice_data):
    headers = {
        'Authorization': 'Bearer YOUR_TOKEN',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(
        'https://api.saasafrica.com/facturepro/api/v1/invoices',
        json=invoice_data,
        headers=headers
    )
    
    response.raise_for_status()
    return response.json()

# Utilisation
invoice = create_invoice({
    'customer_id': 45,
    'items': [
        {
            'description': 'Service consulting',
            'quantity': 10,
            'unit_price': 10000,
            'tax_rate': 18
        }
    ]
})
```

---

[← Limites de taux](../rate-limits.md) | [API Customers →](./customers.md)
