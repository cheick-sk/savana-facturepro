# SDK Python

Ce guide vous explique comment utiliser le SDK Python officiel de SaaS Africa.

## Installation

### Via pip

```bash
pip install saasafrica
```

### Via poetry

```bash
poetry add saasafrica
```

## Configuration

### Configuration basique

```python
from saasafrica import SaaSAfrica

# Avec API Key
client = SaaSAfrica(api_key='sk_live_1234567890')

# Avec Bearer Token
client = SaaSAfrica(bearer_token='eyJ0eXAiOiJKV1QiLCJ...')
```

### Configuration avancée

```python
from saasafrica import SaaSAfrica

client = SaaSAfrica(
    api_key='sk_live_1234567890',
    app='facturepro',  # facturepro, savanaflow, schoolflow
    timeout=30,
    max_retries=3,
    environment='production'  # 'production' ou 'sandbox'
)
```

### Variables d'environnement

```bash
# .env
SAASAFRICA_API_KEY=sk_live_1234567890
SAASAFRICA_APP=facturepro
SAASAFRICA_ENVIRONMENT=production
```

```python
from saasafrica import SaaSAfrica

# Charge automatiquement depuis les variables d'environnement
client = SaaSAfrica()
```

## Utilisation

### FacturePro

#### Clients

```python
# Lister les clients
customers = client.facturepro.customers.list(
    page=1,
    per_page=50,
    status='active'
)

for customer in customers.data:
    print(f"{customer.name}: {customer.balance} {customer.currency}")

# Obtenir un client
customer = client.facturepro.customers.get(45)
print(customer.name)

# Créer un client
new_customer = client.facturepro.customers.create(
    type='company',
    name='Ma Société',
    email='contact@masociete.com',
    phone='+22507000000'
)
print(f"Client créé: {new_customer.id}")

# Modifier un client
updated = client.facturepro.customers.update(
    new_customer.id,
    phone='+22507000001',
    notes='Client VIP'
)

# Supprimer un client
client.facturepro.customers.delete(new_customer.id)
```

#### Factures

```python
# Créer une facture
invoice = client.facturepro.invoices.create(
    customer_id=45,
    items=[
        {
            'description': 'Service de consultation',
            'quantity': 10,
            'unit_price': 10000,
            'tax_rate': 18
        }
    ],
    notes='Merci pour votre confiance',
    due_days=30
)

print(f"Facture créée: {invoice.number}")
print(f"Total: {invoice.total} {invoice.currency}")

# Lister les factures
invoices = client.facturepro.invoices.list(
    status='unpaid',
    from_date='2024-01-01'
)

# Obtenir une facture
invoice = client.facturepro.invoices.get(1234)

# Envoyer une facture
client.facturepro.invoices.send(
    invoice.id,
    channels=['email'],
    message='Veuillez trouver ci-joint votre facture.'
)

# Enregistrer un paiement
payment = client.facturepro.payments.create(
    invoice_id=1234,
    amount=50000,
    method='mobile_money',
    reference='OMP123456789'
)

# Télécharger le PDF
pdf_content = client.facturepro.invoices.download_pdf(1234)
with open('facture.pdf', 'wb') as f:
    f.write(pdf_content)
```

#### Produits

```python
# Lister les produits
products = client.facturepro.products.list(
    category_id=1
)

# Créer un produit
product = client.facturepro.products.create(
    name='Service consulting',
    code='CONSULT-001',
    price=50000,
    tax_rate=18,
    category_id=1
)
```

### SavanaFlow

#### Ventes

```python
# Créer une vente
sale = client.savanaflow.sales.create(
    items=[
        {'product_id': 1, 'quantity': 2},
        {'product_id': 5, 'quantity': 1}
    ],
    payment_method='mobile_money',
    customer_phone='+22507000000'
)

print(f"Vente: {sale.total}")
print(f"Référence: {sale.reference}")

# Lister les ventes
sales = client.savanaflow.sales.list(
    date='2024-01-15'
)
```

#### Produits et stock

```python
# Lister les produits
products = client.savanaflow.products.list()

# Mettre à jour le stock
client.savanaflow.stock.adjust(
    product_id=1,
    quantity=10,
    reason='inventory_count'
)

# Vérifier les alertes de stock
alerts = client.savanaflow.stock.alerts()
```

### SchoolFlow

#### Élèves

