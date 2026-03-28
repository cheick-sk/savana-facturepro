# SDK JavaScript

Ce guide vous explique comment utiliser le SDK JavaScript officiel de SaaS Africa.

## Installation

### npm

```bash
npm install @saasafrica/sdk
```

### yarn

```bash
yarn add @saasafrica/sdk
```

### pnpm

```bash
pnpm add @saasafrica/sdk
```

## Configuration

### ES Modules

```javascript
import { SaaSAfrica } from '@saasafrica/sdk';

// Avec API Key (pour Node.js uniquement)
const client = new SaaSAfrica({
  apiKey: 'sk_live_1234567890',
  app: 'facturepro'
});

// Avec Bearer Token
const client = new SaaSAfrica({
  bearerToken: 'eyJ0eXAiOiJKV1QiLCJ...',
  app: 'facturepro'
});
```

### CommonJS

```javascript
const { SaaSAfrica } = require('@saasafrica/sdk');

const client = new SaaSAfrica({
  apiKey: 'sk_live_1234567890'
});
```

### Configuration complète

```javascript
const client = new SaaSAfrica({
  apiKey: 'sk_live_1234567890',
  app: 'facturepro', // 'facturepro', 'savanaflow', 'schoolflow'
  timeout: 30000,
  maxRetries: 3,
  environment: 'production' // 'production' ou 'sandbox'
});
```

### Variables d'environnement

```bash
# .env
SAASAFRICA_API_KEY=sk_live_1234567890
SAASAFRICA_APP=facturepro
SAASAFRICA_ENVIRONMENT=production
```

```javascript
import { SaaSAfrica } from '@saasafrica/sdk';

// Charge automatiquement depuis les variables d'environnement
const client = new SaaSAfrica();
```

## Utilisation

### FacturePro

#### Clients

```javascript
// Lister les clients
const customers = await client.facturepro.customers.list({
  page: 1,
  perPage: 50,
  status: 'active'
});

customers.data.forEach(customer => {
  console.log(`${customer.name}: ${customer.balance} ${customer.currency}`);
});

// Obtenir un client
const customer = await client.facturepro.customers.get(45);
console.log(customer.name);

// Créer un client
const newCustomer = await client.facturepro.customers.create({
  type: 'company',
  name: 'Ma Société',
  email: 'contact@masociete.com',
  phone: '+22507000000'
});
console.log(`Client créé: ${newCustomer.id}`);

// Modifier un client
const updated = await client.facturepro.customers.update(newCustomer.id, {
  phone: '+22507000001',
  notes: 'Client VIP'
});

// Supprimer un client
await client.facturepro.customers.delete(newCustomer.id);
```

#### Factures

```javascript
// Créer une facture
const invoice = await client.facturepro.invoices.create({
  customerId: 45,
  items: [
    {
      description: 'Service de consultation',
      quantity: 10,
      unitPrice: 10000,
      taxRate: 18
    }
  ],
  notes: 'Merci pour votre confiance',
  dueDays: 30
});

console.log(`Facture créée: ${invoice.number}`);
console.log(`Total: ${invoice.total} ${invoice.currency}`);

// Lister les factures
const invoices = await client.facturepro.invoices.list({
  status: 'unpaid',
  fromDate: '2024-01-01'
});

// Obtenir une facture
const invoice = await client.facturepro.invoices.get(1234);

// Envoyer une facture
await client.facturepro.invoices.send(invoice.id, {
  channels: ['email'],
  message: 'Veuillez trouver ci-joint votre facture.'
});

// Enregistrer un paiement
const payment = await client.facturepro.payments.create({
  invoiceId: 1234,
  amount: 50000,
  method: 'mobile_money',
  reference: 'OMP123456789'
});

// Télécharger le PDF
const pdfBuffer = await client.facturepro.invoices.downloadPdf(1234);
// Sauvegarder dans un fichier (Node.js)
import fs from 'fs';
fs.writeFileSync('facture.pdf', pdfBuffer);
```

