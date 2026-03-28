import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, Printer, Calendar, CheckCircle, AlertCircle, Building2
} from 'lucide-react'
import { useAccountingStore } from '../../store/accounting'

export default function BalanceSheetPage() {
  const navigate = useNavigate()
  const { balanceSheet, reportsLoading, fetchBalanceSheet } = useAccountingStore()

  const [asOfDate, setAsOfDate] = useState('')

  useEffect(() => {
    // Set default to today
    const today = new Date().toISOString().split('T')[0]
    setAsOfDate(today)
  }, [])

  useEffect(() => {
    if (asOfDate) {
      fetchBalanceSheet(asOfDate)
    }
  }, [fetchBalanceSheet, asOfDate])

  const formatAmount = (value: number) => {
    return value?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })
  }

  const handlePrint = () => {
    window.print()
  }

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
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Bilan</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
              Situation patrimoniale au {asOfDate ? new Date(asOfDate).toLocaleDateString('fr-FR') : ''}
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

      {/* Date Selector */}
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
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Date d'arrêté:</span>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
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
      ) : balanceSheet ? (
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
              {balanceSheet.organisation_name}
            </h2>
            <h3 style={{ fontSize: 16, fontWeight: 500, margin: '8px 0', color: 'var(--text-secondary)' }}>
              BILAN SIMPLIFIÉ
            </h3>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
              Au {new Date(balanceSheet.as_of_date).toLocaleDateString('fr-FR')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Exercice: {balanceSheet.fiscal_year} | Devise: {balanceSheet.currency}
            </div>
          </div>

          {/* Two columns: Actif / Passif */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* ACTIF */}
            <div
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  background: '#dbeafe',
                  borderBottom: '1px solid var(--border-light)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1e40af',
                }}
              >
                ACTIF
              </div>

              {/* Section: Fixed Assets */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {balanceSheet.fixed_assets.title}
                </div>
                {balanceSheet.fixed_assets.lines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {line.account_number} - {line.account_name}
                    </span>
                    <span style={{ fontFamily: 'monospace' }}>{formatAmount(line.net_amount)}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-light)',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <span>Total Immobilisations</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatAmount(balanceSheet.fixed_assets.total_net)}
                  </span>
                </div>
              </div>

              {/* Section: Current Assets */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {balanceSheet.current_assets.title}
                </div>
                {balanceSheet.current_assets.lines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {line.account_number} - {line.account_name}
                    </span>
                    <span style={{ fontFamily: 'monospace' }}>{formatAmount(line.net_amount)}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-light)',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <span>Total Actif Circulant</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatAmount(balanceSheet.current_assets.total_net)}
                  </span>
                </div>
              </div>

              {/* Section: Cash */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {balanceSheet.cash_and_equivalents.title}
                </div>
                {balanceSheet.cash_and_equivalents.lines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {line.account_number} - {line.account_name}
                    </span>
                    <span style={{ fontFamily: 'monospace' }}>{formatAmount(line.net_amount)}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-light)',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <span>Total Trésorerie</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatAmount(balanceSheet.cash_and_equivalents.total_net)}
                  </span>
                </div>
              </div>

              {/* TOTAL ACTIF */}
              <div
                style={{
                  padding: '12px 16px',
                  background: '#1e40af',
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                <span>TOTAL ACTIF</span>
                <span style={{ fontFamily: 'monospace' }}>
                  {formatAmount(balanceSheet.total_assets)}
                </span>
              </div>
            </div>

            {/* PASSIF */}
            <div
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  background: '#dcfce7',
                  borderBottom: '1px solid var(--border-light)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#166534',
                }}
              >
                PASSIF
              </div>

              {/* Section: Equity */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {balanceSheet.equity.title}
                </div>
                {balanceSheet.equity.lines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {line.account_number} - {line.account_name}
                    </span>
                    <span style={{ fontFamily: 'monospace' }}>{formatAmount(line.net_amount)}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-light)',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <span>Total Capitaux Propres</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatAmount(balanceSheet.equity.total_net)}
                  </span>
                </div>
              </div>

              {/* Section: Long-term Liabilities */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {balanceSheet.long_term_liabilities.title}
                </div>
                {balanceSheet.long_term_liabilities.lines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {line.account_number} - {line.account_name}
                    </span>
                    <span style={{ fontFamily: 'monospace' }}>{formatAmount(line.net_amount)}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-light)',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <span>Total Dettes LT</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatAmount(balanceSheet.long_term_liabilities.total_net)}
                  </span>
                </div>
              </div>

              {/* Section: Current Liabilities */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {balanceSheet.current_liabilities.title}
                </div>
                {balanceSheet.current_liabilities.lines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {line.account_number} - {line.account_name}
                    </span>
                    <span style={{ fontFamily: 'monospace' }}>{formatAmount(line.net_amount)}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-light)',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <span>Total Dettes CT</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatAmount(balanceSheet.current_liabilities.total_net)}
                  </span>
                </div>
              </div>

              {/* TOTAL PASSIF */}
              <div
                style={{
                  padding: '12px 16px',
                  background: '#166534',
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                <span>TOTAL PASSIF</span>
                <span style={{ fontFamily: 'monospace' }}>
                  {formatAmount(balanceSheet.total_liabilities_and_equity)}
                </span>
              </div>
            </div>
          </div>

          {/* Balance Check */}
          <div
            style={{
              padding: 16,
              background: balanceSheet.is_balanced ? '#dcfce7' : '#fee2e2',
              border: `1px solid ${balanceSheet.is_balanced ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {balanceSheet.is_balanced ? (
              <>
                <CheckCircle size={20} color="#22c55e" />
                <span style={{ fontWeight: 500, color: '#22c55e' }}>
                  Bilan équilibré - Actif = Passif
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={20} color="#dc2626" />
                <span style={{ fontWeight: 500, color: '#dc2626' }}>
                  Attention: Le bilan n'est pas équilibré - Vérifiez les écritures
                </span>
              </>
            )}
          </div>

          {/* Generated at */}
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Généré le {new Date(balanceSheet.generated_at).toLocaleString('fr-FR')}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
          Sélectionnez une date pour afficher le bilan
        </div>
      )}
    </div>
  )
}
