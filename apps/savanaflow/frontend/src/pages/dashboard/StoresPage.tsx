import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', phone: '' })

  const load = () => api.get('/stores').then(r => setStores(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/stores', form)
      toast.success('Magasin créé')
      setShowForm(false)
      setForm({ name: '', address: '', phone: '' })
      load()
    } catch { toast.error('Erreur lors de la création') }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Magasins</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>{stores.length} magasin(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
          <Plus size={14} /> Nouveau magasin
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 20, marginBottom: 20 }}>
          <form onSubmit={submit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Nom *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Mon Magasin" />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Adresse</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Adresse" />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Téléphone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+221 77..." />
            </div>
            <button type="submit">Créer</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', color: 'var(--color-text-secondary)' }}>Annuler</button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {stores.map(s => (
          <div key={s.id} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '16px 20px' }}>
            <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>{s.name}</div>
            {s.address && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.address}</div>}
            {s.phone && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.phone}</div>}
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--color-background-success)', color: 'var(--color-text-success)' }}>
                {s.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
