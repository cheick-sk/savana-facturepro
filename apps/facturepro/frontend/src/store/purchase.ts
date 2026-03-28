import { create } from 'zustand';
import api from '../lib/api';

// Types
export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  };
  status: string;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  supplier_reference: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  notes: string | null;
  terms: string | null;
  total_items: number;
  received_items: number;
  items: PurchaseOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: number;
  product_id: number | null;
  description: string;
  quantity: number;
  quantity_received: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

export interface SupplierInvoice {
  id: number;
  supplier_id: number;
  supplier: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  };
  purchase_order_id: number | null;
  invoice_number: string;
  supplier_reference: string | null;
  invoice_date: string;
  due_date: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  notes: string | null;
  payments: SupplierPayment[];
  created_at: string;
}

export interface SupplierPayment {
  id: number;
  supplier_invoice_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface PurchaseReception {
  id: number;
  purchase_order_id: number;
  reception_number: string;
  reception_date: string;
  status: string;
  notes: string | null;
  items: ReceptionItem[];
  created_at: string;
}

export interface ReceptionItem {
  id: number;
  order_item_id: number;
  quantity_received: number;
  notes: string | null;
}

interface PurchaseState {
  purchaseOrders: PurchaseOrder[];
  currentPurchaseOrder: PurchaseOrder | null;
  receptions: PurchaseReception[];
  supplierInvoices: SupplierInvoice[];
  currentInvoice: SupplierInvoice | null;
  loading: boolean;
  error: string | null;

  // Purchase Orders
  fetchPurchaseOrders: (params?: Record<string, any>) => Promise<void>;
  fetchPurchaseOrder: (id: number) => Promise<void>;
  createPurchaseOrder: (data: any) => Promise<PurchaseOrder>;
  updatePurchaseOrder: (id: number, data: any) => Promise<void>;
  cancelPurchaseOrder: (id: number) => Promise<void>;
  sendPurchaseOrder: (id: number) => Promise<void>;
  confirmPurchaseOrder: (id: number) => Promise<void>;

  // Receptions
  createReception: (poId: number, data: any) => Promise<PurchaseReception>;
  fetchReceptions: (params?: Record<string, any>) => Promise<void>;

  // Supplier Invoices
  fetchSupplierInvoices: (params?: Record<string, any>) => Promise<void>;
  fetchSupplierInvoice: (id: number) => Promise<void>;
  createSupplierInvoice: (data: any) => Promise<SupplierInvoice>;
  updateSupplierInvoice: (id: number, data: any) => Promise<void>;
  recordPayment: (invoiceId: number, data: any) => Promise<SupplierPayment>;

  // Helpers
  clearError: () => void;
  reset: () => void;
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  purchaseOrders: [],
  currentPurchaseOrder: null,
  receptions: [],
  supplierInvoices: [],
  currentInvoice: null,
  loading: false,
  error: null,

  // Purchase Orders
  fetchPurchaseOrders: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/purchase-orders', { params });
      set({ purchaseOrders: response.data.items || [], loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors du chargement', loading: false });
    }
  },

  fetchPurchaseOrder: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/purchase-orders/${id}`);
      set({ currentPurchaseOrder: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors du chargement', loading: false });
    }
  },

  createPurchaseOrder: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/purchase-orders', data);
      const orders = get().purchaseOrders;
      set({ purchaseOrders: [response.data, ...orders], loading: false });
      return response.data;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors de la création', loading: false });
      throw error;
    }
  },

  updatePurchaseOrder: async (id: number, data: any) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/purchase-orders/${id}`, data);
      const orders = get().purchaseOrders.map(o => o.id === id ? response.data : o);
      set({ purchaseOrders: orders, currentPurchaseOrder: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors de la mise à jour', loading: false });
      throw error;
    }
  },

  cancelPurchaseOrder: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/purchase-orders/${id}`);
      const orders = get().purchaseOrders.filter(o => o.id !== id);
      set({ purchaseOrders: orders, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors de l\'annulation', loading: false });
      throw error;
    }
  },

  sendPurchaseOrder: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/purchase-orders/${id}/send`);
      const orders = get().purchaseOrders.map(o => o.id === id ? response.data : o);
      set({ purchaseOrders: orders, currentPurchaseOrder: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors de l\'envoi', loading: false });
      throw error;
    }
  },

  confirmPurchaseOrder: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/purchase-orders/${id}/confirm`);
      const orders = get().purchaseOrders.map(o => o.id === id ? response.data : o);
      set({ purchaseOrders: orders, currentPurchaseOrder: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors de la confirmation', loading: false });
      throw error;
    }
  },

  // Receptions
  createReception: async (poId: number, data: any) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/purchase-orders/${poId}/receptions`, data);
      // Refresh the purchase order to get updated quantities
      await get().fetchPurchaseOrder(poId);
      set({ loading: false });
      return response.data;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors de la réception', loading: false });
      throw error;
    }
  },

  fetchReceptions: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/receptions', { params });
      set({ receptions: response.data.items || [], loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors du chargement', loading: false });
    }
  },

  // Supplier Invoices
  fetchSupplierInvoices: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/supplier-invoices', { params });
      set({ supplierInvoices: response.data.items || [], loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors du chargement', loading: false });
    }
  },

  fetchSupplierInvoice: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/supplier-invoices/${id}`);
      set({ currentInvoice: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors du chargement', loading: false });
    }
  },

  createSupplierInvoice: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/supplier-invoices', data);
      const invoices = get().supplierInvoices;
      set({ supplierInvoices: [response.data, ...invoices], loading: false });
      return response.data;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors de la création', loading: false });
      throw error;
    }
  },

  updateSupplierInvoice: async (id: number, data: any) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/supplier-invoices/${id}`, data);
      const invoices = get().supplierInvoices.map(i => i.id === id ? response.data : i);
      set({ supplierInvoices: invoices, currentInvoice: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors de la mise à jour', loading: false });
      throw error;
    }
  },

  recordPayment: async (invoiceId: number, data: any) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/supplier-invoices/${invoiceId}/pay`, data);
      // Refresh the invoice to get updated amounts
      await get().fetchSupplierInvoice(invoiceId);
      set({ loading: false });
      return response.data;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Erreur lors du paiement', loading: false });
      throw error;
    }
  },

  // Helpers
  clearError: () => set({ error: null }),
  reset: () => set({
    purchaseOrders: [],
    currentPurchaseOrder: null,
    receptions: [],
    supplierInvoices: [],
    currentInvoice: null,
    loading: false,
    error: null,
  }),
}));