#### Produits

```javascript
// Lister les produits
const products = await client.facturepro.products.list({
  categoryId: 1
});

// Créer un produit
const product = await client.facturepro.products.create({
  name: 'Service consulting',
  code: 'CONSULT-001',
  price: 50000,
  taxRate: 18,
  categoryId: 1
});
```

### SavanaFlow

#### Ventes

```javascript
// Créer une vente
const sale = await client.savanaflow.sales.create({
  items: [
    { productId: 1, quantity: 2 },
    { productId: 5, quantity: 1 }
  ],
  paymentMethod: 'mobile_money',
  customerPhone: '+22507000000'
});

console.log(`Vente: ${sale.total}`);
console.log(`Référence: ${sale.reference}`);

// Lister les ventes
const sales = await client.savanaflow.sales.list({
  date: '2024-01-15'
});
```

#### Produits et stock

```javascript
// Lister les produits
const products = await client.savanaflow.products.list();

// Mettre à jour le stock
await client.savanaflow.stock.adjust({
  productId: 1,
  quantity: 10,
  reason: 'inventory_count'
});

// Vérifier les alertes de stock
const alerts = await client.savanaflow.stock.alerts();
```

### SchoolFlow

#### Élèves

```javascript
// Lister les élèves
const students = await client.schoolflow.students.list({
  classId: 1
});

// Créer un élève
const student = await client.schoolflow.students.create({
  firstName: 'Amadou',
  lastName: 'Kouassi',
  dateOfBirth: '2012-03-15',
  gender: 'M',
  classId: 1,
  parents: [
    {
      name: 'Kouassi Jean',
      relationship: 'father',
      phone: '+22507000000'
    }
  ]
});

// Transférer un élève
await client.schoolflow.students.transfer(student.id, {
  newClassId: 2
});
```

#### Présences

```javascript
// Enregistrer les présences
await client.schoolflow.attendance.record({
  classId: 1,
  date: '2024-01-15',
  records: [
    { studentId: 1, status: 'present' },
    { studentId: 2, status: 'absent' },
    { studentId: 3, status: 'late' }
  ]
});

// Obtenir les absences du jour
const absences = await client.schoolflow.attendance.daily({
  date: '2024-01-15'
});
```

#### Notes

```javascript
// Saisir des notes
await client.schoolflow.grades.create({
  classId: 1,
  subjectId: 5,
  evaluationType: 'devoir',
  grades: [
    { studentId: 1, score: 15 },
    { studentId: 2, score: 12 },
    { studentId: 3, score: 18 }
  ]
});
```

## Gestion des erreurs

```javascript
import { 
  SaaSAfrica,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NotFoundError,
  APIError
} from '@saasafrica/sdk';

try {
  const invoice = await client.facturepro.invoices.create({...});
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Erreur de validation:', error.message);
    console.log('Détails:', error.errors);
  } else if (error instanceof RateLimitError) {
    console.log(`Limite atteinte. Réessayez dans ${error.retryAfter} secondes`);
  } else if (error instanceof AuthenticationError) {
    console.log('Erreur d\'authentification');
  } else if (error instanceof NotFoundError) {
    console.log('Ressource non trouvée');
  } else if (error instanceof APIError) {
    console.log('Erreur API:', error.message);
  }
}
```

## Pagination

```javascript
// Pagination simple
const customers = await client.facturepro.customers.list({
  page: 1,
  perPage: 50
});

// Itérer sur toutes les pages
const allCustomers = [];
for await (const page of client.facturepro.customers.listAll()) {
  allCustomers.push(...page.data);
}

// Ou utiliser l'itérateur asynchrone
for await (const customer of client.facturepro.customers.iterate()) {
  console.log(customer.name);
}
```

## Webhooks

### Vérification de signature

