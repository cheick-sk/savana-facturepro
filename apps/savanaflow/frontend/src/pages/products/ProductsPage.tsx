import { useEffect, useState } from 'react'
import { Plus, Search, Edit2 } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

const EMPTY = { store_id: '', name: '', barcode: '', sku: '', category: '', unit: 'unit', sell_price: '', cost_price: '0', tax_rate: '0', stock_quantity: '0', low_stock_threshold: '10' }

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [stores, setStores] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY)

  const load = () => {
    api.get('/products', { params: { page, size: 20, search: search || undefined } })
      .then(r => { setProducts(r.data.items); setTotal(r.data.total) })
  }
  useEffect(() => { api.get('/stores').then(r => setStores(r.data)) }, [])
  useEffect(() => { load() }, [page, search])

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p: any) => ({ ...p, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, store_id: +form.store_id, sell_price: +form.sell_price, cost_price: +form.cost_price, tax_rate: +form.tax_rate, stock_quantity: +form.stock_quantity, low_stock_threshold: +form.low_stock_threshold }
    try {
      if (editing) { await api.put(`/products/${editing.id}`, payload); toast.success('Produit mis à jour') }
      else { await api.post('/products', payload); toast.success('Produit créé') }
      setShowForm(false); setEditing(null); setForm(EMPTY); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Erreur') }
  }

  const openEdit = (p: any) => {
    setEditing(p)
    setForm({ ...p, store_id: String(p.store_id), sell_price: String(p.sell_price), cost_price: String(p.cost_price), tax_rate: String(p.tax_rate), stock_quantity: String(p.stock_quantity), low_stock_threshold: String(p.low_stock_threshold) })
    setShowForm(true)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Produits</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>{total} produit(s)</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ ...EMPTY, store_id: stores[0]?.id || '' }); setShowForm(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
          <Plus size={14} /> Nouveau produit
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
        <input placeholder="Rechercher nom, code-barres..." style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' }} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 20, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 500 }}>{editing ? 'Modifier' : 'Nouveau'} produit</h3>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
              {!editing && (
                <div>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Magasin *</label>
                  <select value={form.store_id} onChange={f('store_id')} required style={{ width: '100%' }}>
                    <option value="">-- Choisir --</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {[
                { k: 'name', label: 'Nom *', req: true },
                { k: 'barcode', label: 'Code-barres' },
                { k: 'sku', label: 'SKU' },
                { k: 'category', label: 'Catégorie' },
                { k: 'unit', label: 'Unité' },
                { k: 'sell_price', label: 'Prix vente *', type: 'number', req: true },
                { k: 'cost_price', label: 'Prix coût', type: 'number' },
                { k: 'tax_rate', label: 'TVA %', type: 'number' },
                { k: 'stock_quantity', label: 'Stock initial', type: 'number' },
                { k: 'low_stock_threshold', label: 'Seuil alerte', type: 'number' },
              ].map(({ k, label, type = 'text', req }) => (
                <div key={k}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>{label}</label>
                  <input type={type} value={form[k]} onChange={f(k)} required={req} step={type === 'number' ? '0.01' : undefined} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit">{editing ? 'Mettre à jour' : 'Créer'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} style={{ background: 'none', color: 'var(--color-text-secondary)' }}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
              {['Produit', 'Catégorie', 'Code-barres', 'Prix vente', 'Stock', 'Statut', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  {p.sku && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{p.sku}</div>}
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{p.category || '—'}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12 }}>{p.barcode || '—'}</td>
                <td style={{ padding: '10px 14px', fontWeight: 500 }}>{fmt(p.sell_price)} XOF</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ color: p.is_low_stock ? 'var(--color-text-warning)' : 'var(--color-text-primary)' }}>
                    {fmt(p.stock_quantity)} {p.unit}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: p.is_active ? 'var(--color-background-success)' : 'var(--color-background-secondary)', color: p.is_active ? 'var(--color-text-success)' : 'var(--color-text-secondary)' }}>
                    {p.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <button onClick={() => openEdit(p)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}>
                    <Edit2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>Aucun produit</div>}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
        <span>{total} produit(s)</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</button>
          <span style={{ padding: '6px 10px' }}>Page {page}</span>
          <button disabled={products.length < 20} onClick={() => setPage(p => p + 1)}>Suivant</button>
        </div>
      </div>
    </div>
  )
}
