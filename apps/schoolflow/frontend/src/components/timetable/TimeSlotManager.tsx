import { useEffect, useState } from 'react'
import { Plus, Clock, Edit2, Trash2, X, Check } from 'lucide-react'
import { useTimetableStore, TimeSlot } from '../../store/timetable'
import toast from 'react-hot-toast'

interface TimeSlotForm {
  name: string
  start_time: string
  end_time: string
  order: number
}

const initialForm: TimeSlotForm = {
  name: '',
  start_time: '08:00',
  end_time: '09:00',
  order: 0,
}

export default function TimeSlotManager() {
  const { timeSlots, timeSlotsLoading, fetchTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot } = useTimetableStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<TimeSlotForm>(initialForm)

  useEffect(() => {
    fetchTimeSlots(false)
  }, [fetchTimeSlots])

  const resetForm = () => {
    setForm(initialForm)
    setShowForm(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        name: form.name,
        start_time: form.start_time + ':00',
        end_time: form.end_time + ':00',
        order: form.order,
      }

      if (editingId) {
        await updateTimeSlot(editingId, data)
        toast.success('Créneau modifié')
      } else {
        await createTimeSlot(data)
        toast.success('Créneau créé')
      }
      resetForm()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur')
    }
  }

  const handleEdit = (slot: TimeSlot) => {
    setForm({
      name: slot.name,
      start_time: slot.start_time.substring(0, 5),
      end_time: slot.end_time.substring(0, 5),
      order: slot.order,
    })
    setEditingId(slot.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce créneau ?')) return
    try {
      await deleteTimeSlot(id)
      toast.success('Créneau supprimé')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur')
    }
  }

  const handleToggleActive = async (slot: TimeSlot) => {
    try {
      await updateTimeSlot(slot.id, { is_active: !slot.is_active })
      toast.success(slot.is_active ? 'Créneau désactivé' : 'Créneau activé')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Créneaux horaires</h3>
        <button
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13 }}
        >
          <Plus size={14} /> Nouveau créneau
        </button>
      </div>

      {showForm && (
        <div style={{
          background: 'var(--color-background-secondary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Nom *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ex: Matin 1"
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Début *</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Fin *</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Ordre</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  min={0}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit">
                {editingId ? 'Modifier' : 'Créer'}
              </button>
              <button type="button" onClick={resetForm} style={{ background: 'none', color: 'var(--color-text-secondary)' }}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {timeSlotsLoading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-secondary)' }}>Chargement...</div>
      ) : timeSlots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-secondary)' }}>
          Aucun créneau défini. Créez des créneaux pour commencer.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {timeSlots.map((slot) => (
            <div
              key={slot.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: slot.is_active ? 'var(--color-background-primary)' : 'var(--color-background-secondary)',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 8,
                opacity: slot.is_active ? 1 : 0.6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Clock size={18} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <div style={{ fontWeight: 500 }}>{slot.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  onClick={() => handleToggleActive(slot)}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: slot.is_active ? 'var(--color-background-success)' : 'var(--color-background-secondary)',
                    color: slot.is_active ? 'var(--color-text-success)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {slot.is_active ? 'Actif' : 'Inactif'}
                </span>
                <button
                  onClick={() => handleEdit(slot)}
                  style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Edit2 size={14} style={{ color: 'var(--color-text-secondary)' }} />
                </button>
                <button
                  onClick={() => handleDelete(slot.id)}
                  style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Trash2 size={14} style={{ color: 'var(--color-text-danger)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
