/**
 * FacturePro Africa JavaScript SDK
 * 
 * Official JavaScript/TypeScript SDK for the FacturePro Africa API.
 * 
 * @packageDocumentation
 * 
 * @example
 * ```typescript
 * import { FactureProClient } from '@facturepro/africa-sdk';
 * 
 * const client = new FactureProClient({ apiKey: 'fp_your_api_key' });
 * 
 * // List invoices
 * const invoices = await client.invoices.list();
 * 
 * // Create a customer
 * const customer = await client.customers.create({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   phone: '+2250700000000'
 * });
 * 
 * // Create an invoice
 * const invoice = await client.invoices.create({
 *   customer_id: customer.id,
 *   items: [
 *     { description: 'Service A', quantity: 1, unit_price: 50000 }
 *   ]
 * });
 * ```
 */

import fetch, { RequestInit, Response } from 'node-fetch';

// Types
export interface FactureProConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  notes?: string;
  customer_id: number;
  items: InvoiceItem[];
  created_at: string;
}

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
  product_id?: number;
}

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  tax_id?: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  sku?: string;
  unit_price: number;
  unit: string;
  tax_rate: number;
  category_id?: number;
  is_active: boolean;
}

export interface WebhookEndpoint {
  id: number;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at?: string;
  last_failure_at?: string;
  consecutive_failures: number;
  created_at: string;
  secret?: string;
}

export interface APIKey {
  id: number;
  name: string;
  description?: string;
  key_prefix: string;
  masked_key: string;
  key?: string;
  secret?: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  created_by: number;
}

// Exceptions
export class FactureProError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'FactureProError';
  }
}

export class AuthenticationError extends FactureProError {
  constructor(message: string = 'Invalid or expired API key') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends FactureProError {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfter: number = 60
  ) {
    super(`${message}. Retry after ${retryAfter} seconds.`, 429);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends FactureProError {
  constructor(
    message: string = 'Validation error',
    public errors?: any
  ) {
    super(message, 400, errors);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends FactureProError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * FacturePro Africa API Client
 */
export class FactureProClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  
  public static DEFAULT_BASE_URL = 'https://api.saasafrica.com';
  public static SANDBOX_BASE_URL = 'https://sandbox-api.saasafrica.com';
  
  private _invoices?: InvoicesResource;
  private _customers?: CustomersResource;
  private _products?: ProductsResource;
  private _webhooks?: WebhooksResource;
  private _apiKeys?: APIKeysResource;
  
  constructor(config: FactureProConfig) {
    if (!config.apiKey || !config.apiKey.startsWith('fp_')) {
      throw new Error("Invalid API key. API keys must start with 'fp_'");
    }
    
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || FactureProClient.DEFAULT_BASE_URL;
    this.timeout = config.timeout || 30000;
  }
  
  get invoices(): InvoicesResource {
    if (!this._invoices) {
      this._invoices = new InvoicesResource(this);
    }
    return this._invoices;
  }
  
  get customers(): CustomersResource {
    if (!this._customers) {
      this._customers = new CustomersResource(this);
    }
    return this._customers;
  }
  
  get products(): ProductsResource {
    if (!this._products) {
      this._products = new ProductsResource(this);
    }
    return this._products;
  }
  
  get webhooks(): WebhooksResource {
    if (!this._webhooks) {
      this._webhooks = new WebhooksResource(this);
    }
    return this._webhooks;
  }
  
  get apiKeys(): APIKeysResource {
    if (!this._apiKeys) {
      this._apiKeys = new APIKeysResource(this);
    }
    return this._apiKeys;
  }
  
  async request<T>(
    method: string,
    path: string,
    params?: Record<string, any>,
    data?: any
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1/public${path}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    const options: RequestInit = {
      method,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'FacturePro-JS/1.0.0',
      },
      timeout: this.timeout,
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url.toString(), options);
    
    if (response.status === 200 || response.status === 201) {
      return response.json();
    }
    
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.detail?.message || JSON.stringify(errorData);
    
    if (response.status === 401) {
      throw new AuthenticationError(errorMessage);
    } else if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      throw new RateLimitError(errorMessage, retryAfter);
    } else if (response.status === 400) {
      throw new ValidationError(errorMessage, errorData?.detail);
    } else if (response.status === 404) {
      throw new NotFoundError(errorMessage);
    } else {
      throw new FactureProError(
        `API error: ${response.status} - ${errorMessage}`,
        response.status
      );
    }
  }
  
  get<T>(path: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>('GET', path, params);
  }
  
  post<T>(path: string, data: any): Promise<T> {
    return this.request<T>('POST', path, undefined, data);
  }
  
  put<T>(path: string, data: any): Promise<T> {
    return this.request<T>('PUT', path, undefined, data);
  }
  
  delete(path: string): Promise<void> {
    return this.request<void>('DELETE', path);
  }
  
  static sandbox(apiKey: string, options?: Partial<FactureProConfig>): FactureProClient {
    return new FactureProClient({
      apiKey,
      baseUrl: FactureProClient.SANDBOX_BASE_URL,
      ...options,
    });
  }
}

// Base Resource
abstract class BaseResource {
  constructor(protected client: FactureProClient) {}
}

// Invoices Resource
export interface InvoiceListParams {
  status?: string;
  customer_id?: number;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface InvoiceCreateParams {
  customer_id: number;
  items: Array<{
    description: string;
    quantity?: number;
    unit_price: number;
    tax_rate?: number;
    product_id?: number;
  }>;
  due_date?: string;
  notes?: string;
  discount_percent?: number;
}

class InvoicesResource extends BaseResource {
  async list(params?: InvoiceListParams): Promise<PaginatedResponse<Invoice>> {
    return this.client.get<PaginatedResponse<Invoice>>('/invoices', params);
  }
  
