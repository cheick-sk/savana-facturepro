import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Download, CreditCard, Filter, Search } from 'lucide-react'
import { API_BASE_URL } from '../../lib/api'

interface Invoice {
  id: number
  invoice_number: string
  status: string
  issue_date: string
  due_date: string | null
  total_amount: number
  amount_paid: number
  balance_due: number
  currency: string
  portal_viewed_at: string | null
}

interface PaginatedInvoices {
  items: Invoice[]
  total: number
  page: number
  size: number
  pages: number
}

interface PortalInvoicesPageProps {
  token: string
  onViewInvoice: (id: number) => void
  onPayInvoice: (id: number) => void
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Payée',
  PARTIAL: 'Partielle',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
}

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: '#f3f4f6', text: '#374151' },
  SENT: { bg: '#dbeafe', text: '#1e40af' },
  PAID: { bg: '#dcfce7', text: '#166534' },
  PARTIAL: { bg: '#fef3c7', text: '#92400e' },
  OVERDUE: { bg: '#fee2e2', text: '#991b1b' },
  CANCELLED: { bg: '#f3f4f6', text: '#6b7280' },
}

export default function PortalInvoicesPage({ token, onViewInvoice, onPayInvoice }: PortalInvoicesPageProps) {
  const { t } = useTranslation()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', page.toString())
        params.set('size', '20')
        if (statusFilter) params.set('status', statusFilter)

        const res = await fetch(`${API_BASE_URL}/portal/invoices?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (res.ok) {
          const data: PaginatedInvoices = await res.json()
          setInvoices(data.items)
          setTotalPages(data.pages)
        }
      } catch (error) {
        console.error('Failed to fetch invoices:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchInvoices()
  }, [token, page, statusFilter])

  const formatCurrency = (amount: number, currency: string = 'XOF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#1f2937',
        }}>
          <FileText size={28} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          Mes factures
        </h1>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af',
          }} />
          <input
            type="text"
            placeholder="Rechercher une facture..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="SENT">Envoyées</option>
          <option value="PARTIAL">Partielles</option>
          <option value="OVERDUE">En retard</option>
          <option value="PAID">Payées</option>
        </select>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280' }}>Chargement...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div style={{
          padding: '60px 40px',
          textAlign: 'center',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #f3f4f6',
        }}>
          <FileText size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
          <p style={{ color: '#6b7280' }}>Aucune facture trouvée</p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #f3f4f6',
          overflow: 'hidden',
        }}>
          {/* Desktop Table */}
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            display: 'table',
          }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  N° Facture
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Date
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Échéance
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Montant
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Reste à payer
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Statut
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {invoice.invoice_number}
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>
                    {new Date(invoice.issue_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>
                    {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#1f2937' }}>
                    {formatCurrency(invoice.total_amount, invoice.currency)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: invoice.balance_due > 0 ? '#ef4444' : '#10b981' }}>
                    {formatCurrency(invoice.balance_due, invoice.currency)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: statusColors[invoice.status]?.bg || '#f3f4f6',
                      color: statusColors[invoice.status]?.text || '#374151',
                    }}>
                      {statusLabels[invoice.status] || invoice.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => onViewInvoice(invoice.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          background: 'white',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: '#374151',
                        }}
                      >
                        Voir
                      </button>
                      {invoice.balance_due > 0 && invoice.status !== 'CANCELLED' && (
                        <button
                          onClick={() => onPayInvoice(invoice.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                          }}
                        >
                          Payer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '24px',
        }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: page === p ? 'none' : '1px solid #d1d5db',
                background: page === p ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                color: page === p ? 'white' : '#374151',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
