# FacturePro Africa - API Documentation

## Overview

FacturePro Africa is a multi-tenant SaaS invoicing platform designed for the African market. This API provides comprehensive endpoints for managing invoices, customers, payments, and more.

### Base URL

```
Production: https://api.facturepro.africa
Staging: https://api-staging.facturepro.africa
Development: http://localhost:8000
```

### API Version

Current version: `v1`

All endpoints are prefixed with `/api/v1`

---

## Authentication

The API uses JWT (JSON Web Token) authentication with access and refresh tokens.

### Get Access Token

```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=yourpassword
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Refresh Token

```http
POST /api/v1/auth/refresh
Authorization: Bearer {refresh_token}
```

### Using the Token

Include the access token in all authenticated requests:

```http
GET /api/v1/customers
Authorization: Bearer {access_token}
```

### Two-Factor Authentication

Users with 2FA enabled must provide the TOTP code:

```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=yourpassword&totp_code=123456
```

---

## Multi-Tenancy

All data is isolated by organisation. The API automatically filters data based on the authenticated user's organisation.

### Headers

Include these headers with every request:

```http
X-Organisation-ID: org_123
Accept-Language: fr  # Options: fr, en, wo, sw
```

---

## Rate Limiting

The API implements rate limiting:

| Plan | Requests/Minute | Requests/Day |
|------|----------------|--------------|
| Starter | 60 | 1,000 |
| Pro | 120 | 5,000 |
| Business | 300 | Unlimited |

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699900000
```

---

## Error Handling

### Error Response Format

```json
{
  "detail": "Error message",
  "status_code": 400,
  "error_code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful deletion) |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Pagination

List endpoints support pagination:

```http
GET /api/v1/invoices?page=1&per_page=20&sort=created_at&order=desc
```

**Response:**
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "per_page": 20,
  "pages": 8
}
```

---

## Endpoints

### Authentication

#### Register User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "organisation_name": "My Company",
  "country": "Côte d'Ivoire"
}
```

**Response (201):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "organisation_id": 1,
  "email_verified": false,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Forgot Password

```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com",
  "callback_url": "https://app.facturepro.africa/reset-password"
}
```

#### Reset Password

```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "abc123...",
  "new_password": "NewSecurePass123!",
  "confirm_password": "NewSecurePass123!"
}
```

#### Verify Email

```http
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "token": "verification_token_here"
}
```

---

### Customers

#### List Customers

```http
GET /api/v1/customers?search=john&is_active=true&page=1&per_page=20
Authorization: Bearer {token}
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "John Doe Enterprise",
      "email": "john@enterprise.com",
      "phone": "+2250701234567",
      "address": "Rue du Commerce, Abidjan",
      "city": "Abidjan",
      "country": "Côte d'Ivoire",
      "tax_id": "CI1234567890",
      "credit_limit": 5000000.00,
      "is_active": true,
      "created_at": "2024-01-10T08:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "per_page": 20,
  "pages": 3
}
```

#### Create Customer

```http
POST /api/v1/customers
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Customer SARL",
  "email": "contact@newcustomer.com",
  "phone": "+2250709876543",
  "address": "Plateau, Abidjan",
  "city": "Abidjan",
  "country": "Côte d'Ivoire",
  "tax_id": "CI0987654321",
  "credit_limit": 2000000.00,
  "notes": "Preferred customer"
}
```

#### Get Customer

```http
GET /api/v1/customers/{customer_id}
Authorization: Bearer {token}
```

#### Update Customer

```http
PUT /api/v1/customers/{customer_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Customer Name",
  "email": "newemail@customer.com"
}
```

#### Delete Customer

```http
DELETE /api/v1/customers/{customer_id}
Authorization: Bearer {token}
```

---

### Products

#### List Products

```http
GET /api/v1/products?category_id=1&is_active=true&low_stock=true
Authorization: Bearer {token}
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Service Consulting",
      "description": "Business consulting service",
      "sku": "SVC-001",
      "barcode": "5901234123457",
      "unit_price": 150000.00,
      "purchase_price": 50000.00,
      "unit": "hour",
      "tax_rate": 18.00,
      "category": {
        "id": 1,
        "name": "Services"
      },
      "is_active": true
    }
  ],
  "total": 100,
  "page": 1,
  "per_page": 20
}
```

#### Create Product

```http
POST /api/v1/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Web Development",
  "description": "Custom web development services",
  "sku": "WEB-001",
  "unit_price": 500000.00,
  "purchase_price": 200000.00,
  "unit": "project",
  "tax_rate": 18.00,
  "category_id": 1
}
```

---

### Invoices

#### List Invoices

```http
GET /api/v1/invoices?status=SENT&from_date=2024-01-01&to_date=2024-01-31
Authorization: Bearer {token}
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "invoice_number": "FAC-2024-0001",
      "customer": {
        "id": 1,
        "name": "John Doe Enterprise"
      },
      "status": "SENT",
      "issue_date": "2024-01-15",
      "due_date": "2024-02-15",
      "subtotal": 500000.00,
      "tax_amount": 90000.00,
      "discount_amount": 0.00,
      "total_amount": 590000.00,
      "amount_paid": 0.00,
      "balance_due": 590000.00,
      "currency": "XOF",
      "items": [
        {
          "id": 1,
          "description": "Web Development",
          "quantity": 1.00,
          "unit_price": 500000.00,
          "tax_rate": 18.00,
          "line_total": 590000.00
        }
      ]
    }
  ],
  "total": 25,
  "page": 1
}
```

#### Create Invoice

```http
POST /api/v1/invoices
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": 1,
  "issue_date": "2024-01-20",
  "due_date": "2024-02-20",
  "items": [
    {
      "product_id": 1,
      "description": "Web Development - Phase 1",
      "quantity": 1.00,
      "unit_price": 500000.00,
      "tax_rate": 18.00
    }
  ],
  "discount_percent": 5.00,
  "notes": "Thank you for your business!",
  "notes_internal": "Customer requested 30-day payment terms"
}
```

**Response (201):**
```json
{
  "id": 2,
  "invoice_number": "FAC-2024-0002",
  "customer_id": 1,
  "status": "DRAFT",
  "subtotal": 500000.00,
  "tax_amount": 90000.00,
  "discount_amount": 29500.00,
  "total_amount": 560500.00,
  "payment_link": "https://pay.facturepro.africa/inv_abc123"
}
```

#### Send Invoice

```http
POST /api/v1/invoices/{invoice_id}/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "send_email": true,
  "send_whatsapp": false,
  "message": "Please find attached your invoice."
}
```

#### Download Invoice PDF

```http
GET /api/v1/invoices/{invoice_id}/pdf
Authorization: Bearer {token}
Accept: application/pdf
```

---

### Payments

#### Record Payment

```http
POST /api/v1/payments
Authorization: Bearer {token}
Content-Type: application/json

