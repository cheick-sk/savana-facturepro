import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n * 100) / 100)
const EMPTY = { name: '', unit_price: '', unit: 'unit', tax_rate: '0', description: '' }
export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const load = () => api.get('/products', { params: { size: 100 } }).then(r => setProducts(r.data.items))
  useEffect(() => { load() }, [])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/products', { ...form, unit_price: +form.unit_price, tax_rate: +form.tax_rate })
      toast.success('Produit créé'); setShowForm(false); setForm(EMPTY); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Erreur') }
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Produits & Services</h1>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}><Plus size={14} /> Nouveau</button>
      </div>
      {showForm && (
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 20, marginBottom: 16 }}>
          <form onSubmit={submit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Nom *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Prix *</label><input type="number" step="0.01" min="0.01" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} required /></div>
            <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Unité</label><input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>TVA %</label><input type="number" step="0.1" min="0" max="100" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: e.target.value })} /></div>
            <button type="submit">Créer</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', color: 'var(--color-text-secondary)' }}>Annuler</button>
          </form>
        </div>
      )}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: 'var(--color-background-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            {['Nom', 'Prix unitaire', 'Unité', 'TVA'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{h}</th>)}
          </tr></thead>
          <tbody>{products.map(p => (
            <tr key={p.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <td style={{ padding: '10px 14px', fontWeight: 500 }}>{p.name}</td>
              <td style={{ padding: '10px 14px' }}>{fmt(p.unit_price)} XOF</td>
              <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{p.unit}</td>
              <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{p.tax_rate}%</td>
            </tr>
          ))}</tbody>
        </table>
        {products.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>Aucun produit</div>}
      </div>
    </div>
  )
}