```python
# Lister les élèves
students = client.schoolflow.students.list(
    class_id=1
)

# Créer un élève
student = client.schoolflow.students.create(
    first_name='Amadou',
    last_name='Kouassi',
    date_of_birth='2012-03-15',
    gender='M',
    class_id=1,
    parents=[
        {
            'name': 'Kouassi Jean',
            'relationship': 'father',
            'phone': '+22507000000'
        }
    ]
)

# Transférer un élève
client.schoolflow.students.transfer(
    student.id,
    new_class_id=2
)
```

#### Présences

```python
# Enregistrer les présences
client.schoolflow.attendance.record(
    class_id=1,
    date='2024-01-15',
    records=[
        {'student_id': 1, 'status': 'present'},
        {'student_id': 2, 'status': 'absent'},
        {'student_id': 3, 'status': 'late'}
    ]
)

# Obtenir les absences du jour
absences = client.schoolflow.attendance.daily(
    date='2024-01-15'
)
```

#### Notes

```python
# Saisir des notes
client.schoolflow.grades.create(
    class_id=1,
    subject_id=5,
    evaluation_type='devoir',
    grades=[
        {'student_id': 1, 'score': 15},
        {'student_id': 2, 'score': 12},
        {'student_id': 3, 'score': 18}
    ]
)
```

## Gestion des erreurs

```python
from saasafrica import SaaSAfrica
from saasafrica.errors import (
    AuthenticationError,
    RateLimitError,
    ValidationError,
    NotFoundError,
    APIError
)

try:
    invoice = client.facturepro.invoices.create(...)
except ValidationError as e:
    print(f"Erreur de validation: {e.message}")
    print(f"Détails: {e.errors}")
except RateLimitError as e:
    print(f"Limite atteinte. Réessayez dans {e.retry_after} secondes")
except AuthenticationError:
    print("Erreur d'authentification")
except NotFoundError:
    print("Ressource non trouvée")
except APIError as e:
    print(f"Erreur API: {e.message}")
```

## Pagination

```python
# Pagination simple
customers = client.facturepro.customers.list(page=1, per_page=50)

# Itérer sur toutes les pages
all_customers = []
for page in client.facturepro.customers.list_all():
    all_customers.extend(page.data)

# Ou utiliser l'itérateur
for customer in client.facturepro.customers.iterate():
    print(customer.name)
```

## Webhooks

### Vérification de signature

```python
from saasafrica.webhooks import verify_signature

def handle_webhook(request):
    payload = request.body
    signature = request.headers.get('X-Webhook-Signature')
    
    if not verify_signature(WEBHOOK_SECRET, payload, signature):
        return 'Invalid signature', 401
    
    event = request.json
    # Traiter l'événement
    return 'OK', 200
```

### Parser les événements

```python
from saasafrica.webhooks import parse_event

event = parse_event(payload)

if event.type == 'payment.received':
    payment = event.data['payment']
    print(f"Paiement reçu: {payment['amount']}")
```

## Mode asynchrone

```python
import asyncio
from saasafrica import AsyncSaaSAfrica

async def main():
    client = AsyncSaaSAfrica(api_key='sk_live_xxx')
    
    # Créer plusieurs factures en parallèle
    tasks = [
        client.facturepro.invoices.create(customer_id=i, items=[...])
        for i in [1, 2, 3]
    ]
    
    invoices = await asyncio.gather(*tasks)
    print(f"Factures créées: {len(invoices)}")

asyncio.run(main())
```

## Tests

### Mode test

```python
from saasafrica import SaaSAfrica

client = SaaSAfrica(
    api_key='sk_test_1234567890',
    environment='sandbox'
)
```

### Mocking

```python
import pytest
from saasafrica import SaaSAfrica
from saasafrica.testing import MockClient

def test_create_invoice():
    client = MockClient()
    
    invoice = client.facturepro.invoices.create(
        customer_id=1,
        items=[...]
    )
    
    assert invoice.id is not None
    assert invoice.status == 'draft'
```

## Logging

```python
import logging

# Activer les logs
logging.basicConfig(level=logging.DEBUG)
logging.getLogger('saasafrica').setLevel(logging.DEBUG)
```

## Ressources

- **Documentation API** : [api.saasafrica.com](https://api.saasafrica.com)
- **GitHub** : [github.com/saasafrica/python-sdk](https://github.com/saasafrica/python-sdk)
- **PyPI** : [pypi.org/project/saasafrica](https://pypi.org/project/saasafrica)

---

[← Webhooks](../endpoints/webhooks.md) | [SDK JavaScript →](./javascript.md)