{
  "invoice_id": 1,
  "amount": 590000.00,
  "method": "MOBILE_MONEY",
  "operator": "ORANGE",
  "phone_number": "+2250701234567",
  "reference": "TX123456789",
  "notes": "Payment via Orange Money"
}
```

**Payment Methods:**
- `MOBILE_MONEY` - Orange, MTN, Wave, Moov, etc.
- `CASH` - Cash payment
- `BANK_TRANSFER` - Bank wire transfer
- `CARD` - Credit/Debit card
- `CHEQUE` - Cheque payment

#### Payment Link (Mobile Money)

```http
POST /api/v1/payments/create-link
Authorization: Bearer {token}
Content-Type: application/json

{
  "invoice_id": 1,
  "provider": "cinetpay",
  "phone_number": "+2250701234567",
  "return_url": "https://app.facturepro.africa/payment/success"
}
```

**Response:**
```json
{
  "payment_url": "https://pay.cinetpay.com/...",
  "transaction_id": "TXN123456",
  "expires_at": "2024-01-20T12:00:00Z"
}
```

---

### Quotes

#### Create Quote

```http
POST /api/v1/quotes
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": 1,
  "expiry_date": "2024-02-20",
  "items": [
    {
      "description": "E-commerce Website",
      "quantity": 1.00,
      "unit_price": 1500000.00,
      "tax_rate": 18.00
    }
  ],
  "notes": "Quote valid for 30 days",
  "terms": "50% deposit required before work begins"
}
```

#### Convert Quote to Invoice

```http
POST /api/v1/quotes/{quote_id}/convert
Authorization: Bearer {token}
```

---

### Reports

#### Sales Report

```http
GET /api/v1/reports/sales?from_date=2024-01-01&to_date=2024-01-31&group_by=day
Authorization: Bearer {token}
```

**Response:**
```json
{
  "period": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  },
  "summary": {
    "total_revenue": 15000000.00,
    "total_invoices": 45,
    "total_paid": 12000000.00,
    "total_pending": 3000000.00
  },
  "data": [
    {
      "date": "2024-01-01",
      "invoices_count": 5,
      "revenue": 2500000.00,
      "paid": 2000000.00
    }
  ]
}
```

#### Dashboard Statistics

```http
GET /api/v1/dashboard/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "revenue": {
    "current_month": 8500000.00,
    "previous_month": 7200000.00,
    "growth_percent": 18.06
  },
  "invoices": {
    "total": 150,
    "draft": 10,
    "sent": 80,
    "paid": 50,
    "overdue": 10
  },
  "customers": {
    "total": 75,
    "new_this_month": 8
  },
  "top_customers": [
    {
      "name": "Enterprise ABC",
      "revenue": 2500000.00,
      "invoices_count": 5
    }
  ]
}
```

---

### Admin Endpoints

> **Note:** Admin endpoints require `role: admin`

#### Platform Statistics

```http
GET /api/v1/admin/stats
Authorization: Bearer {admin_token}
```

#### List All Organisations

```http
GET /api/v1/admin/organisations
Authorization: Bearer {admin_token}
```

#### Create Backup

```http
POST /api/v1/backups
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "backup_type": "full",
  "upload_to_cloud": true
}
```

#### List Backups

```http
GET /api/v1/backups
Authorization: Bearer {admin_token}
```

---

## Webhooks

Configure webhooks to receive real-time notifications.

### Supported Events

| Event | Description |
|-------|-------------|
| `invoice.created` | New invoice created |
| `invoice.sent` | Invoice sent to customer |
| `invoice.paid` | Invoice fully paid |
| `invoice.overdue` | Invoice past due date |
| `payment.received` | Payment received |
| `customer.created` | New customer created |
| `subscription.created` | New subscription |
| `subscription.cancelled` | Subscription cancelled |

### Webhook Payload

```json
{
  "event": "invoice.paid",
  "timestamp": "2024-01-20T10:30:00Z",
  "data": {
    "invoice_id": 1,
    "invoice_number": "FAC-2024-0001",
    "customer_id": 1,
    "amount": 590000.00,
    "currency": "XOF"
  },
  "signature": "sha256=abc123..."
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { FactureProClient } from '@savana/facturepro-sdk';

const client = new FactureProClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.facturepro.africa'
});

