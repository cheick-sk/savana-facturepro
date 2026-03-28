import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, Printer, Calendar, TrendingUp, TrendingDown
} from 'lucide-react'
import { useAccountingStore } from '../../store/accounting'

export default function IncomeStatementPage() {
  const navigate = useNavigate()
  const { incomeStatement, reportsLoading, fetchIncomeStatement, fiscalYears } = useAccountingStore()

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
      fetchIncomeStatement(periodStart, periodEnd)
    }
  }, [fetchIncomeStatement, periodStart, periodEnd])

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
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Compte de Résultat</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
              Charges et produits de l'exercice
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
      ) : incomeStatement ? (
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
              {incomeStatement.organisation_name}
            </h2>
            <h3 style={{ fontSize: 16, fontWeight: 500, margin: '8px 0', color: 'var(--text-secondary)' }}>
              COMPTE DE RÉSULTAT
            </h3>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
              Du {new Date(incomeStatement.period_start).toLocaleDateString('fr-FR')} au {new Date(incomeStatement.period_end).toLocaleDateString('fr-FR')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Exercice: {incomeStatement.fiscal_year} | Devise: {incomeStatement.currency}
            </div>
          </div>

          {/* Two columns: Charges / Produits */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* CHARGES */}
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
                  background: '#fee2e2',
                  borderBottom: '1px solid var(--border-light)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#dc2626',
                }}
              >
                CHARGES
              </div>

              {/* Operating Expenses */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {incomeStatement.operating_expenses.title}
                </div>
                {incomeStatement.operating_expenses.lines.map((line, idx) => (
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
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'monospace' }}>{formatAmount(line.amount)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                        ({line.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-light)',
                    fontWeight: 500,
                    fontSize: 13,
                    color: '#dc2626',
                  }}
                >
                  <span>Total Charges d'Exploitation</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatAmount(incomeStatement.operating_expenses.total)}
                  </span>
                </div>
              </div>

              {/* Financial Expenses */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {incomeStatement.financial_expenses.title}
                </div>
                {incomeStatement.financial_expenses.lines.map((line, idx) => (
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
                    <span style={{ fontFamily: 'monospace' }}>{formatAmount(line.amount)}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-light)',
                    fontWeight: 500,
                    fontSize: 13,
                    color: '#dc2626',
                  }}
                >
                  <span>Total Charges Financières</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatAmount(incomeStatement.financial_expenses.total)}
                  </span>
                </div>
              </div>

              {/* Extraordinary Expenses */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {incomeStatement.extraordinary_expenses.title}
                </div>
                {incomeStatement.extraordinary_expenses.lines.map((line, idx) => (
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
                    <span style={{ fontFamily: 'monospace' }}>{formatAmount(line.amount)}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-light)',
                    fontWeight: 500,
                    fontSize: 13,
                    color: '#dc2626',
                  }}
                >
                  <span>Total Charges HAO</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatAmount(incomeStatement.extraordinary_expenses.total)}
                  </span>
                </div>
              </div>

              {/* Income Tax */}
              {incomeStatement.income_tax > 0 && (
                <div
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-light)',
                    fontSize: 13,
                    color: '#dc2626',
                  }}
                >
                  <span>Impôt sur les bénéfices</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatAmount(incomeStatement.income_tax)}
                  </span>
                </div>
              )}

              {/* TOTAL CHARGES */}
              <div
                style={{
                  padding: '12px 16px',
                  background: '#dc2626',
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                <span>TOTAL CHARGES</span>
                <span style={{ fontFamily: 'monospace' }}>
                  {formatAmount(
                    incomeStatement.operating_expenses.total +
                    incomeStatement.financial_expenses.total +
                    incomeStatement.extraordinary_expenses.total +
                    incomeStatement.income_tax
                  )}
                </span>
              </div>
            </div>

            {/* PRODUITS */}
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
                  color: '#22c55e',
                }}
              >
                PRODUITS
              </div>

              {/* Operating Income */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {incomeStatement.operating_income.title}
                </div>
                {incomeStatement.operating_income.lines.map((line, idx) => (
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
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'monospace' }}>{formatAmount(line.amount)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                        ({line.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-light)',
                    fontWeight: 500,
                    fontSize: 13,
                    color: '#22c55e',
                  }}
                >
                  <span>Total Produits d'Exploitation</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatAmount(incomeStatement.operating_income.total)}
                  </span>
                </div>
              </div>

              {/* Financial Income */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {incomeStatement.financial_income.title}
                </div>
                {incomeStatement.financial_income.lines.map((line, idx) => (
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
                    <span style={{ fontFamily: 'monospace' }}>{formatAmount(line.amount)}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-light)',
                    fontWeight: 500,
                    fontSize: 13,
                    color: '#22c55e',
                  }}
                >
                  <span>Total Produits Financiers</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatAmount(incomeStatement.financial_income.total)}
                  </span>
                </div>
              </div>

              {/* Extraordinary Income */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {incomeStatement.extraordinary_income.title}
                </div>
                {incomeStatement.extraordinary_income.lines.map((line, idx) => (
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
                    <span style={{ fontFamily: 'monospace' }}>{formatAmount(line.amount)}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-light)',
                    fontWeight: 500,
                    fontSize: 13,
                    color: '#22c55e',
                  }}
                >
                  <span>Total Produits HAO</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {formatAmount(incomeStatement.extraordinary_income.total)}
                  </span>
                </div>
              </div>

              {/* TOTAL PRODUITS */}
              <div
                style={{
                  padding: '12px 16px',
                  background: '#22c55e',
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                <span>TOTAL PRODUITS</span>
                <span style={{ fontFamily: 'monospace' }}>
                  {formatAmount(
                    incomeStatement.operating_income.total +
                    incomeStatement.financial_income.total +
                    incomeStatement.extraordinary_income.total
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px 0' }}>Synthèse des résultats</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div
                style={{
                  padding: 16,
                  background: incomeStatement.operating_result >= 0 ? '#dcfce7' : '#fee2e2',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Résultat d'Exploitation</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    marginTop: 4,
                    color: incomeStatement.operating_result >= 0 ? '#22c55e' : '#dc2626',
                  }}
                >
                  {formatAmount(incomeStatement.operating_result)}
                </div>
              </div>

              <div
                style={{
                  padding: 16,
                  background: incomeStatement.financial_result >= 0 ? '#dcfce7' : '#fee2e2',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Résultat Financier</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    marginTop: 4,
                    color: incomeStatement.financial_result >= 0 ? '#22c55e' : '#dc2626',
                  }}
                >
                  {formatAmount(incomeStatement.financial_result)}
                </div>
              </div>

              <div
                style={{
                  padding: 16,
                  background: incomeStatement.ordinary_result >= 0 ? '#dcfce7' : '#fee2e2',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Résultat Ordinaire</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    marginTop: 4,
                    color: incomeStatement.ordinary_result >= 0 ? '#22c55e' : '#dc2626',
                  }}
                >
                  {formatAmount(incomeStatement.ordinary_result)}
                </div>
              </div>

              <div
                style={{
                  padding: 16,
                  background: incomeStatement.net_result >= 0 ? '#dcfce7' : '#fee2e2',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  RÉSULTAT NET
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    marginTop: 4,
                    color: incomeStatement.net_result >= 0 ? '#22c55e' : '#dc2626',
                  }}
                >
                  {formatAmount(incomeStatement.net_result)}
                </div>
              </div>
            </div>
          </div>

          {/* Generated at */}
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Généré le {new Date(incomeStatement.generated_at).toLocaleString('fr-FR')}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
          Sélectionnez une période pour afficher le compte de résultat
        </div>
      )}
    </div>
  )
}
