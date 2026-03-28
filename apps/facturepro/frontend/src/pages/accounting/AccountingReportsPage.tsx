import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, PieChart, BarChart3, Download, Calendar,
  TrendingUp, TrendingDown, Building2, Users, Package
} from 'lucide-react'
import { useAccountingStore } from '../../store/accounting'

const REPORTS = [
  {
    id: 'trial-balance',
    title: 'Balance Générale',
    description: 'Liste des soldes de tous les comptes',
    icon: BarChart3,
    color: '#3b82f6',
    route: '/accounting/reports/trial-balance',
  },
  {
    id: 'general-ledger',
    title: 'Grand Livre',
    description: 'Mouvements détaillés par compte',
    icon: FileText,
    color: '#8b5cf6',
    route: '/accounting/reports/general-ledger',
  },
  {
    id: 'income-statement',
    title: 'Compte de Résultat',
    description: 'Charges et produits de l\'exercice',
    icon: TrendingUp,
    color: '#22c55e',
    route: '/accounting/reports/income-statement',
  },
  {
    id: 'balance-sheet',
    title: 'Bilan',
    description: 'Situation patrimoniale de l\'entreprise',
    icon: Building2,
    color: '#f59e0b',
    route: '/accounting/reports/balance-sheet',
  },
  {
    id: 'aged-receivable',
    title: 'Balance Âgée Clients',
    description: 'Créances clients par ancienneté',
    icon: Users,
    color: '#ef4444',
    route: '/accounting/reports/aged-receivable',
  },
  {
    id: 'aged-payable',
    title: 'Balance Âgée Fournisseurs',
    description: 'Dettes fournisseurs par ancienneté',
    icon: Package,
    color: '#6366f1',
    route: '/accounting/reports/aged-payable',
  },
]

export default function AccountingReportsPage() {
  const navigate = useNavigate()
  const { dashboardStats, fetchDashboardStats, loading } = useAccountingStore()

  useEffect(() => {
    fetchDashboardStats()
  }, [fetchDashboardStats])

  const formatAmount = (value: number) => {
    return value?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' XOF'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>États financiers</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          Générez vos rapports comptables OHADA
        </p>
      </div>

      {/* Quick Stats */}
      {dashboardStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Chiffre d'affaires</div>
                <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
                  {formatAmount(dashboardStats.total_revenue)}
                </div>
              </div>
              <div
                style={{
                  padding: 8,
                  background: '#dcfce7',
                  borderRadius: 8,
                }}
              >
                <TrendingUp size={18} color="#22c55e" />
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Charges totales</div>
                <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
                  {formatAmount(dashboardStats.total_expenses)}
                </div>
              </div>
              <div
                style={{
                  padding: 8,
                  background: '#fee2e2',
                  borderRadius: 8,
                }}
              >
                <TrendingDown size={18} color="#ef4444" />
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Créances clients</div>
                <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
                  {formatAmount(dashboardStats.accounts_receivable)}
                </div>
              </div>
              <div
                style={{
                  padding: 8,
                  background: '#dbeafe',
                  borderRadius: 8,
                }}
              >
                <Users size={18} color="#3b82f6" />
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Dettes fournisseurs</div>
                <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
                  {formatAmount(dashboardStats.accounts_payable)}
                </div>
              </div>
              <div
                style={{
                  padding: 8,
                  background: '#fef3c7',
                  borderRadius: 8,
                }}
              >
                <Package size={18} color="#f59e0b" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result indicator */}
      {dashboardStats && (
        <div
          style={{
            background: dashboardStats.net_result >= 0 ? '#dcfce7' : '#fee2e2',
            border: `1px solid ${dashboardStats.net_result >= 0 ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: dashboardStats.net_result >= 0 ? '#22c55e' : '#dc2626' }}>
              Résultat net de l'exercice
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {dashboardStats.fiscal_year}
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: dashboardStats.net_result >= 0 ? '#22c55e' : '#dc2626' }}>
            {formatAmount(dashboardStats.net_result)}
          </div>
        </div>
      )}

      {/* Reports Grid */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Générer un rapport</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {REPORTS.map((report) => {
            const Icon = report.icon
            return (
              <div
                key={report.id}
                onClick={() => navigate(report.route)}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 12,
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: `${report.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={22} color={report.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{report.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      {report.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 0, marginBottom: 16 }}>
          Actions rapides
        </h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate('/accounting/reports/trial-balance')}
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
            <BarChart3 size={16} />
            Balance Générale
          </button>
          <button
            onClick={() => navigate('/accounting/reports/income-statement')}
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
            <TrendingUp size={16} />
            Compte de Résultat
          </button>
          <button
            onClick={() => navigate('/accounting/reports/balance-sheet')}
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
            <Building2 size={16} />
            Bilan
          </button>
        </div>
      </div>
    </div>
  )
}
