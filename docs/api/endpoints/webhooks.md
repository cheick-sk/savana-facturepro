# Webhooks

Ce guide explique comment configurer et utiliser les webhooks pour recevoir des notifications en temps réel.

## Vue d'ensemble

Les webhooks permettent à votre application de recevoir des notifications automatiques lorsqu'un événement se produit dans SaaS Africa.

## Configuration

### Créer un endpoint de webhook

**Paramètres > API > Webhooks > Ajouter**

1. **Nom** - Identifiant du webhook
2. **URL** - URL de votre serveur (HTTPS requis)
3. **Événements** - Sélectionnez les événements à écouter
4. **Secret** - Clé pour vérifier les signatures

### Via l'API

```http
POST /webhooks
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Mon intégration CRM",
  "url": "https://mon-serveur.com/webhooks/saasafrica",
  "events": ["invoice.created", "payment.received"],
  "secret": "mon_secret_webhook"
}
```

### Réponse

```json
{
  "id": 1,
  "name": "Mon intégration CRM",
  "url": "https://mon-serveur.com/webhooks/saasafrica",
  "events": ["invoice.created", "payment.received"],
  "status": "active",
  "created_at": "2024-01-15T10:00:00Z"
}
```

## Événements disponibles

### FacturePro

| Événement | Description | Données incluses |
|-----------|-------------|------------------|
| `invoice.created` | Facture créée | Facture complète |
| `invoice.sent` | Facture envoyée | Facture |
| `invoice.viewed` | Facture consultée | Facture |
| `invoice.paid` | Facture payée | Facture |
| `invoice.cancelled` | Facture annulée | Facture |
| `payment.received` | Paiement reçu | Paiement + Facture |
| `customer.created` | Client créé | Client |
| `customer.updated` | Client modifié | Client |

### SavanaFlow

| Événement | Description |
|-----------|-------------|
| `sale.completed` | Vente finalisée |
| `sale.refunded` | Vente remboursée |
| `stock.low` | Stock bas |
| `stock.out` | Rupture de stock |
| `order.created` | Commande en ligne créée |
| `order.shipped` | Commande expédiée |

### SchoolFlow

| Événement | Description |
|-----------|-------------|
| `student.enrolled` | Élève inscrit |
| `attendance.absent` | Absence détectée |
| `grade.published` | Notes publiées |
| `fee.paid` | Frais payés |

## Format du payload

### Structure

```json
{
  "id": "evt_1234567890abcdef",
  "event": "invoice.created",
  "data": {
    // Données spécifiques à l'événement
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "tenant_id": "tenant_abc123"
}
```

### Exemple : Paiement reçu

```json
{
  "id": "evt_abc123def456",
  "event": "payment.received",
  "data": {
    "payment": {
      "id": 789,
      "amount": 118000,
      "currency": "XOF",
      "method": "mobile_money",
      "provider": "orange_money",
      "reference": "OMP123456789",
      "date": "2024-01-15T10:30:00Z"
    },
    "invoice": {
      "id": 1234,
      "number": "FAC-2024-0001",
      "total": 118000,
      "status": "paid"
    },
    "customer": {
      "id": 45,
      "name": "Entreprise ABC",
      "email": "contact@abc.com"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "tenant_id": "tenant_abc123"
}
```

## Sécurité

### Vérification de signature

Chaque webhook inclut une signature HMAC-SHA256 dans l'en-tête `X-Webhook-Signature` :

```http
POST /webhooks/endpoint
Content-Type: application/json
X-Webhook-Signature: sha256=abcdef1234567890...
X-Webhook-Event: payment.received
X-Webhook-Delivery: del_abc123

{...payload...}
```

### Vérification côté serveur

#### Node.js

```javascript
const crypto = require('crypto');

function verifyWebhook(secret, payload, signature) {
  const expectedSignature = 'sha256=' + 
    crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Middleware Express
app.post('/webhooks/saasafrica', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhook(WEBHOOK_SECRET, payload, signature)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Traiter le webhook
  handleWebhook(req.body);
  res.status(200).send('OK');
});
```

#### Python

```python
import hmac
import hashlib

def verify_webhook(secret, payload, signature):
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)

# Flask
@app.route('/webhooks/saasafrica', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data(as_text=True)
    
    if not verify_webhook(WEBHOOK_SECRET, payload, signature):
        return 'Invalid signature', 401
    
    data = request.json
    process_webhook(data)
    return 'OK', 200
```

## Réponses attendues

### Code de succès

Votre endpoint doit répondre avec un code 2xx :

```
HTTP 200 OK
HTTP 201 Created
HTTP 204 No Content
```

### Code d'erreur

En cas d'erreur temporaire, retournez un code 5xx pour déclencher les réessais :

```
HTTP 500 Internal Server Error
HTTP 503 Service Unavailable
```

## Réessais automatiques

### Politique de réessai

| Tentative | Délai |
|-----------|-------|
| 1ère | Immédiat |
| 2ème | 1 minute |
| 3ème | 5 minutes |
| 4ème | 15 minutes |
| 5ème | 1 heure |
| 6ème | 6 heures |

### Abandon

Après 6 échecs sur 24 heures, le webhook est désactivé. Vous recevez un email de notification.

### Réactivation

**Paramètres > API > Webhooks > [Webhook] > Réactiver**

## Logs et debugging

### Consulter les logs

**Paramètres > API > Webhooks > [Webhook] > Logs**

| Information | Description |
|-------------|-------------|
| Timestamp | Date et heure |
| Événement | Type d'événement |
| Statut | Succès / Échec |
| Code HTTP | Code de réponse |
| Tentative | Numéro de tentative |
| Durée | Temps de réponse |

### Tester un webhook

**Paramètres > API > Webhooks > [Webhook] > Tester**

Envoyez un événement de test pour vérifier votre configuration.

```json
{
  "id": "evt_test_123",
  "event": "test",
  "data": {
    "message": "This is a test webhook"
  },
  "timestamp": "2024-01-15T10:00:00Z"
}
```

## Gestion des événements

### Exemple complet

```javascript
async function handleWebhook(payload) {
  const { event, data } = payload;
  
  switch (event) {
    case 'invoice.created':
      await syncInvoiceToCRM(data);
      break;
      
    case 'payment.received':
      await updateAccounting(data);
      await sendThankYouEmail(data.customer);
      break;
      
    case 'customer.created':
      await addToMailingList(data);
      break;
      
    default:
      console.log(`Unhandled event: ${event}`);
  }
}
```

### Idempotence

Traitez les webhooks de manière idempotente car ils peuvent être reçus plusieurs fois :

```javascript
async function handlePayment(payload) {
  const paymentId = payload.data.payment.id;
  
  // Vérifier si déjà traité
  const existing = await db.payments.findOne({ external_id: paymentId });
  if (existing) {
    console.log('Payment already processed');
    return;
  }
  
  // Traiter le paiement
  await processPayment(payload.data);
}
```

## Bonnes pratiques

### Sécurité

- ✅ Vérifiez toujours la signature
- ✅ Utilisez HTTPS uniquement
- ✅ Gardez le secret confidentiel
- ✅ Rottez les secrets régulièrement

### Performance

- ✅ Répondez rapidement (sous 5 secondes)
- ✅ Traitez les données de manière asynchrone
- ✅ Utilisez une file d'attente pour le traitement lourd

### Fiabilité

- ✅ Implémentez l'idempotence
- ✅ Loggez tous les webhooks reçus
- ✅ Surveillez les échecs
- ✅ Configurez des alertes

---

[← API Customers](./customers.md) | [SDK Python →](../sdks/python.md)
