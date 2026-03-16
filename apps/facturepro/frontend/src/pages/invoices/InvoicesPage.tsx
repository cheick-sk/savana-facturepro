import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Send, Eye, Download } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:   { label: 'Brouillon', bg: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' },
  SENT:    { label: 'Envoyée',   bg: 'var(--color-background-info)',      color: 'var(--color-text-info)' },
  PAID:    { label: 'Payée',     bg: 'var(--color-background-success)',   color: 'var(--color-text-success)' },
  OVERDUE: { label: 'En retard', bg: 'var(--color-background-danger)',    color: 'var(--color-text-danger)' },
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [form, setForm] = useState({ customer_id: '', currency: 'XOF', notes: '', due_date: '' })
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, product_id: null as number | null }])
  const navigate = useNavigate()

  const load = () => api.get('/invoices', { params: { page, size: 20, status: statusFilter || undefined } })
    .then(r => { setInvoices(r.data.items); setTotal(r.data.total) })

  useEffect(() => { load() }, [page, statusFilter])
  useEffect(() => {
    api.get('/customers', { params: { size: 100 } }).then(r => setCustomers(r.data.items || []))
    api.get('/products', { params: { size: 100 } }).then(r => setProducts(r.data.items || []))
  }, [])

  const addItem = () => setItems(i => [...i, { description: '', quantity: 1, unit_price: 0, tax_rate: 0, product_id: null }])
  const updateItem = (idx: number, field: string, val: any) => setItems(items.map((it, i) => i === idx ? { ...it, [field]: val } : it))
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const selectProduct = (idx: number, pid: number) => {
    const p = products.find(p => p.id === pid)
    if (p) updateItem(idx, 'product_id', pid)
    if (p) updateItem(idx, 'description', p.name)
    if (p) updateItem(idx, 'unit_price', p.unit_price)
    if (p) updateItem(idx, 'tax_rate', p.tax_rate)
  }

  const createInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        customer_id: +form.customer_id, currency: form.currency,
        notes: form.notes || undefined, due_date: form.due_date || undefined,
        items: items.map(it => ({ ...it, quantity: +it.quantity, unit_price: +it.unit_price, tax_rate: +it.tax_rate })),
      }
      const { data } = await api.post('/invoices', payload)
      toast.success(`Facture ${data.invoice_number} créée`)
      setShowCreate(false)
      setItems([{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, product_id: null }])
      setForm({ customer_id: '', currency: 'XOF', notes: '', due_date: '' })
      load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Erreur') }
  }

  const sendInvoice = async (id: number) => {
    try { await api.post(`/invoices/${id}/send`); toast.success('Facture envoyée par email'); load() }
    catch (err: any) { toast.error(err?.response?.data?.detail || 'Erreur envoi') }
  }

  const downloadPdf = (id: number) => window.open(`/api/v1/invoices/${id}/pdf`, '_blank')

  const subtotal = items.reduce((s, i) => s + (+i.quantity) * (+i.unit_price), 0)
  const tax = items.reduce((s, i) => s + (+i.quantity) * (+i.unit_price) * (+i.tax_rate) / 100, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Factures</h1><p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>{total} facture(s)</p></div>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}><Plus size={14} /> Nouvelle facture</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['', 'DRAFT', 'SENT', 'PAID', 'OVERDUE'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }} style={{ fontSize: 12, padding: '5px 12px', background: statusFilter === s ? 'var(--color-background-secondary)' : 'none', fontWeight: statusFilter === s ? 500 : 400 }}>
            {s === '' ? 'Toutes' : STATUS_LABELS[s]?.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 20, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 500 }}>Nouvelle facture</h3>
          <form onSubmit={createInvoice}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Client *</label>
                <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} required style={{ width: '100%' }}>
                  <option value="">-- Choisir --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Devise</label><input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} maxLength={5} /></div>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Échéance</label><input type="datetime-local" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><label style={{ fontSize: 12, fontWeight: 500 }}>Lignes de facturation</label><button type="button" onClick={addItem} style={{ fontSize: 12, padding: '4px 10px' }}>+ Ligne</button></div>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 60px 80px auto', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                  <div>
                    {idx === 0 && <label style={{ fontSize: 11, display: 'block', marginBottom: 3, color: 'var(--color-text-secondary)' }}>Description</label>}
                    <select onChange={e => selectProduct(idx, +e.target.value)} style={{ width: '100%', marginBottom: 4 }}>
                      <option value="">Saisir ou choisir...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" style={{ width: '100%', boxSizing: 'border-box' }} required />
                  </div>
                  <div>{idx === 0 && <label style={{ fontSize: 11, display: 'block', marginBottom: 3, color: 'var(--color-text-secondary)' }}>Qté</label>}<input type="number" min="0.01" step="0.01" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} /></div>
                  <div>{idx === 0 && <label style={{ fontSize: 11, display: 'block', marginBottom: 3, color: 'var(--color-text-secondary)' }}>Prix unit.</label>}<input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} /></div>
                  <div>{idx === 0 && <label style={{ fontSize: 11, display: 'block', marginBottom: 3, color: 'var(--color-text-secondary)' }}>TVA %</label>}<input type="number" min="0" max="100" step="0.1" value={item.tax_rate} onChange={e => updateItem(idx, 'tax_rate', e.target.value)} /></div>
                  <div>{idx === 0 && <label style={{ fontSize: 11, display: 'block', marginBottom: 3, color: 'var(--color-text-secondary)' }}>Total</label>}<div style={{ padding: '7px 0', fontSize: 13, fontWeight: 500 }}>{fmt((+item.quantity) * (+item.unit_price))}</div></div>
                  <button type="button" onClick={() => removeItem(idx)} style={{ padding: '7px 8px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>✕</button>
                </div>
              ))}
              <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--color-text-secondary)' }}>Sous-total: {fmt(subtotal)} {form.currency} · TVA: {fmt(tax)} {form.currency} · <strong>Total: {fmt(subtotal + tax)} {form.currency}</strong></div>
            </div>
            <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Notes</label><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes optionnelles..." style={{ width: '100%', boxSizing: 'border-box' }} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit">Créer la facture</button>
              <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'none', color: 'var(--color-text-secondary)' }}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
              {['Numéro', 'Client', 'Statut', 'Montant', 'Échéance', 'Date', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => {
              const st = STATUS_LABELS[inv.status] || STATUS_LABELS.DRAFT
              return (
                <tr key={inv.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, fontFamily: 'monospace', fontSize: 12 }}>{inv.invoice_number}</td>
                  <td style={{ padding: '10px 14px' }}>{inv.customer?.name}</td>
                  <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color }}>{st.label}</span></td>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{fmt(inv.total_amount)} {inv.currency}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{new Date(inv.created_at).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button title="Voir" onClick={() => navigate(`/invoices/${inv.id}`)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}><Eye size={13} /></button>
                      <button title="Télécharger PDF" onClick={() => downloadPdf(inv.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}><Download size={13} /></button>
                      {inv.status === 'DRAFT' && <button title="Envoyer" onClick={() => sendInvoice(inv.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-info)', padding: 4 }}><Send size={13} /></button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {invoices.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>Aucune facture</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</button>
        <span style={{ padding: '6px 10px', fontSize: 12 }}>Page {page}</span>
        <button disabled={invoices.length < 20} onClick={() => setPage(p => p + 1)}>Suivant</button>
      </div>
    </div>
  )
}
