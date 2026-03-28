import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, CreditCard, AlertTriangle, Clock, TrendingUp, ArrowRight } from 'lucide-react'
import { API_BASE_URL } from '../../lib/api'

interface DashboardData {
  total_outstanding: number
  total_paid: number
  overdue_count: number
  pending_count: number
  recent_invoices: any[]
  recent_payments: any[]
}

interface PortalDashboardPageProps {
  token: string
  onViewInvoice: (id: number) => void
}

export default function PortalDashboardPage({ token, onViewInvoice }: PortalDashboardPageProps) {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/portal/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [token])

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Chargement...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Impossible de charger les données</p>
      </div>
    )
  }

  const formatCurrency = (amount: number, currency: string = 'XOF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const statCards = [
    {
      label: 'Montant dû',
      value: formatCurrency(data.total_outstanding),
      icon: CreditCard,
      color: '#ef4444',
      bgColor: '#fef2f2',
    },
    {
      label: 'Total payé',
      value: formatCurrency(data.total_paid),
      icon: TrendingUp,
      color: '#10b981',
      bgColor: '#ecfdf5',
    },
    {
      label: 'Factures en retard',
      value: data.overdue_count.toString(),
      icon: AlertTriangle,
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    {
      label: 'En attente',
      value: data.pending_count.toString(),
      icon: Clock,
      color: '#6366f1',
      bgColor: '#eef2ff',
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: '24px',
      }}>
        Tableau de bord
      </h1>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {statCards.map((stat, index) => (
          <div
            key={index}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #f3f4f6',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>{stat.label}</span>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: stat.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <stat.icon size={20} color={stat.color} />
              </div>
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1f2937',
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Invoices */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #f3f4f6',
        marginBottom: '24px',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
            <FileText size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Factures récentes
          </h2>
        </div>

        {data.recent_invoices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Aucune facture
          </div>
        ) : (
          <div style={{ overflow: 'hidden' }}>
            {data.recent_invoices.map((invoice: any) => (
              <div
                key={invoice.id}
                onClick={() => onViewInvoice(invoice.id)}
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>
                    {invoice.invoice_number}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {new Date(invoice.issue_date).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>
                    {formatCurrency(invoice.total_amount, invoice.currency)}
                  </div>
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: invoice.status === 'PAID' ? '#dcfce7' :
                      invoice.status === 'OVERDUE' ? '#fee2e2' : '#e0e7ff',
                    color: invoice.status === 'PAID' ? '#166534' :
                      invoice.status === 'OVERDUE' ? '#991b1b' : '#3730a3',
                  }}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Payments */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #f3f4f6',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
            <CreditCard size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Paiements récents
          </h2>
        </div>

        {data.recent_payments.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Aucun paiement
          </div>
        ) : (
          <div>
            {data.recent_payments.map((payment: any) => (
              <div
                key={payment.id}
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>
                    {payment.reference || `Paiement #${payment.id}`}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {payment.method} • {new Date(payment.paid_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{
                  fontWeight: 600,
                  color: '#10b981',
                }}>
                  {formatCurrency(payment.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