  async get(invoiceId: number): Promise<Invoice> {
    return this.client.get<Invoice>(`/invoices/${invoiceId}`);
  }
  
  async create(params: InvoiceCreateParams): Promise<Invoice> {
    return this.client.post<Invoice>('/invoices', params);
  }
}

// Customers Resource
export interface CustomerListParams {
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface CustomerCreateParams {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
}

class CustomersResource extends BaseResource {
  async list(params?: CustomerListParams): Promise<PaginatedResponse<Customer>> {
    return this.client.get<PaginatedResponse<Customer>>('/customers', params);
  }
  
  async get(customerId: number): Promise<Customer> {
    return this.client.get<Customer>(`/customers/${customerId}`);
  }
  
  async create(params: CustomerCreateParams): Promise<Customer> {
    return this.client.post<Customer>('/customers', params);
  }
}

// Products Resource
export interface ProductListParams {
  search?: string;
  category_id?: number;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

class ProductsResource extends BaseResource {
  async list(params?: ProductListParams): Promise<PaginatedResponse<Product>> {
    return this.client.get<PaginatedResponse<Product>>('/products', params);
  }
  
  async get(productId: number): Promise<Product> {
    return this.client.get<Product>(`/products/${productId}`);
  }
}

// Webhooks Resource
export interface WebhookCreateParams {
  name: string;
  url: string;
  events: string[];
}

export interface WebhookUpdateParams {
  name?: string;
  url?: string;
  events?: string[];
  is_active?: boolean;
}

class WebhooksResource extends BaseResource {
  async list(includeInactive: boolean = false): Promise<WebhookEndpoint[]> {
    return this.client.get<WebhookEndpoint[]>('/webhooks', { include_inactive: includeInactive });
  }
  
  async get(webhookId: number): Promise<WebhookEndpoint> {
    return this.client.get<WebhookEndpoint>(`/webhooks/${webhookId}`);
  }
  
  async create(params: WebhookCreateParams): Promise<WebhookEndpoint> {
    return this.client.post<WebhookEndpoint>('/webhooks', params);
  }
  
  async update(webhookId: number, params: WebhookUpdateParams): Promise<WebhookEndpoint> {
    return this.client.put<WebhookEndpoint>(`/webhooks/${webhookId}`, params);
  }
  
  async delete(webhookId: number): Promise<void> {
    return this.client.delete(`/webhooks/${webhookId}`);
  }
  
  async deliveries(webhookId: number, page: number = 1, limit: number = 50): Promise<any> {
    return this.client.get(`/webhooks/${webhookId}/deliveries`, { page, limit });
  }
}

// API Keys Resource
export interface APIKeyCreateParams {
  name: string;
  scopes: string[];
  rate_limit?: number;
  description?: string;
  expires_at?: string;
}

export interface APIKeyUpdateParams {
  name?: string;
  scopes?: string[];
  rate_limit?: number;
  is_active?: boolean;
}

class APIKeysResource extends BaseResource {
  async list(includeInactive: boolean = false): Promise<APIKey[]> {
    return this.client.get<APIKey[]>('/api-keys', { include_inactive: includeInactive });
  }
  
  async get(keyId: number): Promise<APIKey> {
    return this.client.get<APIKey>(`/api-keys/${keyId}`);
  }
  
  async create(params: APIKeyCreateParams): Promise<APIKey> {
    return this.client.post<APIKey>('/api-keys', params);
  }
  
  async update(keyId: number, params: APIKeyUpdateParams): Promise<APIKey> {
    return this.client.put<APIKey>(`/api-keys/${keyId}`, params);
  }
  
  async delete(keyId: number): Promise<void> {
    return this.client.delete(`/api-keys/${keyId}`);
  }
  
  async regenerate(keyId: number): Promise<APIKey> {
    return this.client.post<APIKey>(`/api-keys/${keyId}/regenerate`, {});
  }
  
  async usage(keyId: number, days: number = 30, page: number = 1, limit: number = 50): Promise<any> {
    return this.client.get(`/api-keys/${keyId}/usage`, { days, page, limit });
  }
}

export default FactureProClient;
