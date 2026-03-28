import { useEffect, useState } from 'react'
import { Calendar, Users, Play, RefreshCw } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import AttendanceSheet from '../../components/attendance/AttendanceSheet'
import { useAttendanceStore } from '../../store/attendance'

interface Class {
  id: number
  name: string
  level: string
  academic_year: string
  max_students: number
  is_active: boolean
}

export default function TakeAttendancePage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [loading, setLoading] = useState(false)
  const { 
    todaySession, 
    todayLoading, 
    fetchTodaySession, 
    startSession,
    currentSession
  } = useAttendanceStore()

  // Load classes
  useEffect(() => {
    api.get('/school/classes').then(r => {
      setClasses(r.data || [])
    }).catch(() => {
      toast.error('Erreur lors du chargement des classes')
    })
  }, [])

  // Load today's session when class is selected
  useEffect(() => {
    if (selectedClass) {
      fetchTodaySession(selectedClass.id)
    }
  }, [selectedClass])

  const handleStartSession = async () => {
    if (!selectedClass) return
    setLoading(true)
    await startSession(selectedClass.id)
    setLoading(false)
  }

  const handleRefresh = () => {
    if (selectedClass) {
      fetchTodaySession(selectedClass.id)
    }
  }

  const session = todaySession || currentSession

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Présences</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
            Faire l'appel du jour
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            <Calendar size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      {/* Class Selection */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        marginBottom: 20, 
        flexWrap: 'wrap' 
      }}>
        {classes.map(cls => (
          <button
            key={cls.id}
            onClick={() => setSelectedClass(cls)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              background: selectedClass?.id === cls.id 
                ? 'var(--color-background-secondary)' 
                : 'var(--color-background-primary)',
              border: selectedClass?.id === cls.id 
                ? '2px solid var(--color-text-primary)' 
                : '0.5px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <Users size={14} />
            <span style={{ fontWeight: 500 }}>{cls.name}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{cls.level}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {selectedClass ? (
        <div>
          {todayLoading ? (
            <div style={{ 
              background: 'var(--color-background-primary)', 
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-lg)',
              padding: 40,
              textAlign: 'center' 
            }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-text-secondary)' }} />
              <div style={{ marginTop: 12, color: 'var(--color-text-secondary)' }}>Chargement...</div>
            </div>
          ) : session ? (
            <AttendanceSheet 
              session={session} 
              onComplete={handleRefresh}
            />
          ) : (
            <div style={{ 
              background: 'var(--color-background-primary)', 
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-lg)',
              padding: 40,
              textAlign: 'center' 
            }}>
              <Play size={32} style={{ color: 'var(--color-text-secondary)', marginBottom: 12 }} />
              <div style={{ fontWeight: 500, marginBottom: 8 }}>
                Commencer l'appel pour {selectedClass.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
                Aucune session d'appel n'a été démarrée pour cette classe aujourd'hui
              </div>
              <button
                onClick={handleStartSession}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  background: 'var(--color-text-primary)',
                  color: 'var(--color-background-primary)',
                  border: 'none'
                }}
              >
                <Play size={14} />
                Démarrer l'appel
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ 
          background: 'var(--color-background-primary)', 
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          padding: 40,
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          <Users size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
          <div>Sélectionnez une classe pour faire l'appel</div>
        </div>
      )}
    </div>
  )
}
