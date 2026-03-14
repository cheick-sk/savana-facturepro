import { useEffect, useState } from 'react'
import { Plus, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n * 100) / 100)

export default function StockPage() {
  const [movements, setMovements] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [form, setForm] = useState({ product_id: '', movement_type: 'IN', quantity: '1', reason: '', reference: '' })

  const loadMovements = () => api.get('/stock/movements', { params: { size: 50 } }).then(r => setMovements(r.data.items || []))
  const loadProducts = () => api.get('/products', { params: { size: 100, low_stock: lowStockOnly } }).then(r => setProducts(r.data.items || []))

  useEffect(() => { loadMovements(); loadProducts() }, [lowStockOnly])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/stock/adjust', { ...form, product_id: +form.product_id, quantity: +form.quantity })
      toast.success('Mouvement enregistré')
      setShowForm(false)
      setForm({ product_id: '', movement_type: 'IN', quantity: '1', reason: '', reference: '' })
      loadMovements(); loadProducts()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Erreur') }
  }

  const mvIcon = (t: string) => t === 'IN' ? <ArrowUp size={12} style={{ color: 'var(--color-text-success)' }} /> : t === 'OUT' ? <ArrowDown size={12} style={{ color: 'var(--color-text-danger)' }} /> : <RotateCcw size={12} style={{ color: 'var(--color-text-secondary)' }} />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Stock</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>Mouvements et niveaux de stock</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
          <Plus size={14} /> Mouvement
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 20, marginBottom: 16 }}>
          <form onSubmit={submit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Produit *</label>
              <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} required style={{ minWidth: 200 }}>
                <option value="">-- Choisir --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (stock: {fmt(p.stock_quantity)})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Type *</label>
              <select value={form.movement_type} onChange={e => setForm({ ...form, movement_type: e.target.value })}>
                <option value="IN">Entrée</option>
                <option value="OUT">Sortie</option>
                <option value="ADJUST">Ajustement</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Quantité *</label>
              <input type="number" min="0.01" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required style={{ width: 100 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Référence</label>
              <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="BL-001" />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Motif</label>
              <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Réapprovisionnement..." />
            </div>
            <button type="submit">Enregistrer</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', color: 'var(--color-text-secondary)' }}>Annuler</button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Low stock alerts */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Niveaux de stock</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} />
              Stocks faibles seulement
            </label>
          </div>
          <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
            {products.slice(0, 15).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{p.category || 'Sans catégorie'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: p.is_low_stock ? 'var(--color-text-warning)' : 'var(--color-text-primary)' }}>
                    {fmt(p.stock_quantity)} {p.unit}
                  </div>
                  {p.is_low_stock && <div style={{ fontSize: 10, color: 'var(--color-text-warning)' }}>Stock faible</div>}
                </div>
              </div>
            ))}
            {products.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>Aucun produit</div>}
          </div>
        </div>

        {/* Recent movements */}
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>Derniers mouvements</h2>
          <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
            {movements.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {mvIcon(m.movement_type)}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{m.product?.name || `Produit #${m.product_id}`}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{m.reason || m.reference || '—'}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: m.movement_type === 'IN' ? 'var(--color-text-success)' : m.movement_type === 'OUT' ? 'var(--color-text-danger)' : 'var(--color-text-secondary)' }}>
                    {m.movement_type === 'IN' ? '+' : m.movement_type === 'OUT' ? '-' : '='}{fmt(m.quantity)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{fmt(m.quantity_before)} → {fmt(m.quantity_after)}</div>
                </div>
              </div>
            ))}
            {movements.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>Aucun mouvement</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
