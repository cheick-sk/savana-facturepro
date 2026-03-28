import { useState, useEffect } from 'react'
import { Plus, Calendar, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useAccountingStore, FiscalYear } from '../../store/accounting'

export default function FiscalYearsPage() {
  const {
    fiscalYears,
    loading,
    fetchFiscalYears,
    createFiscalYear,
    closeFiscalYear,
  } = useAccountingStore()

  const [showModal, setShowModal] = useState(false)
  const [selectedYear, setSelectedYear] = useState<FiscalYear | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    opening_balance: 0,
  })

  useEffect(() => {
    fetchFiscalYears()
  }, [fetchFiscalYears])

  const resetForm = () => {
    const currentYear = new Date().getFullYear()
    setFormData({
      name: `Exercice ${currentYear}`,
      start_date: `${currentYear}-01-01`,
      end_date: `${currentYear}-12-31`,
      opening_balance: 0,
    })
  }

  const handleOpenModal = () => {
    resetForm()
    setShowModal(true)
  }

  const handleSubmit = async () => {
    try {
      await createFiscalYear(formData)
      setShowModal(false)
      resetForm()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Erreur lors de la création')
    }
  }

  const handleCloseYear = async (fy: FiscalYear) => {
    if (confirm(`Clôturer l'exercice "${fy.name}" ?\n\nCette action est irréversible.`)) {
      try {
        await closeFiscalYear(fy.id)
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Erreur lors de la clôture')
      }
    }
  }

  const getStatus = (fy: FiscalYear) => {
    const today = new Date()
    const start = new Date(fy.start_date)
    const end = new Date(fy.end_date)

    if (fy.is_closed) {
      return { label: 'Clôturé', color: '#6b7280', bg: '#f3f4f6', icon: CheckCircle }
    } else if (today >= start && today <= end) {
      return { label: 'En cours', color: '#22c55e', bg: '#dcfce7', icon: Calendar }
    } else if (today < start) {
      return { label: 'À venir', color: '#3b82f6', bg: '#dbeafe', icon: Calendar }
    } else {
      return { label: 'À clôturer', color: '#f59e0b', bg: '#fef3c7', icon: AlertTriangle }
    }
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' XOF'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Exercices fiscaux</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Gérez vos exercices comptables annuels
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: 'var(--primary-500)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          Nouvel exercice
        </button>
      </div>

      {/* Years list */}
      <div style={{ display: 'grid', gap: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
            Chargement...
          </div>
        ) : fiscalYears.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: 40,
              textAlign: 'center',
            }}
          >
            <Calendar size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px 0' }}>Aucun exercice fiscal</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Créez votre premier exercice fiscal pour commencer la comptabilité
            </p>
          </div>
        ) : (
          fiscalYears.map((fy) => {
            const status = getStatus(fy)
            const StatusIcon = status.icon

            return (
              <div
                key={fy.id}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      background: status.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <StatusIcon size={24} color={status.color} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{fy.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                        Du {new Date(fy.start_date).toLocaleDateString('fr-FR')} au {new Date(fy.end_date).toLocaleDateString('fr-FR')}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                          background: status.bg,
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Report à nouveau</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {formatCurrency(fy.opening_balance)}
                    </div>
                  </div>

                  {fy.is_closed && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Clôturé le</div>
                      <div style={{ fontSize: 14 }}>
                        {fy.closed_at ? new Date(fy.closed_at).toLocaleDateString('fr-FR') : '-'}
                      </div>
                    </div>
                  )}

                  {!fy.is_closed && (
                    <button
                      onClick={() => handleCloseYear(fy)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 12px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      <XCircle size={14} />
                      Clôturer
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 500,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18 }}>Nouvel exercice fiscal</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                  Nom de l'exercice *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Exercice 2024"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                    Date de début *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                    Date de fin *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                  Report à nouveau (solde d'ouverture)
                </label>
                <input
                  type="number"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                onClick={() => setShowModal(false)}
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
                onClick={handleSubmit}
                disabled={!formData.name || !formData.start_date || !formData.end_date}
                style={{
                  padding: '10px 20px',
                  background: formData.name && formData.start_date && formData.end_date ? 'var(--primary-500)' : 'var(--text-tertiary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: formData.name && formData.start_date && formData.end_date ? 'pointer' : 'not-allowed',
                }}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
