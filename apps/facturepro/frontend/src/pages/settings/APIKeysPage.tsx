import { useState, useEffect } from 'react'
import {
  Key, Plus, Trash2, Edit, Copy, Eye, EyeOff, Clock, 
  CheckCircle, XCircle, AlertCircle, RefreshCw, Shield,
  Activity, BarChart2, Settings, Code
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

interface APIKeyData {
  id: number
  name: string
  description?: string
  key_prefix: string
  masked_key: string
  key?: string
  secret?: string
  scopes: string[]
  rate_limit: number
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  created_by: number
}

interface UsageStats {
  total_requests: number
  successful_requests: number
  failed_requests: number
  avg_response_time_ms: number
  requests_by_endpoint: Record<string, number>
  requests_by_status: Record<number, number>
  requests_last_24h: number
  requests_last_7d: number
  requests_last_30d: number
}

interface UsageLog {
  id: number
  endpoint: string
  method: string
  status_code: number
  response_time_ms: number
  ip_address: string | null
  created_at: string
}

const AVAILABLE_SCOPES: Record<string, string> = {
  'read:invoices': 'Lire les factures',
  'write:invoices': 'Créer/modifier les factures',
  'read:customers': 'Lire les clients',
  'write:customers': 'Créer/modifier les clients',
  'read:products': 'Lire les produits',
  'write:products': 'Créer/modifier les produits',
  'read:quotes': 'Lire les devis',
  'write:quotes': 'Créer/modifier les devis',
  'read:payments': 'Lire les paiements',
  'write:payments': 'Enregistrer des paiements',
  'read:suppliers': 'Lire les fournisseurs',
  'write:suppliers': 'Créer/modifier les fournisseurs',
  'read:reports': 'Lire les rapports',
  'read:webhooks': 'Gérer les webhooks',
  'write:webhooks': 'Créer/modifier les webhooks',
  '*': 'Accès complet',
}

const SCOPE_GROUPS = [
  { name: 'Factures', scopes: ['read:invoices', 'write:invoices'] },
  { name: 'Clients', scopes: ['read:customers', 'write:customers'] },
  { name: 'Produits', scopes: ['read:products', 'write:products'] },
  { name: 'Devis', scopes: ['read:quotes', 'write:quotes'] },
  { name: 'Paiements', scopes: ['read:payments', 'write:payments'] },
  { name: 'Fournisseurs', scopes: ['read:suppliers', 'write:suppliers'] },
  { name: 'Rapports', scopes: ['read:reports'] },
  { name: 'Webhooks', scopes: ['read:webhooks', 'write:webhooks'] },
]

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKeyData[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [showUsageModal, setShowUsageModal] = useState(false)
  const [selectedKey, setSelectedKey] = useState<APIKeyData | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([])
  const [showSecret, setShowSecret] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scopes: [] as string[],
    rate_limit: 1000,
    expires_at: '',
  })

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    setLoading(true)
    try {
      const res = await api.get('/public/api-keys')
      setKeys(res.data)
    } catch (error) {
      console.error('Error fetching API keys:', error)
      toast.error('Erreur lors du chargement des clés API')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const res = await api.post('/public/api-keys', {
        ...formData,
        expires_at: formData.expires_at || null,
      })
      setKeys([...keys, res.data])
      setShowCreateModal(false)
      resetForm()
      toast.success('Clé API créée avec succès')
      
      // Show the new key
      setSelectedKey(res.data)
      setShowSecret(true)
      setShowKeyModal(true)
    } catch (error: any) {
      toast.error(error.response?.data?.detail?.message || 'Erreur lors de la création')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette clé API ?')) return
    try {
      await api.delete(`/public/api-keys/${id}`)
      setKeys(keys.filter(k => k.id !== id))
      toast.success('Clé API supprimée')
    } catch (error: any) {
      toast.error(error.response?.data?.detail?.message || 'Erreur lors de la suppression')
    }
  }

  const handleRegenerate = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir régénérer cette clé ? L\'ancienne clé ne fonctionnera plus.')) return
    try {
      const res = await api.post(`/public/api-keys/${id}/regenerate`)
      setKeys(keys.map(k => k.id === id ? res.data : k))
      setSelectedKey(res.data)
      setShowSecret(true)
      setShowKeyModal(true)
      toast.success('Clé API régénérée')
    } catch (error: any) {
      toast.error(error.response?.data?.detail?.message || 'Erreur lors de la régénération')
    }
  }

  const handleToggleActive = async (key: APIKeyData) => {
    try {
      const res = await api.put(`/public/api-keys/${key.id}`, { is_active: !key.is_active })
      setKeys(keys.map(k => k.id === key.id ? res.data : k))
      toast.success(key.is_active ? 'Clé API désactivée' : 'Clé API activée')
    } catch (error: any) {
      toast.error(error.response?.data?.detail?.message || 'Erreur lors de la modification')
    }
  }

  const fetchUsage = async (keyId: number) => {
    try {
      const res = await api.get(`/public/api-keys/${keyId}/usage`)
      setUsageStats(res.data.stats)
      setUsageLogs(res.data.items)
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques')
    }
  }

  const openUsageModal = (key: APIKeyData) => {
    setSelectedKey(key)
    fetchUsage(key.id)
    setShowUsageModal(true)
  }

  const toggleScope = (scope: string) => {
    if (formData.scopes.includes(scope)) {
      setFormData({ ...formData, scopes: formData.scopes.filter(s => s !== scope) })
    } else {
      setFormData({ ...formData, scopes: [...formData.scopes, scope] })
    }
  }

  const toggleGroup = (scopes: string[]) => {
    const allSelected = scopes.every(s => formData.scopes.includes(s))
    if (allSelected) {
      setFormData({ ...formData, scopes: formData.scopes.filter(s => !scopes.includes(s)) })
    } else {
      const newScopes = [...new Set([...formData.scopes, ...scopes])]
      setFormData({ ...formData, scopes: newScopes })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      scopes: [],
      rate_limit: 1000,
      expires_at: '',
    })
    setSelectedKey(null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copié dans le presse-papiers')
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

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return '#22c55e'
    if (statusCode >= 400 && statusCode < 500) return '#f59e0b'
    if (statusCode >= 500) return '#ef4444'
    return 'var(--text-secondary)'
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
            Clés API
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Gérez les clés API pour vos intégrations tierces
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
          Nouvelle clé API
        </button>
      </div>

      {/* Info Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        border: '1px solid rgba(59, 130, 246, 0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Code size={20} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: 'var(--text-primary)' }}>
              Intégration API
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
              Utilisez les clés API pour connecter vos applications à FacturePro. 
              Chaque clé a des permissions spécifiques (scopes) et un limite de requêtes personnalisable.
              Consultez la <a href="/docs" target="_blank" style={{ color: '#3b82f6' }}>documentation API</a> pour plus d'informations.
            </p>
          </div>
        </div>
      </div>

      {/* Keys List */}
      {keys.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-primary)',
          borderRadius: 16,
          border: '1px solid var(--border-light)',
        }}>
          <Key size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Aucune clé API</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>
            Créez votre première clé API pour commencer l'intégration
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
            Créer une clé API
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {keys.map(key => (
            <div
              key={key.id}
              style={{
                background: 'var(--bg-primary)',
                borderRadius: 16,
                border: '1px solid var(--border-light)',
                overflow: 'hidden',
              }}
            >
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
                    background: key.is_active 
                      ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                      : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Key size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {key.name}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 500,
                        background: key.is_active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                        color: key.is_active ? '#22c55e' : '#94a3b8',
                      }}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {key.masked_key}
                      </span>
                      <button
                        onClick={() => copyToClipboard(key.masked_key)}
                        style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Copy size={12} style={{ color: 'var(--text-tertiary)' }} />
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => openUsageModal(key)}
                    title="Statistiques"
                    style={{
                      padding: 8,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <BarChart2 size={16} style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <button
                    onClick={() => handleToggleActive(key)}
                    title={key.is_active ? 'Désactiver' : 'Activer'}
                    style={{
                      padding: 8,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    {key.is_active ? (
                      <XCircle size={16} style={{ color: '#ef4444' }} />
                    ) : (
                      <CheckCircle size={16} style={{ color: '#22c55e' }} />
                    )}
                  </button>
                  <button
                    onClick={() => handleRegenerate(key.id)}
                    title="Régénérer"
                    style={{
                      padding: 8,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={16} style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <button
                    onClick={() => handleDelete(key.id)}
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

              {/* Details */}
              <div style={{ padding: '12px 20px', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)' }}>Limite: </span>
                    <span style={{ color: 'var(--text-primary)' }}>{key.rate_limit.toLocaleString()} req/h</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)' }}>Dernière utilisation: </span>
                    <span style={{ color: 'var(--text-primary)' }}>{formatDate(key.last_used_at)}</span>
                  </div>
                  {key.expires_at && (
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Expire le: </span>
                      <span style={{ color: 'var(--text-primary)' }}>{formatDate(key.expires_at)}</span>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {key.scopes.map(scope => (
                    <span
                      key={scope}
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        borderRadius: 4,
                        fontSize: 11,
                      }}
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
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
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>
                Nouvelle clé API
              </h2>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Nom</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Integration CRM"
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
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Description (optionnel)</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description de l'utilisation de cette clé"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    background: 'var(--bg-secondary)',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Permissions (scopes)</label>
                <div style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  maxHeight: 200,
                  overflow: 'auto',
                }}>
                  {/* Full access */}
                  <div
                    onClick={() => toggleScope('*')}
                    style={{
                      padding: '10px 14px',
                      background: formData.scopes.includes('*') ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-primary)',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.scopes.includes('*')}
                      onChange={() => {}}
                    />
                    <span style={{ fontWeight: 500 }}>* - Accès complet</span>
                  </div>
                  {SCOPE_GROUPS.map(group => (
                    <div key={group.name} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <div
                        onClick={() => toggleGroup(group.scopes)}
                        style={{
                          padding: '10px 14px',
                          background: 'var(--bg-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{group.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {group.scopes.filter(s => formData.scopes.includes(s)).length}/{group.scopes.length}
                        </span>
                      </div>
                      <div style={{ padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {group.scopes.map(scope => (
                          <label
                            key={scope}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                          >
                            <input
                              type="checkbox"
                              checked={formData.scopes.includes(scope)}
                              onChange={() => toggleScope(scope)}
                            />
                            <span style={{ fontSize: 12 }}>{AVAILABLE_SCOPES[scope]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    Limite de requêtes/heure
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={100000}
                    value={formData.rate_limit}
                    onChange={e => setFormData({ ...formData, rate_limit: parseInt(e.target.value) || 1000 })}
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
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    Date d'expiration (optionnel)
                  </label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
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
                disabled={!formData.name || formData.scopes.length === 0}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  opacity: (!formData.name || formData.scopes.length === 0) ? 0.5 : 1,
                }}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Display Modal */}
      {showKeyModal && selectedKey && (
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
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(34, 197, 94, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CheckCircle size={20} style={{ color: '#22c55e' }} />
                </div>
                <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>
                  Clé API créée
                </h2>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 500, color: '#f59e0b' }}>
                      Important : Copiez votre clé maintenant !
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                      Cette clé ne sera plus jamais affichée. Conservez-la en lieu sûr.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Clé API</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={selectedKey.key || ''}
                    readOnly
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      background: 'var(--bg-secondary)',
                      fontFamily: 'monospace',
                    }}
                  />
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    style={{ padding: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 8, cursor: 'pointer' }}
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(selectedKey.key || '')}
                    style={{ padding: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 8, cursor: 'pointer' }}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {selectedKey.secret && (
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    Secret (pour signatures HMAC)
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="password"
                      value={selectedKey.secret}
                      readOnly
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        border: '1px solid var(--border-light)',
                        borderRadius: 8,
                        background: 'var(--bg-secondary)',
                        fontFamily: 'monospace',
                      }}
                    />
                    <button
                      onClick={() => copyToClipboard(selectedKey.secret || '')}
                      style={{ padding: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 8, cursor: 'pointer' }}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => {
                  setShowKeyModal(false)
                  setSelectedKey(null)
                  setShowSecret(false)
                }}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                J'ai copié ma clé
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage Modal */}
      {showUsageModal && selectedKey && (
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
            width: 700,
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>
                Statistiques - {selectedKey.name}
              </h2>
            </div>
            <div style={{ padding: 24 }}>
              {usageStats && (
                <>
                  {/* Stats Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 12,
                    marginBottom: 24,
                  }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total 30j</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{usageStats.requests_last_30d.toLocaleString()}</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>7 derniers jours</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{usageStats.requests_last_7d.toLocaleString()}</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Dernières 24h</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{usageStats.requests_last_24h.toLocaleString()}</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Temps moyen</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(usageStats.avg_response_time_ms)}ms</div>
                    </div>
                  </div>

                  {/* Success Rate */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Taux de succès</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {usageStats.successful_requests}/{usageStats.total_requests}
                      </span>
                    </div>
                    <div style={{
                      height: 8,
                      background: 'var(--bg-secondary)',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${usageStats.total_requests > 0 ? (usageStats.successful_requests / usageStats.total_requests) * 100 : 0}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                        borderRadius: 4,
                      }} />
                    </div>
                  </div>

                  {/* Recent Logs */}
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Requêtes récentes</h3>
                    <div style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      maxHeight: 200,
                      overflow: 'auto',
                    }}>
                      {usageLogs.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                          Aucune requête enregistrée
                        </div>
                      ) : (
                        usageLogs.slice(0, 10).map(log => (
                          <div
                            key={log.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: log.method === 'GET' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                color: log.method === 'GET' ? '#3b82f6' : '#22c55e',
                                fontSize: 10,
                                fontWeight: 600,
                              }}>
                                {log.method}
                              </span>
                              <span style={{ fontSize: 13, fontFamily: 'monospace' }}>{log.endpoint}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ color: getStatusColor(log.status_code), fontWeight: 500 }}>
                                {log.status_code}
                              </span>
                              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                {log.response_time_ms}ms
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => {
                  setShowUsageModal(false)
                  setSelectedKey(null)
                  setUsageStats(null)
                  setUsageLogs([])
                }}
                style={{
                  padding: '10px 20px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