// Create invoice
const invoice = await client.invoices.create({
  customer_id: 1,
  items: [
    {
      description: 'Service',
      quantity: 1,
      unit_price: 100000,
      tax_rate: 18
    }
  ]
});

// Send invoice
await client.invoices.send(invoice.id, {
  send_email: true
});
```

### Python

```python
from facturepro import FactureProClient

client = FactureProClient(
    api_key='your_api_key',
    base_url='https://api.facturepro.africa'
)

# Create customer
customer = client.customers.create({
    'name': 'New Customer',
    'email': 'customer@example.com',
    'phone': '+2250701234567'
})

# Create and send invoice
invoice = client.invoices.create({
    'customer_id': customer.id,
    'items': [
        {
            'description': 'Service',
            'quantity': 1,
            'unit_price': 100000,
            'tax_rate': 18
        }
    ]
})

client.invoices.send(invoice.id, send_email=True)
```

---

## Testing

### Sandbox Mode

Use sandbox credentials for testing:

```
Base URL: https://api-sandbox.facturepro.africa
Test API Key: sk_test_xxxxx
```

### Test Payment Providers

| Provider | Test Number | OTP |
|----------|-------------|-----|
| Orange Money | +2250700000001 | 123456 |
| MTN MoMo | +2250500000001 | 123456 |
| Wave | +2250700000002 | N/A |

---

## Support

- **Documentation:** https://docs.facturepro.africa
- **API Status:** https://status.facturepro.africa
- **Support Email:** support@facturepro.africa
- **WhatsApp:** +225 07 00 00 00 00

---

## Changelog

### v1.2.0 (2024-01-15)
- Added email verification flow
- Added password reset functionality
- Added backup API endpoints
- Improved webhook signatures

### v1.1.0 (2024-01-01)
- Added multi-language support (FR, EN, Wolof, Swahili)
- Added 2FA authentication
- Added rate limiting

### v1.0.0 (2023-12-01)
- Initial release
- Core invoicing features
- Payment integration (CinetPay, Paystack, M-Pesa)
