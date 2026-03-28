import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Check, X, Search, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { API_BASE_URL } from '../../lib/api'

interface Quote {
  id: number
  quote_number: string
  status: string
  issue_date: string
  expiry_date: string | null
  total_amount: number
  currency: string
}

interface PaginatedQuotes {
  items: Quote[]
  total: number
  page: number
  size: number
  pages: number
}

interface PortalQuotesPageProps {
  token: string
  onViewQuote: (id: number) => void
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  ACCEPTED: 'Accepté',
  REJECTED: 'Refusé',
  EXPIRED: 'Expiré',
  CONVERTED: 'Converti',
}

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: '#f3f4f6', text: '#374151' },
  SENT: { bg: '#dbeafe', text: '#1e40af' },
  ACCEPTED: { bg: '#dcfce7', text: '#166534' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b' },
  EXPIRED: { bg: '#fef3c7', text: '#92400e' },
  CONVERTED: { bg: '#e0e7ff', text: '#4338ca' },
}

export default function PortalQuotesPage({ token, onViewQuote }: PortalQuotesPageProps) {
  const { t } = useTranslation()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [acceptingId, setAcceptingId] = useState<number | null>(null)

  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', page.toString())
        params.set('size', '20')
        if (statusFilter) params.set('status', statusFilter)

        const res = await fetch(`${API_BASE_URL}/portal/quotes?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (res.ok) {
          const data: PaginatedQuotes = await res.json()
          setQuotes(data.items)
          setTotalPages(data.pages)
        }
      } catch (error) {
        console.error('Failed to fetch quotes:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchQuotes()
  }, [token, page, statusFilter])

  const handleAcceptQuote = async (quoteId: number) => {
    if (!confirm('Accepter ce devis ? Une facture sera générée automatiquement.')) return

    setAcceptingId(quoteId)
    try {
      const res = await fetch(`${API_BASE_URL}/portal/quotes/${quoteId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Devis accepté ! Une facture a été générée.')
        // Update the quote status in the list
        setQuotes(quotes.map(q =>
          q.id === quoteId ? { ...q, status: 'ACCEPTED' } : q
        ))
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Erreur lors de l\'acceptation')
      }
    } catch (error) {
      toast.error('Erreur de connexion')
    } finally {
      setAcceptingId(null)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'XOF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const filteredQuotes = quotes.filter(q =>
    q.quote_number.toLowerCase().includes(search.toLowerCase())
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
          Mes devis
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
            placeholder="Rechercher un devis..."
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
          <option value="SENT">Envoyés</option>
          <option value="ACCEPTED">Acceptés</option>
          <option value="REJECTED">Refusés</option>
          <option value="EXPIRED">Expirés</option>
        </select>
      </div>

      {/* Quote List */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280' }}>Chargement...</p>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div style={{
          padding: '60px 40px',
          textAlign: 'center',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #f3f4f6',
        }}>
          <FileText size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
          <p style={{ color: '#6b7280' }}>Aucun devis trouvé</p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #f3f4f6',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  N° Devis
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Date
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Expiration
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Montant
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
              {filteredQuotes.map((quote) => (
                <tr
                  key={quote.id}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {quote.quote_number}
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>
                    {new Date(quote.issue_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>
                    {quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#1f2937' }}>
                    {formatCurrency(quote.total_amount, quote.currency)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: statusColors[quote.status]?.bg || '#f3f4f6',
                      color: statusColors[quote.status]?.text || '#374151',
                    }}>
                      {statusLabels[quote.status] || quote.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => onViewQuote(quote.id)}
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
                      {quote.status === 'SENT' && (
                        <button
                          onClick={() => handleAcceptQuote(quote.id)}
                          disabled={acceptingId === quote.id}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            color: 'white',
                            cursor: acceptingId === quote.id ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            opacity: acceptingId === quote.id ? 0.7 : 1,
                          }}
                        >
                          {acceptingId === quote.id ? 'Traitement...' : 'Accepter'}
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
