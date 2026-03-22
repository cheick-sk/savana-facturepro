import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  CreditCard,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Plus,
  Download,
  Calendar,
  DollarSign,
  Activity
} from 'lucide-react'

const fmt = (n: number, currency = 'XOF') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(n)) + ' ' + currency
}

interface Stats {
  total_revenue: number
  revenue_this_month: number
  revenue_last_month: number
  growth_rate: number
  invoices_overdue: number
  invoices_paid: number
  invoices_sent: number
  invoices_draft: number
  invoices_partial: number
  outstanding_balance: number
  total_customers: number
  top_customers: Array<{ id: number; name: string; revenue: number }>
  revenue_by_month: Array<{ year: number; month: number; revenue: number }>
  expense_total_month: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(r => setStats(r.data))
      .catch(err => setError(err?.response?.data?.detail || 'Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        gap: 16
      }}>
        <div className="spinner spinner-lg" />
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Chargement des statistiques...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: 24,
        background: 'var(--danger-50)',
        border: '1px solid var(--danger-100)',
        borderRadius: 12,
        color: 'var(--danger-600)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  const KPI_CARDS = [
    {
      title: 'CA Total',
      value: fmt(stats?.total_revenue || 0),
      icon: DollarSign,
      color: '#3b82f6',
      bg: '#eff6ff'
    },
    {
      title: 'CA ce mois',
      value: fmt(stats?.revenue_this_month || 0),
      icon: TrendingUp,
      color: '#22c55e',
      bg: '#f0fdf4',
      change: stats?.growth_rate || 0
    },
    {
      title: 'Clients actifs',
      value: stats?.total_customers || 0,
      icon: Users,
      color: '#8b5cf6',
      bg: '#f5f3ff'
    },
    {
      title: 'En attente',
      value: fmt(stats?.outstanding_balance || 0),
      icon: Clock,
      color: '#f59e0b',
      bg: '#fffbeb'
    }
  ]

  const INVOICE_STATS = [
    { label: 'Payées', value: stats?.invoices_paid || 0, color: '#22c55e' },
    { label: 'Envoyées', value: stats?.invoices_sent || 0, color: '#3b82f6' },
    { label: 'En retard', value: stats?.invoices_overdue || 0, color: '#ef4444' },
    { label: 'Brouillons', value: stats?.invoices_draft || 0, color: '#6b7280' }
  ]

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 32
      }}>
        <div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            marginBottom: 8
          }}>
            Tableau de bord
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 15,
            margin: 0
          }}>
            Vue d'ensemble de votre activité commerciale
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link
            to="/invoices/new"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#fff',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)'
            }}
          >
            <Plus size={18} />
            Nouvelle facture
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20,
        marginBottom: 32
      }}>
        {KPI_CARDS.map((card, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 16
            }}>
              <div style={{
                width: 48,
                height: 48,
                background: card.bg,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <card.icon size={24} color={card.color} />
              </div>
              {'change' in card && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  background: (card.change || 0) >= 0 ? 'var(--success-50)' : 'var(--danger-50)',
                  color: (card.change || 0) >= 0 ? 'var(--success-600)' : 'var(--danger-600)'
                }}>
                  {(card.change || 0) >= 0 ? (
                    <ArrowUpRight size={14} />
                  ) : (
                    <ArrowDownRight size={14} />
                  )}
                  {Math.abs(card.change || 0)}%
                </div>
              )}
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 4
            }}>
              {card.value}
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary)'
            }}>
              {card.title}
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 24,
        marginBottom: 32
      }}>
        {/* Invoice Status */}
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: 16,
          padding: 24,
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24
          }}>
            <h3 style={{
              fontSize: 16,
              fontWeight: 600,
              margin: 0
            }}>
              État des factures
            </h3>
            <Link
              to="/invoices"
              style={{
                fontSize: 13,
                color: 'var(--primary-600)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              Voir tout
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {INVOICE_STATS.map((stat, idx) => (
              <div
                key={idx}
                style={{
                  padding: 20,
                  background: 'var(--bg-secondary)',
                  borderRadius: 12,
                  textAlign: 'center'
                }}
              >
                <div style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: stat.color,
                  marginBottom: 8
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)'
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Simple Chart Placeholder */}
          <div style={{
            marginTop: 24,
            padding: 20,
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
            color: 'var(--text-tertiary)',
            fontSize: 14
          }}>
            <Activity size={20} style={{ marginRight: 8 }} />
            Graphique des revenus mensuels (à implémenter)
          </div>
        </div>

        {/* Top Customers */}
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: 16,
          padding: 24,
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <h3 style={{
              fontSize: 16,
              fontWeight: 600,
              margin: 0
            }}>
              Top clients
            </h3>
            <Link
              to="/customers"
              style={{
                fontSize: 13,
                color: 'var(--primary-600)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              Voir tout
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {stats?.top_customers && stats.top_customers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.top_customers.map((customer, idx) => (
                <div
                  key={customer.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 10
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `linear-gradient(135deg, #3b82f6 ${idx * 15}%, #8b5cf6 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 14
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>
                      {customer.name}
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: 'var(--success-600)'
                  }}>
                    {fmt(customer.revenue)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: 40,
              textAlign: 'center',
              color: 'var(--text-tertiary)'
            }}>
              <Users size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
              <div>Aucun client pour le moment</div>
              <Link
                to="/customers"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 12,
                  fontSize: 13
                }}
              >
                Ajouter un client
                <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16
      }}>
        <Link
          to="/invoices"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: 20,
            background: 'var(--bg-primary)',
            borderRadius: 12,
            border: '1px solid var(--border-light)',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: 44,
            height: 44,
            background: '#eff6ff',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={20} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              Factures
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Gérer vos factures
            </div>
          </div>
        </Link>

        <Link
          to="/customers"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: 20,
            background: 'var(--bg-primary)',
            borderRadius: 12,
            border: '1px solid var(--border-light)',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: 44,
            height: 44,
            background: '#f5f3ff',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={20} color="#8b5cf6" />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              Clients
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Gérer vos clients
            </div>
          </div>
        </Link>

        <Link
          to="/payments"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: 20,
            background: 'var(--bg-primary)',
            borderRadius: 12,
            border: '1px solid var(--border-light)',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: 44,
            height: 44,
            background: '#f0fdf4',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CreditCard size={20} color="#22c55e" />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              Paiements
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Suivi des paiements
            </div>
          </div>
        </Link>

        <Link
          to="/products"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: 20,
            background: 'var(--bg-primary)',
            borderRadius: 12,
            border: '1px solid var(--border-light)',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: 44,
            height: 44,
            background: '#fffbeb',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Activity size={20} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              Produits
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Catalogue produits
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
