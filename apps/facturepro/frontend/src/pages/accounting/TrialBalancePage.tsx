import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, Printer, Calendar, CheckCircle, AlertCircle
} from 'lucide-react'
import { useAccountingStore } from '../../store/accounting'

export default function TrialBalancePage() {
  const navigate = useNavigate()
  const { trialBalance, reportsLoading, fetchTrialBalance, fiscalYears } = useAccountingStore()

  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  useEffect(() => {
    // Set default period to current year
    const today = new Date()
    const yearStart = new Date(today.getFullYear(), 0, 1)
    setPeriodStart(yearStart.toISOString().split('T')[0])
    setPeriodEnd(today.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (periodStart && periodEnd) {
      fetchTrialBalance(periodStart, periodEnd)
    }
  }, [fetchTrialBalance, periodStart, periodEnd])

  const formatAmount = (value: number) => {
    return value?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = async () => {
    // TODO: Implement PDF export
    alert('Export PDF en cours de développement')
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'classe_1': 'Classe 1 - Capitaux',
      'classe_2': 'Classe 2 - Immobilisations',
      'classe_3': 'Classe 3 - Stocks',
      'classe_4': 'Classe 4 - Tiers',
      'classe_5': 'Classe 5 - Trésorerie',
      'classe_6': 'Classe 6 - Charges',
      'classe_7': 'Classe 7 - Produits',
      'classe_8': 'Classe 8 - Comptes spéciaux',
    }
    return labels[category] || category
  }

  // Group lines by category
  const groupedLines = trialBalance?.lines.reduce((acc, line) => {
    if (!acc[line.category]) {
      acc[line.category] = []
    }
    acc[line.category].push(line)
    return acc
  }, {} as Record<string, typeof trialBalance.lines>) || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/accounting/reports')}
            style={{
              padding: 8,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Balance Générale</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
              État des soldes de tous les comptes
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <Printer size={16} />
            Imprimer
          </button>
          <button
            onClick={handleExportPDF}
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
            <Download size={16} />
            Exporter PDF
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Calendar size={20} color="var(--text-tertiary)" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Période du</span>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-light)',
              borderRadius: 6,
              fontSize: 14,
            }}
          />
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>au</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-light)',
              borderRadius: 6,
              fontSize: 14,
            }}
          />
        </div>
      </div>

      {/* Report */}
      {reportsLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
          Chargement...
        </div>
      ) : trialBalance ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Report Header */}
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: 20,
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
              {trialBalance.organisation_name}
            </h2>
            <h3 style={{ fontSize: 16, fontWeight: 500, margin: '8px 0', color: 'var(--text-secondary)' }}>
              BALANCE GÉNÉRALE
            </h3>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
              Du {new Date(trialBalance.period_start).toLocaleDateString('fr-FR')} au {new Date(trialBalance.period_end).toLocaleDateString('fr-FR')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Exercice: {trialBalance.fiscal_year} | Devise: {trialBalance.currency}
            </div>
          </div>

          {/* Balance Table */}
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 200px 80px repeat(2, 1fr) repeat(2, 1fr)',
                gap: 8,
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-light)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textAlign: 'right',
              }}
            >
              <div style={{ textAlign: 'left' }}>N° Compte</div>
              <div style={{ textAlign: 'left' }}>Libellé</div>
              <div style={{ textAlign: 'center' }}>Classe</div>
              <div colSpan={2}>Mouvements de l'exercice</div>
              <div colSpan={2}>Soldes au {new Date(trialBalance.period_end).toLocaleDateString('fr-FR')}</div>
              <div></div>
              <div></div>
              <div style={{ textAlign: 'right' }}>Débit</div>
              <div style={{ textAlign: 'right' }}>Crédit</div>
              <div style={{ textAlign: 'right' }}>Débit</div>
              <div style={{ textAlign: 'right' }}>Crédit</div>
            </div>

            {/* Summary header row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 200px 80px 1fr 1fr 1fr 1fr',
                gap: 8,
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-light)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textAlign: 'right',
              }}
            >
              <div style={{ textAlign: 'left' }}></div>
              <div style={{ textAlign: 'left' }}></div>
              <div></div>
              <div style={{ textAlign: 'right' }}>Débit</div>
              <div style={{ textAlign: 'right' }}>Crédit</div>
              <div style={{ textAlign: 'right' }}>Débit</div>
              <div style={{ textAlign: 'right' }}>Crédit</div>
            </div>

            {/* Grouped Lines */}
            {Object.entries(groupedLines).map(([category, lines]) => (
              <div key={category}>
                {/* Category Header */}
                <div
                  style={{
                    padding: '8px 16px',
                    background: '#f8fafc',
                    borderBottom: '1px solid var(--border-light)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--primary-600)',
                  }}
                >
                  {getCategoryLabel(category)}
                </div>

                {/* Lines */}
                {lines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 200px 80px 1fr 1fr 1fr 1fr',
                      gap: 8,
                      padding: '10px 16px',
                      borderBottom: '1px solid var(--border-light)',
                      fontSize: 13,
                      textAlign: 'right',
                    }}
                  >
                    <div style={{ textAlign: 'left', fontFamily: 'monospace', fontWeight: 500 }}>
                      {line.account_number}
                    </div>
                    <div style={{ textAlign: 'left' }}>{line.account_name}</div>
                    <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 11 }}>
                      {line.category.replace('classe_', '')}
                    </div>
                    <div style={{ fontFamily: 'monospace' }}>
                      {formatAmount(line.movement_debit)}
                    </div>
                    <div style={{ fontFamily: 'monospace' }}>
                      {formatAmount(line.movement_credit)}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                      {formatAmount(line.closing_debit)}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                      {formatAmount(line.closing_credit)}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Totals */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 200px 80px 1fr 1fr 1fr 1fr',
                gap: 8,
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'right',
              }}
            >
              <div style={{ textAlign: 'left' }}></div>
              <div style={{ textAlign: 'left' }}>TOTAUX</div>
              <div></div>
              <div style={{ fontFamily: 'monospace' }}>
                {formatAmount(trialBalance.total_movement_debit)}
              </div>
              <div style={{ fontFamily: 'monospace' }}>
                {formatAmount(trialBalance.total_movement_credit)}
              </div>
              <div style={{ fontFamily: 'monospace' }}>
                {formatAmount(trialBalance.total_closing_debit)}
              </div>
              <div style={{ fontFamily: 'monospace' }}>
                {formatAmount(trialBalance.total_closing_credit)}
              </div>
            </div>
          </div>

          {/* Balance Check */}
          <div
            style={{
              padding: 16,
              background: trialBalance.is_balanced ? '#dcfce7' : '#fee2e2',
              border: `1px solid ${trialBalance.is_balanced ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {trialBalance.is_balanced ? (
              <>
                <CheckCircle size={20} color="#22c55e" />
                <span style={{ fontWeight: 500, color: '#22c55e' }}>
                  Balance équilibrée - Les totaux débits et crédits sont égaux
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={20} color="#dc2626" />
                <span style={{ fontWeight: 500, color: '#dc2626' }}>
                  Attention: La balance n'est pas équilibrée - Vérifiez les écritures
                </span>
              </>
            )}
          </div>

          {/* Generated at */}
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Généré le {new Date(trialBalance.generated_at).toLocaleString('fr-FR')}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
          Sélectionnez une période pour afficher la balance
        </div>
      )}
    </div>
  )
}
