import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', level: '', capacity: '30' })
  const load = () => api.get('/school/classes').then(r => setClasses(r.data)).catch(() => {})
  useEffect(() => { load() }, [])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await api.post('/school/classes', { ...form, capacity: +form.capacity }); toast.success('Classe créée'); setShowForm(false); setForm({ name:'',level:'',capacity:'30' }); load() }
    catch (err: any) { toast.error(err?.response?.data?.detail || 'Erreur') }
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Classes</h1>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}><Plus size={14} /> Nouvelle classe</button>
      </div>
      {showForm && (
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 20, marginBottom: 16 }}>
          <form onSubmit={submit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Nom *</label><input value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="6ème A" required /></div>
            <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Niveau</label><input value={form.level} onChange={e => setForm({...form,level:e.target.value})} placeholder="6ème" /></div>
            <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Capacité</label><input type="number" min="1" value={form.capacity} onChange={e => setForm({...form,capacity:e.target.value})} /></div>
            <button type="submit">Créer</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', color: 'var(--color-text-secondary)' }}>Annuler</button>
          </form>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {classes.map((c: any) => (
          <div key={c.id} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '16px 20px' }}>
            <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 4 }}>{c.name}</div>
            {c.level && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Niveau: {c.level}</div>}
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Capacité: {c.capacity}</div>
          </div>
        ))}
        {classes.length === 0 && <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>Aucune classe</div>}
      </div>
    </div>
  )
}
