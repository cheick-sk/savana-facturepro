import { create } from 'zustand'
import api from '../lib/api'

// Types
export interface OnlineStore {
  id: number
  store_id: number
  name: string
  slug: string
  custom_domain: string | null
  logo_url: string | null
  banner_url: string | null
  primary_color: string
  secondary_color: string
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  facebook_url: string | null
  instagram_url: string | null
  whatsapp_number: string | null
  currency: string
  language: string
  timezone: string
  delivery_enabled: boolean
  pickup_enabled: boolean
  guest_checkout: boolean
  cinetpay_enabled: boolean
  paystack_enabled: boolean
  mpesa_enabled: boolean
  cash_on_delivery: boolean
  meta_title: string | null
  meta_description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OnlineProduct {
  id: number
  store_id: number
  online_store_id: number
  product_id: number
  variant_id: number | null
  online_name: string | null
  online_description: string | null
  online_price: number | null
  images: string[]
  main_image_url: string | null
  online_category_id: number | null
  tags: string[]
  slug: string | null
  sync_stock: boolean
  stock_quantity: number
  low_stock_threshold: number
  is_published: boolean
  is_featured: boolean
  is_new: boolean
  is_on_sale: boolean
  sale_price: number | null
  view_count: number
  purchase_count: number
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface OnlineCategory {
  id: number
  online_store_id: number
  name: string
  slug: string
  description: string | null
  image_url: string | null
  parent_id: number | null
  display_order: number
  is_active: boolean
  created_at: string
}

export interface OnlineOrder {
  id: number
  online_store_id: number
  customer_id: number | null
  order_number: string
  customer_email: string
  customer_phone: string | null
  customer_name: string
  delivery_method: 'pickup' | 'delivery'
  shipping_address: any | null
  delivery_fee: number
  delivery_notes: string | null
  delivery_zone_id: number | null
  status: 'pending' | 'confirmed' | 'processing' | 'ready' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_method: string | null
  payment_reference: string | null
  paid_at: string | null
  subtotal: number
  tax_amount: number
  shipping_fee: number
  discount_amount: number
  total: number
  customer_notes: string | null
  internal_notes: string | null
  sale_id: number | null
  confirmed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  items: OnlineOrderItem[]
  created_at: string
  updated_at: string
}

export interface OnlineOrderItem {
  id: number
  online_product_id: number
  product_name: string
  product_image: string | null
  quantity: number
  unit_price: number
  total: number
}

export interface DeliveryZone {
  id: number
  online_store_id: number
  name: string
  description: string | null
  areas: string[]
  base_fee: number
  free_delivery_minimum: number | null
  estimated_delivery_hours: number
  is_active: boolean
  created_at: string
}

export interface Coupon {
  id: number
  online_store_id: number
  code: string
  description: string | null
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_order_amount: number | null
  max_uses: number | null
  current_uses: number
  uses_per_customer: number
  starts_at: string | null
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface EcommerceStats {
  total_orders: number
  pending_orders: number
  processing_orders: number
  completed_orders: number
  cancelled_orders: number
  total_revenue: number
  today_revenue: number
  week_revenue: number
  month_revenue: number
  total_products: number
  published_products: number
  out_of_stock: number
  total_customers: number
  new_customers_today: number
  returning_customers: number
  top_products: { id: number; name: string; total_sold: number; total_revenue: number }[]
  recent_orders: { id: number; order_number: string; customer_name: string; total: number; status: string; created_at: string }[]
  sales_by_day: { date: string; count: number; total: number }[]
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

interface EcommerceState {
  stores: OnlineStore[]
  currentStore: OnlineStore | null
  products: OnlineProduct[]
  currentProduct: OnlineProduct | null
  categories: OnlineCategory[]
  orders: OnlineOrder[]
  currentOrder: OnlineOrder | null
  deliveryZones: DeliveryZone[]
  coupons: Coupon[]
  stats: EcommerceStats | null
  loading: boolean
  error: string | null

  // Store management
  fetchStores: (storeId?: number) => Promise<OnlineStore[]>
  createStore: (data: Partial<OnlineStore>) => Promise<OnlineStore>
  fetchStore: (id: number) => Promise<OnlineStore>
  updateStore: (id: number, data: Partial<OnlineStore>) => Promise<OnlineStore>

  // Product management
  fetchProducts: (params: { online_store_id: number; is_published?: boolean; category_id?: number; search?: string; page?: number; per_page?: number }) => Promise<PaginatedResponse<OnlineProduct>>
  publishProduct: (data: Partial<OnlineProduct>) => Promise<OnlineProduct>
  fetchProduct: (id: number) => Promise<OnlineProduct>
  updateProduct: (id: number, data: Partial<OnlineProduct>) => Promise<OnlineProduct>
  unpublishProduct: (id: number) => Promise<void>
  bulkPublish: (onlineStoreId: number, productIds: number[]) => Promise<{ published: number[]; errors: any[] }>
  syncStock: (onlineStoreId: number) => Promise<{ updated: number }>

  // Category management
  fetchCategories: (onlineStoreId: number, parentId?: number) => Promise<OnlineCategory[]>
  createCategory: (data: Partial<OnlineCategory>) => Promise<OnlineCategory>
  updateCategory: (id: number, data: Partial<OnlineCategory>) => Promise<OnlineCategory>

  // Order management
  fetchOrders: (params: { online_store_id: number; status?: string; payment_status?: string; search?: string; page?: number; per_page?: number }) => Promise<PaginatedResponse<OnlineOrder>>
  fetchOrder: (id: number) => Promise<OnlineOrder>
  updateOrder: (id: number, data: Partial<OnlineOrder>) => Promise<OnlineOrder>
  confirmOrder: (id: number, notes?: string) => Promise<OnlineOrder>
  shipOrder: (id: number, notes?: string) => Promise<OnlineOrder>
  deliverOrder: (id: number, notes?: string) => Promise<OnlineOrder>
  cancelOrder: (id: number, notes?: string) => Promise<OnlineOrder>
  syncOrderToPos: (id: number) => Promise<{ sale_id: number }>

  // Delivery zones
  fetchDeliveryZones: (onlineStoreId: number) => Promise<DeliveryZone[]>
  createDeliveryZone: (data: Partial<DeliveryZone>) => Promise<DeliveryZone>
  updateDeliveryZone: (id: number, data: Partial<DeliveryZone>) => Promise<DeliveryZone>

  // Coupons
  fetchCoupons: (onlineStoreId: number) => Promise<Coupon[]>
  createCoupon: (data: Partial<Coupon>) => Promise<Coupon>
  updateCoupon: (id: number, data: Partial<Coupon>) => Promise<Coupon>

  // Stats
  fetchStats: (onlineStoreId: number) => Promise<EcommerceStats>

  clearError: () => void
}

export const useEcommerceStore = create<EcommerceState>((set, get) => ({
  stores: [],
  currentStore: null,
  products: [],
  currentProduct: null,
  categories: [],
  orders: [],
  currentOrder: null,
  deliveryZones: [],
  coupons: [],
  stats: null,
  loading: false,
  error: null,

  // Store management
  fetchStores: async (storeId) => {
    set({ loading: true, error: null })
    try {
      const params = storeId ? `?store_id=${storeId}` : ''
      const { data } = await api.get(`/ecommerce/stores${params}`)
      set({ stores: data, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch stores', loading: false })
      throw error
    }
  },

  createStore: async (storeData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/ecommerce/stores', storeData)
      set(state => ({ stores: [...state.stores, data], currentStore: data, loading: false }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to create store', loading: false })
      throw error
    }
  },

  fetchStore: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/ecommerce/stores/${id}`)
      set({ currentStore: data, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch store', loading: false })
      throw error
    }
  },

  updateStore: async (id, storeData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.put(`/ecommerce/stores/${id}`, storeData)
      set(state => ({
        stores: state.stores.map(s => s.id === id ? data : s),
        currentStore: state.currentStore?.id === id ? data : state.currentStore,
        loading: false
      }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to update store', loading: false })
      throw error
    }
  },

  // Product management
  fetchProducts: async (params) => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('online_store_id', params.online_store_id.toString())
      if (params.is_published !== undefined) queryParams.append('is_published', params.is_published.toString())
      if (params.category_id) queryParams.append('category_id', params.category_id.toString())
      if (params.search) queryParams.append('search', params.search)
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.per_page) queryParams.append('per_page', params.per_page.toString())

      const { data } = await api.get(`/ecommerce/products?${queryParams.toString()}`)
      set({ products: data.items, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch products', loading: false })
      throw error
    }
  },

  publishProduct: async (productData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/ecommerce/products', productData)
      set(state => ({ products: [...state.products, data], loading: false }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to publish product', loading: false })
      throw error
    }
  },

  fetchProduct: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/ecommerce/products/${id}`)
      set({ currentProduct: data, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch product', loading: false })
      throw error
    }
  },

  updateProduct: async (id, productData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.put(`/ecommerce/products/${id}`, productData)
      set(state => ({
        products: state.products.map(p => p.id === id ? data : p),
        currentProduct: state.currentProduct?.id === id ? data : state.currentProduct,
        loading: false
      }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to update product', loading: false })
      throw error
    }
  },

  unpublishProduct: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/ecommerce/products/${id}`)
      set(state => ({
        products: state.products.filter(p => p.id !== id),
        currentProduct: state.currentProduct?.id === id ? null : state.currentProduct,
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to unpublish product', loading: false })
      throw error
    }
  },

  bulkPublish: async (onlineStoreId, productIds) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/ecommerce/products/bulk-publish', {
        online_store_id: onlineStoreId,
        product_ids: productIds,
      })
      set({ loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to bulk publish', loading: false })
      throw error
    }
  },

  syncStock: async (onlineStoreId) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post(`/ecommerce/products/sync-stock?online_store_id=${onlineStoreId}`)
      set({ loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to sync stock', loading: false })
      throw error
    }
  },

  // Category management
  fetchCategories: async (onlineStoreId, parentId) => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('online_store_id', onlineStoreId.toString())
      if (parentId) queryParams.append('parent_id', parentId.toString())

      const { data } = await api.get(`/ecommerce/categories?${queryParams.toString()}`)
      set({ categories: data, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch categories', loading: false })
      throw error
    }
  },

  createCategory: async (categoryData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/ecommerce/categories', categoryData)
      set(state => ({ categories: [...state.categories, data], loading: false }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to create category', loading: false })
      throw error
    }
  },

  updateCategory: async (id, categoryData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.put(`/ecommerce/categories/${id}`, categoryData)
      set(state => ({
        categories: state.categories.map(c => c.id === id ? data : c),
        loading: false
      }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to update category', loading: false })
      throw error
    }
  },

  // Order management
  fetchOrders: async (params) => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('online_store_id', params.online_store_id.toString())
      if (params.status) queryParams.append('status', params.status)
      if (params.payment_status) queryParams.append('payment_status', params.payment_status)
      if (params.search) queryParams.append('search', params.search)
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.per_page) queryParams.append('per_page', params.per_page.toString())

      const { data } = await api.get(`/ecommerce/orders?${queryParams.toString()}`)
      set({ orders: data.items, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch orders', loading: false })
      throw error
    }
  },

  fetchOrder: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/ecommerce/orders/${id}`)
      set({ currentOrder: data, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch order', loading: false })
      throw error
    }
  },

  updateOrder: async (id, orderData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.put(`/ecommerce/orders/${id}`, orderData)
      set(state => ({
        orders: state.orders.map(o => o.id === id ? data : o),
        currentOrder: state.currentOrder?.id === id ? data : state.currentOrder,
        loading: false
      }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to update order', loading: false })
      throw error
    }
  },

  confirmOrder: async (id, notes) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post(`/ecommerce/orders/${id}/confirm`, { notes })
      set(state => ({
        orders: state.orders.map(o => o.id === id ? data : o),
        currentOrder: state.currentOrder?.id === id ? data : state.currentOrder,
        loading: false
      }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to confirm order', loading: false })
      throw error
    }
  },

  shipOrder: async (id, notes) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post(`/ecommerce/orders/${id}/ship`, { notes })
      set(state => ({
        orders: state.orders.map(o => o.id === id ? data : o),
        currentOrder: state.currentOrder?.id === id ? data : state.currentOrder,
        loading: false
      }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to ship order', loading: false })
      throw error
    }
  },

  deliverOrder: async (id, notes) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post(`/ecommerce/orders/${id}/deliver`, { notes })
      set(state => ({
        orders: state.orders.map(o => o.id === id ? data : o),
        currentOrder: state.currentOrder?.id === id ? data : state.currentOrder,
        loading: false
      }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to mark order as delivered', loading: false })
      throw error
    }
  },

  cancelOrder: async (id, notes) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post(`/ecommerce/orders/${id}/cancel`, { notes })
      set(state => ({
        orders: state.orders.map(o => o.id === id ? data : o),
        currentOrder: state.currentOrder?.id === id ? data : state.currentOrder,
        loading: false
      }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to cancel order', loading: false })
      throw error
    }
  },

  syncOrderToPos: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post(`/ecommerce/orders/${id}/sync-pos`)
      set({ loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to sync order to POS', loading: false })
      throw error
    }
  },

  // Delivery zones
  fetchDeliveryZones: async (onlineStoreId) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/ecommerce/delivery-zones?online_store_id=${onlineStoreId}`)
      set({ deliveryZones: data, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch delivery zones', loading: false })
      throw error
    }
  },

  createDeliveryZone: async (zoneData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/ecommerce/delivery-zones', zoneData)
      set(state => ({ deliveryZones: [...state.deliveryZones, data], loading: false }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to create delivery zone', loading: false })
      throw error
    }
  },

  updateDeliveryZone: async (id, zoneData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.put(`/ecommerce/delivery-zones/${id}`, zoneData)
      set(state => ({
        deliveryZones: state.deliveryZones.map(z => z.id === id ? data : z),
        loading: false
      }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to update delivery zone', loading: false })
      throw error
    }
  },

  // Coupons
  fetchCoupons: async (onlineStoreId) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/ecommerce/coupons?online_store_id=${onlineStoreId}`)
      set({ coupons: data, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch coupons', loading: false })
      throw error
    }
  },

  createCoupon: async (couponData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/ecommerce/coupons', couponData)
      set(state => ({ coupons: [...state.coupons, data], loading: false }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to create coupon', loading: false })
      throw error
    }
  },

  updateCoupon: async (id, couponData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.put(`/ecommerce/coupons/${id}`, couponData)
      set(state => ({
        coupons: state.coupons.map(c => c.id === id ? data : c),
        loading: false
      }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to update coupon', loading: false })
      throw error
    }
  },

  // Stats
  fetchStats: async (onlineStoreId) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/ecommerce/stats?online_store_id=${onlineStoreId}`)
      set({ stats: data, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch stats', loading: false })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))
