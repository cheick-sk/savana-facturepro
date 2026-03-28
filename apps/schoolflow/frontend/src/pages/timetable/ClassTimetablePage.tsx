import { useEffect, useState } from 'react'
import { Calendar, Plus, FileDown, AlertTriangle } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import TimetableGrid from '../../components/timetable/TimetableGrid'
import ConflictAlert from '../../components/timetable/ConflictAlert'
import { useTimetableStore, TimetableEntry } from '../../store/timetable'

export default function ClassTimetablePage() {
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)
  const [subjects, setSubjects] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null)
  const [form, setForm] = useState({
    subject_id: '',
    teacher_id: '',
    time_slot_id: '',
    day_of_week: 0,
    room: '',
    notes: '',
  })

  const { timeSlots, fetchTimeSlots, createEntry, updateEntry, deleteEntry, fetchClassTimetable } = useTimetableStore()

  useEffect(() => {
    api.get('/school/classes').then((r) => {
      setClasses(r.data)
      if (r.data.length > 0) {
        setSelectedClassId(r.data[0].id)
      }
    }).catch(() => {})
    fetchTimeSlots(true)
  }, [fetchTimeSlots])

  useEffect(() => {
    if (selectedClassId) {
      fetchClassTimetable(selectedClassId)
      // Fetch subjects for this class
      api.get(`/school/subjects?class_id=${selectedClassId}`).then((r) => setSubjects(r.data)).catch(() => {})
    }
  }, [selectedClassId, fetchClassTimetable])

  useEffect(() => {
    api.get('/school/teachers').then((r) => setTeachers(r.data)).catch(() => {})
  }, [])

  const resetForm = () => {
    setForm({
      subject_id: '',
      teacher_id: '',
      time_slot_id: '',
      day_of_week: 0,
      room: '',
      notes: '',
    })
    setShowForm(false)
    setEditingEntry(null)
  }

  const handleAddClick = (dayOfWeek: number, timeSlotId: number) => {
    setForm({
      ...form,
      day_of_week: dayOfWeek,
      time_slot_id: String(timeSlotId),
    })
    setShowForm(true)
  }

  const handleEntryClick = (entry: TimetableEntry) => {
    setEditingEntry(entry)
    setForm({
      subject_id: String(entry.subject_id),
      teacher_id: entry.teacher_id ? String(entry.teacher_id) : '',
      time_slot_id: String(entry.time_slot_id),
      day_of_week: entry.day_of_week,
      room: entry.room || '',
      notes: entry.notes || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassId) return

    try {
      const data = {
        class_id: selectedClassId,
        subject_id: parseInt(form.subject_id),
        teacher_id: form.teacher_id ? parseInt(form.teacher_id) : null,
        time_slot_id: parseInt(form.time_slot_id),
        day_of_week: form.day_of_week,
        room: form.room || null,
        notes: form.notes || null,
      }

      if (editingEntry) {
        await updateEntry(editingEntry.id, data)
        toast.success('Cours modifié')
      } else {
        await createEntry(data)
        toast.success('Cours ajouté')
      }
      resetForm()
      fetchClassTimetable(selectedClassId)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur')
    }
  }

  const handleDelete = async () => {
    if (!editingEntry || !confirm('Supprimer ce cours ?')) return
    try {
      await deleteEntry(editingEntry.id)
      toast.success('Cours supprimé')
      resetForm()
      if (selectedClassId) {
        fetchClassTimetable(selectedClassId)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur')
    }
  }

  const handleExportPDF = async () => {
    if (!selectedClassId) return
    try {
      const response = await api.get(`/timetable/pdf/${selectedClassId}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `emploi-du-temps-classe-${selectedClassId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('PDF exporté')
    } catch (err: any) {
      toast.error('Erreur lors de l\'export')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <Calendar size={22} style={{ color: 'var(--color-primary)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Emploi du temps</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
            Gérez l'emploi du temps des classes
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExportPDF} disabled={!selectedClassId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
            <FileDown size={14} /> Exporter PDF
          </button>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
            <Plus size={14} /> Ajouter un cours
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Sélectionner une classe</label>
        <select
          value={selectedClassId || ''}
          onChange={(e) => setSelectedClassId(parseInt(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 6, minWidth: 200 }}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.level})
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <div style={{
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 8,
          padding: 20,
          marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 16px' }}>
            {editingEntry ? 'Modifier le cours' : 'Ajouter un cours'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Matière *</label>
                <select
                  value={form.subject_id}
                  onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6 }}
                >
                  <option value="">-- Sélectionner --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Professeur</label>
                <select
                  value={form.teacher_id}
                  onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6 }}
                >
                  <option value="">-- Optionnel --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Créneau *</label>
                <select
                  value={form.time_slot_id}
                  onChange={(e) => setForm({ ...form, time_slot_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6 }}
                >
                  <option value="">-- Sélectionner --</option>
                  {timeSlots.filter(s => s.is_active).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Jour *</label>
                <select
                  value={form.day_of_week}
                  onChange={(e) => setForm({ ...form, day_of_week: parseInt(e.target.value) })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6 }}
                >
                  {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map((day, idx) => (
                    <option key={idx} value={idx}>{day}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Salle</label>
                <input
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  placeholder="ex: Salle 101"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6 }}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Notes</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes additionnelles..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6 }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit">{editingEntry ? 'Modifier' : 'Ajouter'}</button>
              {editingEntry && (
                <button type="button" onClick={handleDelete} style={{ background: 'var(--color-danger)', color: 'white' }}>
                  Supprimer
                </button>
              )}
              <button type="button" onClick={resetForm} style={{ background: 'none', color: 'var(--color-text-secondary)' }}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <ConflictAlert />
      </div>

      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 16,
        overflow: 'auto',
      }}>
        <TimetableGrid
          classId={selectedClassId || undefined}
          onEntryClick={handleEntryClick}
          onAddClick={handleAddClick}
          editable
        />
      </div>
    </div>
  )
}
