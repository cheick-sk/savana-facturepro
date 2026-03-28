import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  FileText,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';

interface Supplier {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

interface SupplierPayment {
  id: number;
  supplier_invoice_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

interface SupplierInvoice {
  id: number;
  supplier_id: number;
  supplier: Supplier;
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

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'En attente', color: 'text-orange-600', bg: 'bg-orange-100' },
  partially_paid: { label: 'Partiel', color: 'text-blue-600', bg: 'bg-blue-100' },
  paid: { label: 'Payée', color: 'text-green-600', bg: 'bg-green-100' },
  overdue: { label: 'En retard', color: 'text-red-600', bg: 'bg-red-100' },
  cancelled: { label: 'Annulée', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const paymentMethods = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
  { value: 'CHECK', label: 'Chèque' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
];

export default function SupplierInvoicesPage() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const [filter, setFilter] = useState({ supplier_id: '', status: '', overdue: false });

  // Form state for new invoice
  const [formData, setFormData] = useState({
    supplier_id: '',
    purchase_order_id: '',
    invoice_number: '',
    supplier_reference: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    subtotal: '',
    tax_amount: '0',
    total_amount: '0',
    currency: 'XOF',
    notes: '',
  });

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'BANK_TRANSFER',
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });

  useEffect(() => {
    fetchInvoices();
    fetchSuppliers();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/supplier-invoices', { params: filter });
      setInvoices(response.data.items || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des factures');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        supplier_id: parseInt(formData.supplier_id),
        purchase_order_id: formData.purchase_order_id ? parseInt(formData.purchase_order_id) : null,
        due_date: formData.due_date || null,
        subtotal: parseFloat(formData.subtotal),
        tax_amount: parseFloat(formData.tax_amount),
        total_amount: parseFloat(formData.total_amount),
      };
      await api.post('/supplier-invoices', payload);
      toast.success('Facture fournisseur créée');
      setShowModal(false);
      resetForm();
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const openPaymentModal = (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: String(invoice.balance_due),
      payment_method: 'BANK_TRANSFER',
      payment_date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      await api.post(`/supplier-invoices/${selectedInvoice.id}/pay`, {
        ...paymentData,
        amount: parseFloat(paymentData.amount),
      });
      toast.success('Paiement enregistré');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du paiement');
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      purchase_order_id: '',
      invoice_number: '',
      supplier_reference: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      subtotal: '',
      tax_amount: '0',
      total_amount: '0',
      currency: 'XOF',
      notes: '',
    });
  };

  // Auto-calculate total
  useEffect(() => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const tax = parseFloat(formData.tax_amount) || 0;
    setFormData(prev => ({ ...prev, total_amount: String(subtotal + tax) }));
  }, [formData.subtotal, formData.tax_amount]);

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

  const isOverdue = (invoice: SupplierInvoice) => {
    if (['paid', 'cancelled'].includes(invoice.status)) return false;
    if (!invoice.due_date) return false;
    return new Date(invoice.due_date) < new Date();
  };

  // Calculate summary
  const totalPayable = invoices.filter(i => !['paid', 'cancelled'].includes(i.status)).reduce((s, i) => s + i.balance_due, 0);
  const totalOverdue = invoices.filter(i => isOverdue(i)).reduce((s, i) => s + i.balance_due, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.amount_paid, 0);

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            Factures fournisseurs
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Gérez les factures reçues de vos fournisseurs
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
          Nouvelle facture
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '8px' }}>
            <DollarSign size={16} />
            Total à payer
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {formatCurrency(totalPayable, 'XOF')}
          </div>
        </div>
        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '8px' }}>
            <AlertTriangle size={16} />
            En retard
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>
            {formatCurrency(totalOverdue, 'XOF')}
          </div>
        </div>
        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '8px' }}>
            <CheckCircle size={16} />
            Total payé
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>
            {formatCurrency(totalPaid, 'XOF')}
          </div>
        </div>
        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '8px' }}>
            <FileText size={16} />
            Factures
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {invoices.length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filter.overdue}
            onChange={(e) => setFilter({ ...filter, overdue: e.target.checked })}
            style={{ width: '16px', height: '16px' }}
          />
          En retard uniquement
        </label>
        <button
          onClick={fetchInvoices}
          style={{ padding: '10px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '8px', cursor: 'pointer' }}
        >
          Filtrer
        </button>
      </div>

      {/* Invoices Table */}
      <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Chargement...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>Aucune facture trouvée</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>N° Facture</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Fournisseur</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Échéance</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Statut</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Total</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Reste</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{invoice.invoice_number}</div>
                    {invoice.supplier_reference && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Réf: {invoice.supplier_reference}</div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{invoice.supplier?.name}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {formatDate(invoice.invoice_date)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {invoice.due_date ? (
                      <div style={{ color: isOverdue(invoice) ? '#dc2626' : 'var(--text-secondary)' }}>
                        {formatDate(invoice.due_date)}
                        {isOverdue(invoice) && (
                          <AlertTriangle size={14} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 500,
                      ...statusConfig[invoice.status] ? {
                        background: statusConfig[invoice.status].bg,
                        color: statusConfig[invoice.status].color,
                      } : {}
                    }}>
                      {statusConfig[invoice.status]?.label || invoice.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatCurrency(invoice.total_amount, invoice.currency)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: invoice.balance_due > 0 ? '#f59e0b' : '#22c55e' }}>
                    {formatCurrency(invoice.balance_due, invoice.currency)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                      <button
                        onClick={() => openPaymentModal(invoice)}
                        title="Enregistrer un paiement"
                        style={{
                          padding: '6px 12px',
                          background: '#dcfce7',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#16a34a',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        Payer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Nouvelle facture fournisseur</h2>
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
                    <option value="">Sélectionner</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>N° Facture *</label>
                  <input
                    type="text"
                    required
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="N° de la facture fournisseur"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Date facture *</label>
                  <input
                    type="date"
                    required
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Date d'échéance</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Sous-total HT *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.subtotal}
                    onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>TVA</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Total TTC</label>
                  <input
                    type="text"
                    readOnly
                    value={formatCurrency(parseFloat(formData.total_amount) || 0, formData.currency)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px', background: 'var(--bg-secondary)' }}
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
                  Créer la facture
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '10px', cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Enregistrer un paiement</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {selectedInvoice.invoice_number} - {selectedInvoice.supplier?.name}
            </p>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Total facture:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Déjà payé:</span>
                <span style={{ fontWeight: 600, color: '#22c55e' }}>{formatCurrency(selectedInvoice.amount_paid, selectedInvoice.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '16px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                <span>Reste à payer:</span>
                <span style={{ color: '#f59e0b' }}>{formatCurrency(selectedInvoice.balance_due, selectedInvoice.currency)}</span>
              </div>
            </div>
            <form onSubmit={handlePayment}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Montant à payer *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    max={selectedInvoice.balance_due}
                    step="0.01"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Mode de paiement</label>
                  <select
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
                  >
                    {paymentMethods.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Date</label>
                  <input
                    type="date"
                    value={paymentData.payment_date}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Référence</label>
                  <input
                    type="text"
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                    placeholder="N° de virement, chèque..."
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 500 }}>
                  Enregistrer le paiement
                </button>
                <button type="button" onClick={() => { setShowPaymentModal(false); setSelectedInvoice(null); }} style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '10px', cursor: 'pointer' }}>
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
