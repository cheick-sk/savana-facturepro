import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [classes, setClasses] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ first_name: '', last_name: '', date_of_birth: '', class_id: '', parent_name: '', parent_phone: '' })
  const load = () => api.get('/students', { params: { size: 50, search: search || undefined } }).then(r => { setStudents(r.data.items); setTotal(r.data.total) })
  useEffect(() => { load() }, [search])
  useEffect(() => { api.get('/school/classes').then(r => setClasses(r.data)).catch(() => {}) }, [])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/students', { ...form, class_id: form.class_id ? +form.class_id : null })
      toast.success('Élève inscrit'); setShowForm(false); setForm({ first_name:'',last_name:'',date_of_birth:'',class_id:'',parent_name:'',parent_phone:'' }); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Erreur') }
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Élèves</h1><p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>{total} élève(s)</p></div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}><Plus size={14} /> Inscrire un élève</button>
      </div>
      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
        <input placeholder="Rechercher..." style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' }} onChange={e => setSearch(e.target.value)} />
      </div>
      {showForm && (
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 20, marginBottom: 16 }}>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
              {[{k:'first_name',l:'Prénom *',req:true},{k:'last_name',l:'Nom *',req:true},{k:'date_of_birth',l:'Date de naissance',t:'date'},{k:'parent_name',l:'Nom parent'},{k:'parent_phone',l:'Tél. parent'}].map(({k,l,req,t='text'})=>(
                <div key={k}><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>{l}</label><input type={t} value={(form as any)[k]} onChange={e => setForm({...form,[k]:e.target.value})} required={req} /></div>
              ))}
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Classe</label>
                <select value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})} style={{ width: '100%' }}>
                  <option value="">-- Affecter plus tard --</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}><button type="submit">Inscrire</button><button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', color: 'var(--color-text-secondary)' }}>Annuler</button></div>
          </form>
        </div>
      )}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: 'var(--color-background-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            {['N° élève','Nom','Classe','Parent','Statut'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{h}</th>)}
          </tr></thead>
          <tbody>{students.map(s => (
            <tr key={s.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12 }}>{s.student_number}</td>
              <td style={{ padding: '10px 14px', fontWeight: 500 }}>{s.first_name} {s.last_name}</td>
              <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{s.current_class?.name || '—'}</td>
              <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{s.parent?.name || '—'}</td>
              <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: s.is_active ? 'var(--color-background-success)' : 'var(--color-background-secondary)', color: s.is_active ? 'var(--color-text-success)' : 'var(--color-text-secondary)' }}>{s.is_active ? 'Actif' : 'Inactif'}</span></td>
            </tr>
          ))}</tbody>
        </table>
        {students.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>Aucun élève</div>}
      </div>
    </div>
  )
}
