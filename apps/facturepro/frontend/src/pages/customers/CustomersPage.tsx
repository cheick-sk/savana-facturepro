import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
const EMPTY = { name: '', email: '', phone: '', address: '', tax_id: '' }
export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const load = () => api.get('/customers', { params: { size: 50, search: search || undefined } }).then(r => { setCustomers(r.data.items); setTotal(r.data.total) })
  useEffect(() => { load() }, [search])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await api.post('/customers', form); toast.success('Client créé'); setShowForm(false); setForm(EMPTY); load() }
    catch (err: any) { toast.error(err?.response?.data?.detail || 'Erreur') }
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Clients</h1><p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>{total} client(s)</p></div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}><Plus size={14} /> Nouveau client</button>
      </div>
      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
        <input placeholder="Rechercher..." style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' }} onChange={e => setSearch(e.target.value)} />
      </div>
      {showForm && (
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 20, marginBottom: 16 }}>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
              {[{k:'name',l:'Nom *',req:true},{k:'email',l:'Email'},{k:'phone',l:'Téléphone'},{k:'address',l:'Adresse'},{k:'tax_id',l:'N° TVA'}].map(({k,l,req})=>(
                <div key={k}><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>{l}</label><input value={(form as any)[k]} onChange={e => setForm({...form,[k]:e.target.value})} required={req} /></div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}><button type="submit">Créer</button><button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', color: 'var(--color-text-secondary)' }}>Annuler</button></div>
          </form>
        </div>
      )}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
            {['Nom','Email','Téléphone','N° TVA'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{h}</th>)}
          </tr></thead>
          <tbody>{customers.map(c => (
            <tr key={c.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <td style={{ padding: '10px 14px', fontWeight: 500 }}>{c.name}</td>
              <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{c.email || '—'}</td>
              <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{c.phone || '—'}</td>
              <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{c.tax_id || '—'}</td>
            </tr>
          ))}</tbody>
        </table>
        {customers.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>Aucun client</div>}
      </div>
    </div>
  )
}
