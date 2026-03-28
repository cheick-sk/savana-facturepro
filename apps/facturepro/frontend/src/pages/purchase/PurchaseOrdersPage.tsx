import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Truck,
  Eye,
  Download
} from 'lucide-react';

interface Supplier {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

interface PurchaseOrderItem {
  id: number;
  product_id: number | null;
  description: string;
  quantity: number;
  quantity_received: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier: Supplier;
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
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Brouillon', color: 'text-gray-600', bg: 'bg-gray-100' },
  SENT: { label: 'Envoyée', color: 'text-blue-600', bg: 'bg-blue-100' },
  CONFIRMED: { label: 'Confirmée', color: 'text-indigo-600', bg: 'bg-indigo-100' },
  PARTIAL: { label: 'Partielle', color: 'text-orange-600', bg: 'bg-orange-100' },
  RECEIVED: { label: 'Reçue', color: 'text-green-600', bg: 'bg-green-100' },
  CANCELLED: { label: 'Annulée', color: 'text-red-600', bg: 'bg-red-100' },
};

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReceptionModal, setShowReceptionModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [filter, setFilter] = useState({ supplier_id: '', status: '', search: '' });

  // Form state for new PO
  const [formData, setFormData] = useState({
    supplier_id: '',
    expected_date: '',
    supplier_reference: '',
    currency: 'XOF',
    notes: '',
    terms: '',
    items: [{ product_id: '', description: '', quantity: '1', unit_price: '', tax_rate: '0' }]
  });

  // Reception form state
  const [receptionData, setReceptionData] = useState({
    notes: '',
    items: [] as { order_item_id: number; quantity_received: string }[]
  });

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/purchase-orders', { params: filter });
      setOrders(response.data.items || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data.items || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.items || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        supplier_id: parseInt(formData.supplier_id),
        expected_date: formData.expected_date || null,
        items: formData.items.map(item => ({
          ...item,
          product_id: item.product_id ? parseInt(item.product_id) : null,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          tax_rate: parseFloat(item.tax_rate),
        }))
      };
      await api.post('/purchase-orders', payload);
      toast.success('Commande créée avec succès');
      setShowModal(false);
      resetForm();
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const handleSend = async (id: number) => {
    try {
      await api.post(`/purchase-orders/${id}/send`);
      toast.success('Commande envoyée au fournisseur');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi');
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      await api.post(`/purchase-orders/${id}/confirm`);
      toast.success('Commande confirmée');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la confirmation');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) return;
    try {
      await api.delete(`/purchase-orders/${id}`);
      toast.success('Commande annulée');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'annulation');
    }
  };

