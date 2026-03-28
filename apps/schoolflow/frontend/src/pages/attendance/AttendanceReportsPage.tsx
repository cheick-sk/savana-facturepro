import { useEffect, useState } from 'react'
import { FileText, Download, Users, Calendar, AlertTriangle, Settings, Bell, Clock } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { useAttendanceStore, type AttendanceSettings } from '../../store/attendance'

interface Class {
  id: number
  name: string
  level: string
}

interface Alert {
  student_id: number
  student_name: string
  student_number: string
  class_name: string
  consecutive_absences: number
  parent_phone: string | null
  parent_email: string | null
}

const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
]

export default function AttendanceReportsPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [reportConfig, setReportConfig] = useState({
    class_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  })
  
  const { settings, settingsLoading, fetchSettings, updateSettings } = useAttendanceStore()
  const [localSettings, setLocalSettings] = useState<Partial<AttendanceSettings>>({})

  // Load classes
  useEffect(() => {
    api.get('/school/classes').then(r => {
      setClasses(r.data || [])
    }).catch(() => {})
  }, [])

  // Load settings
  useEffect(() => {
    fetchSettings()
  }, [])

  // Sync local settings
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings)
    }
  }, [settings])

  // Load alerts
  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    setAlertsLoading(true)
    try {
      const { data } = await api.get('/attendance/alerts/consecutive-absences')
      setAlerts(data.alerts || [])
    } catch (error) {
      // Ignore errors
    }
    setAlertsLoading(false)
  }

  const generateReport = async () => {
    if (!reportConfig.class_id) {
      toast.error('Sélectionnez une classe')
      return
    }
    
    setLoading(true)
    try {
      const { data } = await api.post(
        `/attendance/reports/monthly/${reportConfig.class_id}`,
        null,
        { params: { month: reportConfig.month, year: reportConfig.year } }
      )
      toast.success('Rapport en cours de génération...')
      // In a real app, would poll for completion or show download link
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Erreur lors de la génération')
    }
    setLoading(false)
  }

  const handleSettingChange = (key: keyof AttendanceSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

  const saveSettings = async () => {
    await updateSettings(localSettings as Partial<AttendanceSettings>)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Rapports & Configuration</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
          Générer des rapports et configurer les notifications
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Reports Section */}
        <div style={{
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          padding: 16
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} />
            Rapport mensuel de présence
          </h3>

          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>
                Classe
              </label>
              <select
                value={reportConfig.class_id}
                onChange={(e) => setReportConfig(prev => ({ ...prev, class_id: e.target.value }))}
                style={{ width: '100%' }}
              >
                <option value="">Sélectionner une classe</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.level}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>
                  Mois
                </label>
                <select
                  value={reportConfig.month}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                  style={{ width: '100%' }}
                >
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>
                  Année
                </label>
                <select
                  value={reportConfig.year}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  style={{ width: '100%' }}
                >
                  {[2023, 2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={generateReport}
              disabled={loading || !reportConfig.class_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8,
                padding: '10px 16px',
                background: 'var(--color-text-primary)',
                color: 'var(--color-background-primary)',
                border: 'none'
              }}
            >
              <Download size={14} />
              Générer le rapport PDF
            </button>
          </div>
        </div>

        {/* Settings Section */}
        <div style={{
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          padding: 16
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={16} />
            Configuration des notifications
          </h3>

          {settingsLoading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-secondary)' }}>
              Chargement...
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {/* Auto Notify */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={localSettings.auto_notify_absence ?? true}
                  onChange={(e) => handleSettingChange('auto_notify_absence', e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13 }}>
                  <Bell size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Notifier automatiquement les parents en cas d'absence
                </span>
              </label>

              {/* Late Threshold */}
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>
                  <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Seuil de retard (minutes)
                </label>
                <input
                  type="number"
                  value={localSettings.late_threshold_minutes ?? 15}
                  onChange={(e) => handleSettingChange('late_threshold_minutes', parseInt(e.target.value))}
                  min={0}
                  max={120}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Absence Alert Threshold */}
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>
                  <AlertTriangle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Alerte après N absences consécutives
                </label>
                <input
                  type="number"
                  value={localSettings.absence_alert_after ?? 3}
                  onChange={(e) => handleSettingChange('absence_alert_after', parseInt(e.target.value))}
                  min={1}
                  max={30}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Notification Channels */}
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 8, color: 'var(--color-text-secondary)' }}>
                  Canaux de notification
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {['sms', 'whatsapp', 'email'].map(channel => (
                    <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={localSettings.notification_channels?.includes(channel) ?? false}
                        onChange={(e) => {
                          const channels = localSettings.notification_channels || []
                          if (e.target.checked) {
                            handleSettingChange('notification_channels', [...channels, channel])
                          } else {
                            handleSettingChange('notification_channels', channels.filter((c: string) => c !== channel))
                          }
                        }}
                        style={{ width: 14, height: 14 }}
                      />
                      <span style={{ fontSize: 12, textTransform: 'capitalize' }}>{channel}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={saveSettings}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 8,
                  padding: '10px 16px'
                }}
              >
                Enregistrer les paramètres
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alerts Section */}
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 16,
        marginTop: 16
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} color="var(--color-text-warning)" />
          Alertes - Absences consécutives
        </h3>

        {alertsLoading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-secondary)' }}>
            Chargement...
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-secondary)' }}>
            <Check size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
            <div>Aucune alerte - tous les élèves sont présents</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Élève</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Classe</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Absences consécutives</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Contact parent</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr key={alert.student_id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 500 }}>{alert.student_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                        {alert.student_number}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                      {alert.class_name}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        background: alert.consecutive_absences >= 5 ? 'var(--color-background-danger)' : 'var(--color-background-warning)',
                        color: alert.consecutive_absences >= 5 ? 'var(--color-text-danger)' : 'var(--color-text-warning)',
                        borderRadius: 99,
                        fontSize: 12,
                        fontWeight: 500
                      }}>
                        {alert.consecutive_absences}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      {alert.parent_phone || alert.parent_email || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Check({ size, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  )
}
