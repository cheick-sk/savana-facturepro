import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download, CreditCard, Printer, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { API_BASE_URL } from '../../lib/api'

interface Invoice {
  id: number
  invoice_number: string
  status: string
  issue_date: string
  due_date: string | null
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  currency: string
  notes: string | null
  items: Array<{
    id: number
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
    line_total: number
  }>
  organisation: {
    id: number
    name: string
    logo_url: string | null
    phone: string | null
    email: string | null
    address: string | null
    currency: string
    country: string
  }
  payments: Array<{
    id: number
    amount: number
    method: string
    reference: string | null
    paid_at: string
  }>
}

interface PortalInvoiceDetailPageProps {
  token: string
  invoiceId: number
  onBack: () => void
  onPay: () => void
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Payée',
  PARTIAL: 'Partielle',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
}

const statusIcons: Record<string, any> = {
  PAID: CheckCircle,
  PARTIAL: Clock,
  OVERDUE: AlertTriangle,
  SENT: Clock,
}

export default function PortalInvoiceDetailPage({ token, invoiceId, onBack, onPay }: PortalInvoiceDetailPageProps) {
  const { t } = useTranslation()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/portal/invoices/${invoiceId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (res.ok) {
          setInvoice(await res.json())
        }
      } catch (error) {
        console.error('Failed to fetch invoice:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchInvoice()
  }, [token, invoiceId])

  const handleDownloadPDF = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portal/invoices/${invoiceId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `facture_${invoice?.invoice_number}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to download PDF:', error)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'XOF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Chargement...</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Facture non trouvée</p>
        <button onClick={onBack} style={{ marginTop: '16px', color: '#6366f1', cursor: 'pointer' }}>
          Retour aux factures
        </button>
      </div>
    )
  }

  const StatusIcon = statusIcons[invoice.status] || Clock

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '14px',
          }}
        >
          <ArrowLeft size={18} />
          Retour
        </button>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleDownloadPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#374151',
            }}
          >
            <Download size={16} />
            PDF
          </button>
          {invoice.balance_due > 0 && invoice.status !== 'CANCELLED' && (
            <button
              onClick={onPay}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              <CreditCard size={16} />
              Payer {formatCurrency(invoice.balance_due, invoice.currency)}
            </button>
          )}
        </div>
      </div>

      {/* Invoice Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #f3f4f6',
        overflow: 'hidden',
      }}>
        {/* Header Section */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '8px',
            }}>
              {invoice.invoice_number}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Émise le {new Date(invoice.issue_date).toLocaleDateString('fr-FR')}
              {invoice.due_date && ` • Échéance le ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}`}
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: invoice.status === 'PAID' ? '#dcfce7' :
              invoice.status === 'OVERDUE' ? '#fee2e2' : '#e0e7ff',
          }}>
            <StatusIcon size={18} color={
              invoice.status === 'PAID' ? '#16a34a' :
                invoice.status === 'OVERDUE' ? '#dc2626' : '#4f46e5'
            } />
            <span style={{
              fontWeight: '600',
              color: invoice.status === 'PAID' ? '#166534' :
                invoice.status === 'OVERDUE' ? '#991b1b' : '#4338ca',
            }}>
              {statusLabels[invoice.status]}
            </span>
          </div>
        </div>

        {/* Organisation Info */}
        <div style={{
          padding: '20px 24px',
          background: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>
              De
            </h3>
            <p style={{ fontWeight: '600', color: '#1f2937' }}>{invoice.organisation.name}</p>
            {invoice.organisation.address && (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>{invoice.organisation.address}</p>
            )}
            {invoice.organisation.phone && (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Tél: {invoice.organisation.phone}</p>
            )}
            {invoice.organisation.email && (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>{invoice.organisation.email}</p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div style={{ padding: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                  Description
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                  Qté
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                  Prix unitaire
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                  TVA
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px 8px', color: '#1f2937' }}>
                    {item.description}
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right', color: '#6b7280' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right', color: '#6b7280' }}>
                    {formatCurrency(item.unit_price, invoice.currency)}
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right', color: '#6b7280' }}>
                    {item.tax_rate}%
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: '600', color: '#1f2937' }}>
                    {formatCurrency(item.line_total, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{
          padding: '24px',
          background: '#f9fafb',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <div style={{ width: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280' }}>Sous-total HT</span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            {invoice.tax_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>TVA</span>
                <span style={{ fontWeight: '500' }}>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
              </div>
            )}
            {invoice.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>Remise</span>
                <span style={{ fontWeight: '500', color: '#10b981' }}>-{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '12px',
              marginTop: '8px',
              borderTop: '2px solid #e5e7eb',
            }}>
              <span style={{ fontWeight: '600' }}>Total TTC</span>
              <span style={{ fontWeight: '700', fontSize: '18px' }}>{formatCurrency(invoice.total_amount, invoice.currency)}</span>
            </div>

            {invoice.amount_paid > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: '#10b981' }}>
                  <span>Payé</span>
                  <span style={{ fontWeight: '500' }}>-{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                  padding: '8px',
                  background: invoice.balance_due > 0 ? '#fef3c7' : '#dcfce7',
                  borderRadius: '6px',
                }}>
                  <span style={{ fontWeight: '600' }}>Reste à payer</span>
                  <span style={{ fontWeight: '700', color: invoice.balance_due > 0 ? '#92400e' : '#166534' }}>
                    {formatCurrency(invoice.balance_due, invoice.currency)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ padding: '24px', borderTop: '1px solid #f3f4f6' }}>
            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px' }}>
              Notes
            </h4>
            <p style={{ color: '#374151', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <div style={{
          marginTop: '24px',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #f3f4f6',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
              Historique des paiements
            </h3>
          </div>
          <div>
            {invoice.payments.map((payment) => (
              <div
                key={payment.id}
                style={{
                  padding: '16px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <div>
                  <p style={{ fontWeight: '500', color: '#1f2937' }}>
                    {payment.method} {payment.reference && `• ${payment.reference}`}
                  </p>
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>
                    {new Date(payment.paid_at).toLocaleDateString('fr-FR')} à {new Date(payment.paid_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span style={{ fontWeight: '600', color: '#10b981' }}>
                  +{formatCurrency(payment.amount, invoice.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