  const handleDownloadPDF = async (id: number, poNumber: string) => {
    try {
      const response = await api.get(`/purchase-orders/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bon_commande_${poNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const openReceptionModal = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setReceptionData({
      notes: '',
      items: order.items.map(item => ({
        order_item_id: item.id,
        quantity_received: String(parseFloat(String(item.quantity)) - parseFloat(String(item.quantity_received)))
      }))
    });
    setShowReceptionModal(true);
  };

  const handleReception = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await api.post(`/purchase-orders/${selectedOrder.id}/receptions`, {
        ...receptionData,
        items: receptionData.items.map(item => ({
          ...item,
          quantity_received: parseFloat(item.quantity_received)
        }))
      });
      toast.success('Réception enregistrée');
      setShowReceptionModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réception');
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      expected_date: '',
      supplier_reference: '',
      currency: 'XOF',
      notes: '',
      terms: '',
      items: [{ product_id: '', description: '', quantity: '1', unit_price: '', tax_rate: '0' }]
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', description: '', quantity: '1', unit_price: '', tax_rate: '0' }]
    });
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-fill from product
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        newItems[index].description = product.name;
        newItems[index].unit_price = String(product.purchase_price || product.unit_price);
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      });
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ' + currency;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const tax = parseFloat(item.tax_rate) || 0;
      return sum + (qty * price * (1 + tax / 100));
    }, 0);
  };

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            Bons de commande
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Gérez vos commandes fournisseurs
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
        >
          <Plus size={20} />
          Nouvelle commande
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '4px' }}>Total commandes</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{orders.length}</div>
        </div>
        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '4px' }}>En attente</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
            {orders.filter(o => ['DRAFT', 'SENT', 'CONFIRMED'].includes(o.status)).length}
          </div>
        </div>
        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '4px' }}>Valeur totale</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {formatCurrency(orders.reduce((s, o) => s + o.total_amount, 0), 'XOF')}
          </div>
        </div>
        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '4px' }}>Reçues</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>
            {orders.filter(o => o.status === 'RECEIVED').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Rechercher..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          style={{ flex: 1, minWidth: '200px', padding: '10px 14px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
        />
        <select
          value={filter.supplier_id}
          onChange={(e) => setFilter({ ...filter, supplier_id: e.target.value })}
          style={{ padding: '10px 14px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px', minWidth: '180px' }}
        >
          <option value="">Tous les fournisseurs</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          style={{ padding: '10px 14px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px', minWidth: '140px' }}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(statusConfig).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <button
          onClick={fetchOrders}
          style={{ padding: '10px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '8px', cursor: 'pointer' }}
        >
          Filtrer
        </button>
      </div>

      {/* Orders Table */}
      <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Chargement...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>Aucune commande trouvée</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>N° Commande</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Fournisseur</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Statut</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Montant</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{order.po_number}</div>
                    {order.supplier_reference && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Réf: {order.supplier_reference}</div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{order.supplier?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{order.supplier?.email}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {formatDate(order.order_date)}
                    {order.expected_date && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        Livraison: {formatDate(order.expected_date)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 500,
                      ...statusConfig[order.status] ? {
                        background: statusConfig[order.status].bg,
                        color: statusConfig[order.status].color,
                      } : {}
                    }}>
                      {statusConfig[order.status]?.label || order.status}
                    </span>
                    {order.status === 'PARTIAL' && (
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {order.received_items}/{order.total_items} lignes
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatCurrency(order.total_amount, order.currency)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {order.status === 'DRAFT' && (
                        <>
                          <button onClick={() => handleSend(order.id)} title="Envoyer" style={{ padding: '6px', background: '#dbeafe', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#2563eb' }}>
                            <Send size={16} />
                          </button>
                          <button onClick={() => handleCancel(order.id)} title="Annuler" style={{ padding: '6px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#dc2626' }}>
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      {order.status === 'SENT' && (
                        <button onClick={() => handleConfirm(order.id)} title="Confirmer" style={{ padding: '6px', background: '#e0e7ff', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#4f46e5' }}>
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {['SENT', 'CONFIRMED', 'PARTIAL'].includes(order.status) && (
                        <button onClick={() => openReceptionModal(order)} title="Réceptionner" style={{ padding: '6px', background: '#dcfce7', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#16a34a' }}>
                          <Truck size={16} />
                        </button>
                      )}
                      <button onClick={() => handleDownloadPDF(order.id, order.po_number)} title="PDF" style={{ padding: '6px', background: 'var(--bg-secondary)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create PO Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Nouvelle commande fournisseur</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Fournisseur *</label>
                  <select
                    required
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Date de livraison prévue</label>
                  <input
                    type="date"
                    value={formData.expected_date}
                    onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Référence fournisseur</label>
                  <input
                    type="text"
                    value={formData.supplier_reference}
                    onChange={(e) => setFormData({ ...formData, supplier_reference: e.target.value })}
                    placeholder="N° de commande fournisseur"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Devise</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
                  >
                    <option value="XOF">FCFA (XOF)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="USD">Dollar US (USD)</option>
                  </select>
                </div>
              </div>

              {/* Items */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Lignes de commande</h3>
                  <button type="button" onClick={addItem} style={{ padding: '6px 12px', background: '#dbeafe', color: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    + Ajouter une ligne
                  </button>
                </div>
                <div style={{ border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)' }}>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 500 }}>Produit</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 500 }}>Description</th>
                        <th style={{ padding: '10px', width: '80px', textAlign: 'center', fontSize: '12px', fontWeight: 500 }}>Qté</th>
                        <th style={{ padding: '10px', width: '100px', textAlign: 'right', fontSize: '12px', fontWeight: 500 }}>Prix unit.</th>
                        <th style={{ padding: '10px', width: '70px', textAlign: 'center', fontSize: '12px', fontWeight: 500 }}>TVA %</th>
                        <th style={{ padding: '10px', width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '8px' }}>
                            <select
                              value={item.product_id}
                              onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                              style={{ width: '100%', padding: '8px', border: '1px solid var(--border-light)', borderRadius: '4px', fontSize: '13px' }}
                            >
                              <option value="">-</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              required
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              style={{ width: '100%', padding: '8px', border: '1px solid var(--border-light)', borderRadius: '4px', fontSize: '13px' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              required
                              min="0.01"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                              style={{ width: '100%', padding: '8px', border: '1px solid var(--border-light)', borderRadius: '4px', fontSize: '13px', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                              style={{ width: '100%', padding: '8px', border: '1px solid var(--border-light)', borderRadius: '4px', fontSize: '13px', textAlign: 'right' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.tax_rate}
                              onChange={(e) => updateItem(index, 'tax_rate', e.target.value)}
                              style={{ width: '100%', padding: '8px', border: '1px solid var(--border-light)', borderRadius: '4px', fontSize: '13px', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              disabled={formData.items.length === 1}
                              style={{ padding: '4px', background: 'none', border: 'none', cursor: formData.items.length === 1 ? 'not-allowed' : 'pointer', opacity: formData.items.length === 1 ? 0.5 : 1 }}
                            >
                              <XCircle size={16} color="#dc2626" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: '12px', textAlign: 'right', fontWeight: 600, fontSize: '16px' }}>
                  Total: {formatCurrency(calculateTotal(), formData.currency)}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 500 }}>
                  Créer la commande
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '10px', cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reception Modal */}
      {showReceptionModal && selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Réceptionner la commande</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{selectedOrder.po_number} - {selectedOrder.supplier?.name}</p>
            <form onSubmit={handleReception}>
              <div style={{ border: '1px solid var(--border-light)', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 500 }}>Article</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 500 }}>Commandé</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 500 }}>Déjà reçu</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 500 }}>À recevoir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 500 }}>{item.description}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{formatCurrency(item.unit_price, selectedOrder.currency)} / unité</div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#16a34a' }}>{item.quantity_received}</td>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="number"
                            min="0"
                            max={parseFloat(String(item.quantity)) - parseFloat(String(item.quantity_received))}
                            step="0.01"
                            value={receptionData.items[index]?.quantity_received || '0'}
                            onChange={(e) => {
                              const newItems = [...receptionData.items];
                              newItems[index] = { ...newItems[index], quantity_received: e.target.value };
                              setReceptionData({ ...receptionData, items: newItems });
                            }}
                            style={{ width: '80px', padding: '6px', border: '1px solid var(--border-light)', borderRadius: '4px', textAlign: 'center' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Notes</label>
                <textarea
                  value={receptionData.notes}
                  onChange={(e) => setReceptionData({ ...receptionData, notes: e.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }}
                  placeholder="Notes sur la réception..."
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 500 }}>
                  Valider la réception
                </button>
                <button type="button" onClick={() => { setShowReceptionModal(false); setSelectedOrder(null); }} style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '10px', cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
