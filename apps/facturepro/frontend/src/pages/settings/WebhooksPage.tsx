import { useState, useEffect } from 'react'
import {
  Webhook, Plus, Trash2, Edit, Play, RefreshCw, 
  Copy, Eye, Clock, CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronRight, Zap, Link2, Shield
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

interface WebhookEndpoint {
  id: number
  name: string
  url: string
  events: string[]
  is_active: boolean
  retry_count: number
  timeout_seconds: number
  total_sent: number
  total_failed: number
  last_triggered_at: string | null
  last_success_at: string | null
  created_at: string
  updated_at: string
}

interface WebhookEvent {
  id: number
  endpoint_id: number
  event_type: string
  status: string
  response_status_code: number | null
  response_time_ms: number | null
  attempt_count: number
  created_at: string
  sent_at: string | null
}

interface AvailableEvent {
  event_type: string
  name: string
  description?: string
}

interface EventsByApp {
  [app: string]: AvailableEvent[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  sent: '#22c55e',
  failed: '#ef4444',
  retrying: '#f59e0b',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  sent: 'Envoyé',
  failed: 'Échoué',
  retrying: 'Nouvel essai',
}

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [availableEvents, setAvailableEvents] = useState<EventsByApp>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'endpoints' | 'events'>('endpoints')
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEventsModal, setShowEventsModal] = useState(false)
  const [showSecretModal, setShowSecretModal] = useState(false)
  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpoint | null>(null)
  const [newSecret, setNewSecret] = useState<string>('')
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    retry_count: 3,
    timeout_seconds: 10,
  })
  
  // Expanded apps in event picker
  const [expandedApps, setExpandedApps] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [endpointsRes, eventsRes, availableRes] = await Promise.all([
        api.get('/webhooks/endpoints'),
        api.get('/webhooks/events'),
        api.get('/webhooks/events/available'),
      ])
      setEndpoints(endpointsRes.data.items || [])
      setEvents(eventsRes.data.items || [])
      setAvailableEvents(availableRes.data || {})
    } catch (error) {
      console.error('Error fetching webhooks:', error)
      toast.error('Erreur lors du chargement des webhooks')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const res = await api.post('/webhooks/endpoints', formData)
      setEndpoints([...endpoints, res.data])
      setShowCreateModal(false)
      resetForm()
      toast.success('Webhook créé avec succès')
      
      // Show the secret
      setSelectedEndpoint(res.data)
      setNewSecret('Le secret a été généré. Veuillez le copier maintenant.')
      setShowSecretModal(true)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création')
    }
  }

  const handleUpdate = async () => {
    if (!selectedEndpoint) return
    try {
      const res = await api.put(`/webhooks/endpoints/${selectedEndpoint.id}`, formData)
      setEndpoints(endpoints.map(e => e.id === selectedEndpoint.id ? res.data : e))
      setShowEditModal(false)
      resetForm()
      toast.success('Webhook mis à jour')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce webhook ?')) return
    try {
      await api.delete(`/webhooks/endpoints/${id}`)
      setEndpoints(endpoints.filter(e => e.id !== id))
      toast.success('Webhook supprimé')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression')
    }
  }

  const handleTest = async (id: number) => {
    try {
      const res = await api.post(`/webhooks/endpoints/${id}/test`)
      if (res.data.success) {
        toast.success(`Test réussi ! (${res.data.response_time_ms}ms)`)
      } else {
        toast.error(`Test échoué: ${res.data.error}`)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du test')
    }
  }

  const handleRegenerateSecret = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir régénérer le secret ? L\'ancien secret ne fonctionnera plus.')) return
    try {
      const res = await api.post(`/webhooks/endpoints/${id}/regenerate-secret`)
      setNewSecret(res.data.secret)
      setShowSecretModal(true)
      toast.success('Secret régénéré')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la régénération')
    }
  }

  const handleRetryEvent = async (id: number) => {
    try {
      await api.post(`/webhooks/events/${id}/retry`)
      toast.success('Événement relancé')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du retry')
    }
  }

  const toggleEventSelection = (eventType: string) => {
    if (formData.events.includes(eventType)) {
      setFormData({ ...formData, events: formData.events.filter(e => e !== eventType) })
    } else {
      setFormData({ ...formData, events: [...formData.events, eventType] })
    }
  }

  const toggleAppExpansion = (app: string) => {
    if (expandedApps.includes(app)) {
      setExpandedApps(expandedApps.filter(a => a !== app))
    } else {
      setExpandedApps([...expandedApps, app])
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      events: [],
      retry_count: 3,
      timeout_seconds: 10,
    })
    setSelectedEndpoint(null)
  }

  const openEditModal = (endpoint: WebhookEndpoint) => {
    setSelectedEndpoint(endpoint)
    setFormData({
      name: endpoint.name,
      url: endpoint.url,
      events: endpoint.events,
      retry_count: endpoint.retry_count,
      timeout_seconds: endpoint.timeout_seconds,
    })
    setShowEditModal(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copié dans le presse-papiers')
  }

  const getSuccessRate = (endpoint: WebhookEndpoint) => {
    const total = endpoint.total_sent + endpoint.total_failed
    if (total === 0) return 0
    return Math.round((endpoint.total_sent / total) * 100)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary-500)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Webhooks
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Configurez des webhooks pour recevoir des notifications en temps réel
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowCreateModal(true)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          }}
        >
          <Plus size={18} />
          Nouveau Webhook
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-secondary)', padding: 4, borderRadius: 10 }}>
        <button
          onClick={() => setActiveTab('endpoints')}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: 'none',
            borderRadius: 8,
            background: activeTab === 'endpoints' ? 'var(--bg-primary)' : 'transparent',
            color: activeTab === 'endpoints' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Endpoints ({endpoints.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: 'none',
            borderRadius: 8,
            background: activeTab === 'events' ? 'var(--bg-primary)' : 'transparent',
            color: activeTab === 'events' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Historique ({events.length})
        </button>
      </div>

      {/* Endpoints Tab */}
      {activeTab === 'endpoints' && (
        <div>
          {endpoints.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--bg-primary)',
              borderRadius: 16,
              border: '1px solid var(--border-light)',
            }}>
              <Webhook size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Aucun webhook configuré</h3>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>
                Créez votre premier webhook pour recevoir des notifications en temps réel
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <Plus size={18} />
                Créer un webhook
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {endpoints.map(endpoint => (
                <div
                  key={endpoint.id}
                  style={{
                    background: 'var(--bg-primary)',
                    borderRadius: 16,
                    border: '1px solid var(--border-light)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-light)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: endpoint.is_active 
                          ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                          : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Webhook size={20} color="#fff" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {endpoint.name}
                          </span>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 500,
                            background: endpoint.is_active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                            color: endpoint.is_active ? '#22c55e' : '#94a3b8',
                          }}>
                            {endpoint.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Link2 size={12} style={{ color: 'var(--text-tertiary)' }} />
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {endpoint.url.length > 50 ? endpoint.url.slice(0, 50) + '...' : endpoint.url}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleTest(endpoint.id)}
                        title="Tester"
                        style={{
                          padding: 8,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        <Play size={16} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                      <button
                        onClick={() => openEditModal(endpoint)}
                        title="Modifier"
                        style={{
                          padding: 8,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        <Edit size={16} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                      <button
                        onClick={() => handleRegenerateSecret(endpoint.id)}
                        title="Régénérer le secret"
                        style={{
                          padding: 8,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        <Shield size={16} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                      <button
                        onClick={() => handleDelete(endpoint.id)}
                        title="Supprimer"
                        style={{
                          padding: 8,
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={16} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 1,
                    background: 'var(--border-light)',
                  }}>
                    <div style={{ background: 'var(--bg-primary)', padding: '16px 20px' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                        Taux de succès
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {getSuccessRate(endpoint)}%
                        </span>
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '16px 20px' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                        Envoyés
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 24, fontWeight: 600, color: '#22c55e' }}>
                          {endpoint.total_sent}
                        </span>
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '16px 20px' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                        Échoués
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 24, fontWeight: 600, color: '#ef4444' }}>
                          {endpoint.total_failed}
                        </span>
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '16px 20px' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                        Dernier succès
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                        {formatDate(endpoint.last_success_at)}
                      </div>
                    </div>
                  </div>

                  {/* Events subscribed */}
                  <div style={{ padding: '12px 20px', background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {endpoint.events.map(event => (
                        <span
                          key={event}
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6',
                            borderRadius: 4,
                            fontSize: 12,
                            fontFamily: 'monospace',
                          }}
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: 16,
          border: '1px solid var(--border-light)',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Événement
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Réponse
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Tentatives
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Date
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      borderRadius: 4,
                      fontSize: 12,
                      fontFamily: 'monospace',
                    }}>
                      {event.event_type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {event.status === 'sent' && <CheckCircle size={16} style={{ color: '#22c55e' }} />}
                      {event.status === 'failed' && <XCircle size={16} style={{ color: '#ef4444' }} />}
                      {event.status === 'pending' && <Clock size={16} style={{ color: '#f59e0b' }} />}
                      {event.status === 'retrying' && <RefreshCw size={16} style={{ color: '#f59e0b' }} />}
                      <span style={{ color: STATUS_COLORS[event.status] }}>
                        {STATUS_LABELS[event.status]}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {event.response_status_code && (
                      <div>
                        <span style={{
                          color: event.response_status_code >= 200 && event.response_status_code < 300
                            ? '#22c55e'
                            : '#ef4444',
                          fontFamily: 'monospace',
                        }}>
                          {event.response_status_code}
                        </span>
                        {event.response_time_ms && (
                          <span style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>
                            {event.response_time_ms}ms
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {event.attempt_count}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>
                    {formatDate(event.created_at)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {(event.status === 'failed' || event.status === 'retrying') && (
                      <button
                        onClick={() => handleRetryEvent(event.id)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          borderRadius: 6,
                          color: '#f59e0b',
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <RefreshCw size={12} />
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    Aucun événement pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 16,
            width: 600,
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>
                Nouveau Webhook
              </h2>
            </div>
            <div style={{ padding: 24 }}>
              {/* Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: 'var(--text-primary)' }}>
                  Nom
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Zapier Integration"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    fontSize: 14,
                    background: 'var(--bg-secondary)',
                  }}
                />
              </div>

              {/* URL */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: 'var(--text-primary)' }}>
                  URL du endpoint
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com/webhook"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    fontSize: 14,
                    background: 'var(--bg-secondary)',
                  }}
                />
              </div>

              {/* Events */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: 'var(--text-primary)' }}>
                  Événements à surveiller
                </label>
                <div style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  maxHeight: 200,
                  overflow: 'auto',
                }}>
                  {Object.entries(availableEvents).map(([app, events]) => (
                    <div key={app}>
                      <div
                        onClick={() => toggleAppExpansion(app)}
                        style={{
                          padding: '10px 14px',
                          background: 'var(--bg-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: expandedApps.includes(app) ? '1px solid var(--border-light)' : 'none',
                        }}
                      >
                        <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{app}</span>
                        {expandedApps.includes(app) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      {expandedApps.includes(app) && (
                        <div style={{ padding: '8px 14px' }}>
                          {events.map(event => (
                            <label
                              key={event.event_type}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 0',
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={formData.events.includes(event.event_type)}
                                onChange={() => toggleEventSelection(event.event_type)}
                              />
                              <span style={{ fontSize: 13, fontFamily: 'monospace' }}>{event.event_type}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{event.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {formData.events.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {formData.events.map(e => (
                      <span
                        key={e}
                        style={{
                          padding: '4px 8px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          borderRadius: 4,
                          fontSize: 11,
                          fontFamily: 'monospace',
                        }}
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Retry & Timeout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: 'var(--text-primary)' }}>
                    Tentatives max
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={formData.retry_count}
                    onChange={e => setFormData({ ...formData, retry_count: parseInt(e.target.value) || 3 })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      fontSize: 14,
                      background: 'var(--bg-secondary)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: 'var(--text-primary)' }}>
                    Timeout (secondes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.timeout_seconds}
                    onChange={e => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) || 10 })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      fontSize: 14,
                      background: 'var(--bg-secondary)',
                    }}
                  />
                </div>
              </div>
            </div>
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
            }}>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                }}
                style={{
                  padding: '10px 20px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.name || !formData.url || formData.events.length === 0}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  opacity: (!formData.name || !formData.url || formData.events.length === 0) ? 0.5 : 1,
                }}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEndpoint && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 16,
            width: 600,
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Modifier le webhook</h2>
            </div>
            <div style={{ padding: 24 }}>
              {/* Same form fields as create */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Nom</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    background: 'var(--bg-secondary)',
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    background: 'var(--bg-secondary)',
                  }}
                />
              </div>
              {/* Events selection - same as create */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Événements ({formData.events.length} sélectionnés)
                </label>
                <div style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  maxHeight: 200,
                  overflow: 'auto',
                }}>
                  {Object.entries(availableEvents).map(([app, events]) => (
                    <div key={app}>
                      <div
                        onClick={() => toggleAppExpansion(app)}
                        style={{
                          padding: '10px 14px',
                          background: 'var(--bg-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{app}</span>
                        {expandedApps.includes(app) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      {expandedApps.includes(app) && (
                        <div style={{ padding: '8px 14px' }}>
                          {events.map(event => (
                            <label
                              key={event.event_type}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' }}
                            >
                              <input
                                type="checkbox"
                                checked={formData.events.includes(event.event_type)}
                                onChange={() => toggleEventSelection(event.event_type)}
                              />
                              <span style={{ fontSize: 13, fontFamily: 'monospace' }}>{event.event_type}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Tentatives max</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={formData.retry_count}
                    onChange={e => setFormData({ ...formData, retry_count: parseInt(e.target.value) || 3 })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      background: 'var(--bg-secondary)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Timeout (s)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.timeout_seconds}
                    onChange={e => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) || 10 })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      background: 'var(--bg-secondary)',
                    }}
                  />
                </div>
              </div>
            </div>
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
            }}>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  resetForm()
                }}
                style={{
                  padding: '10px 20px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleUpdate}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secret Modal */}
      {showSecretModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 16,
            width: 500,
            maxWidth: '90vw',
            padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Shield size={24} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0 }}>Secret du Webhook</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                  Copiez ce secret maintenant, il ne sera plus affiché
                </p>
              </div>
            </div>
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <code style={{ fontSize: 13, wordBreak: 'break-all' }}>{newSecret}</code>
              <button
                onClick={() => copyToClipboard(newSecret)}
                style={{
                  padding: 8,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  marginLeft: 12,
                }}
              >
                <Copy size={16} />
              </button>
            </div>
            <button
              onClick={() => setShowSecretModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              J'ai copié le secret
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
