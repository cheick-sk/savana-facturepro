import { useEffect, useState } from 'react'
import { Plus, FileDown } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
export default function GradesPage() {
  const [grades, setGrades] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ student_id: '', subject_id: '', term_id: '', score: '', max_score: '20', coefficient: '1', comment: '' })
  const load = () => api.get('/grades', { params: { size: 50 } }).then(r => setGrades(r.data.items || [])).catch(() => {})
  useEffect(() => {
    load()
    api.get('/students', { params: { size: 200 } }).then(r => setStudents(r.data.items || []))
    api.get('/school/subjects').then(r => setSubjects(r.data || []))
    api.get('/school/terms').then(r => setTerms(r.data || []))
  }, [])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/grades', { ...form, student_id: +form.student_id, subject_id: +form.subject_id, term_id: +form.term_id, score: +form.score, max_score: +form.max_score, coefficient: +form.coefficient })
      toast.success('Note enregistrée'); setShowForm(false); setForm({ student_id:'',subject_id:'',term_id:'',score:'',max_score:'20',coefficient:'1',comment:'' }); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Erreur') }
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Notes</h1>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}><Plus size={14} /> Saisir une note</button>
      </div>
      {showForm && (
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 20, marginBottom: 16 }}>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Élève *</label>
                <select value={form.student_id} onChange={e => setForm({...form,student_id:e.target.value})} required style={{ width: '100%' }}>
                  <option value="">-- Choisir --</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Matière *</label>
                <select value={form.subject_id} onChange={e => setForm({...form,subject_id:e.target.value})} required style={{ width: '100%' }}>
                  <option value="">-- Choisir --</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Trimestre *</label>
                <select value={form.term_id} onChange={e => setForm({...form,term_id:e.target.value})} required style={{ width: '100%' }}>
                  <option value="">-- Choisir --</option>
                  {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {[{k:'score',l:'Note *',req:true},{k:'max_score',l:'Sur'},{k:'coefficient',l:'Coeff.'}].map(({k,l,req})=>(
                <div key={k}><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>{l}</label><input type="number" step="0.01" min="0" value={(form as any)[k]} onChange={e => setForm({...form,[k]:e.target.value})} required={req} /></div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}><button type="submit">Enregistrer</button><button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', color: 'var(--color-text-secondary)' }}>Annuler</button></div>
          </form>
        </div>
      )}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: 'var(--color-background-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            {['Élève','Matière','Trimestre','Note','Coeff.','Bulletin'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{h}</th>)}
          </tr></thead>
          <tbody>{grades.map((g: any) => (
            <tr key={g.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <td style={{ padding: '10px 14px', fontWeight: 500 }}>{g.student?.first_name} {g.student?.last_name}</td>
              <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{g.subject?.name}</td>
              <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{g.term?.name}</td>
              <td style={{ padding: '10px 14px', fontWeight: 500 }}>{g.score}/{g.max_score}</td>
              <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{g.coefficient}</td>
              <td style={{ padding: '10px 14px' }}>
                <button title="Télécharger bulletin PDF" onClick={() => window.open(`/api/v1/grades/students/${g.student_id}/bulletin/pdf?term_id=${g.term_id}`, '_blank')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}><FileDown size={13} /></button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {grades.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>Aucune note</div>}
      </div>
    </div>
  )
}