```javascript
import { verifySignature } from '@saasafrica/sdk/webhooks';

// Express
app.post('/webhooks/saasafrica', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;
  
  if (!verifySignature(WEBHOOK_SECRET, payload, signature)) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(payload);
  // Traiter l'événement
  res.status(200).send('OK');
});
```

### Parser les événements

```javascript
import { parseEvent } from '@saasafrica/sdk/webhooks';

const event = parseEvent(payload);

if (event.type === 'payment.received') {
  const payment = event.data.payment;
  console.log(`Paiement reçu: ${payment.amount}`);
}
```

### Next.js API Route

```javascript
// pages/api/webhooks/saasafrica.js
import { verifySignature, parseEvent } from '@saasafrica/sdk/webhooks';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const payload = Buffer.concat(chunks);
  
  const signature = req.headers['x-webhook-signature'];
  if (!verifySignature(process.env.WEBHOOK_SECRET, payload, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = parseEvent(payload.toString());
  
  // Traiter l'événement
  switch (event.type) {
    case 'payment.received':
      await handlePayment(event.data);
      break;
    case 'invoice.created':
      await handleInvoice(event.data);
      break;
  }
  
  res.status(200).json({ received: true });
}
```

## TypeScript

Le SDK inclut des types TypeScript complets :

```typescript
import { SaaSAfrica, Invoice, Customer, CreateInvoiceParams } from '@saasafrica/sdk';

const client = new SaaSAfrica({
  apiKey: 'sk_live_xxx'
});

// Les types sont automatiquement inférés
const invoice: Invoice = await client.facturepro.invoices.get(1234);

// Types pour les paramètres
const params: CreateInvoiceParams = {
  customerId: 45,
  items: [
    {
      description: 'Service',
      quantity: 1,
      unitPrice: 50000,
      taxRate: 18
    }
  ]
};

const newInvoice = await client.facturepro.invoices.create(params);
```

## React

### Hook personnalisé

```javascript
import { useQuery, useMutation } from '@tanstack/react-query';
import { SaaSAfrica } from '@saasafrica/sdk';

const client = new SaaSAfrica({ bearerToken: getToken() });

export function useInvoices(filters) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => client.facturepro.invoices.list(filters)
  });
}

export function useCreateInvoice() {
  return useMutation({
    mutationFn: (data) => client.facturepro.invoices.create(data)
  });
}

// Utilisation
function InvoiceList() {
  const { data, isLoading } = useInvoices({ status: 'unpaid' });
  const createInvoice = useCreateInvoice();
  
  if (isLoading) return <div>Chargement...</div>;
  
  return (
    <ul>
      {data?.data.map(invoice => (
        <li key={invoice.id}>{invoice.number}</li>
      ))}
    </ul>
  );
}
```

## Tests

### Mode test

```javascript
import { SaaSAfrica } from '@saasafrica/sdk';

const client = new SaaSAfrica({
  apiKey: 'sk_test_1234567890',
  environment: 'sandbox'
});
```

### Mocking

```javascript
import { MockClient } from '@saasafrica/sdk/testing';

describe('Invoice creation', () => {
  const client = new MockClient();
  
  it('should create an invoice', async () => {
    const invoice = await client.facturepro.invoices.create({
      customerId: 1,
      items: [...]
    });
    
    expect(invoice.id).toBeDefined();
    expect(invoice.status).toBe('draft');
  });
});
```

## Logging

```javascript
import { setLogLevel } from '@saasafrica/sdk';

// Activer les logs
setLogLevel('debug');
```

## Ressources

- **Documentation API** : [api.saasafrica.com](https://api.saasafrica.com)
- **GitHub** : [github.com/saasafrica/js-sdk](https://github.com/saasafrica/js-sdk)
- **npm** : [npmjs.com/package/@saasafrica/sdk](https://npmjs.com/package/@saasafrica/sdk)

---

[← SDK Python](./python.md) | [Intégrations →](../../integrations/cinetpay.md)
