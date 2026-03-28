import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, CreditCard, Download, CheckCircle, Clock, AlertTriangle, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { API_BASE_URL } from '../../lib/api'

interface PublicInvoice {
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
  customer_name: string
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
  portal_token: string | null
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Payée',
  PARTIAL: 'Partielle',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
}

export default function PublicInvoicePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [operator, setOperator] = useState('orange')

  useEffect(() => {
    if (!token) {
      setError('Lien invalide')
      setLoading(false)
      return
    }

    const fetchInvoice = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/portal/public/invoice/${token}`)
        if (res.ok) {
          setInvoice(await res.json())
        } else if (res.status === 404) {
          setError('Facture non trouvée ou lien expiré')
        } else {
          setError('Erreur lors du chargement')
        }
      } catch (err) {
        setError('Erreur de connexion')
      } finally {
        setLoading(false)
      }
    }
    fetchInvoice()
  }, [token])

  const formatCurrency = (val: number, currency: string = 'XOF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(val)
  }

  const handlePayment = async () => {
    if (!invoice) return

    const paymentAmount = parseFloat(amount)
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Montant invalide')
      return
    }

    if (!phone) {
      toast.error('Veuillez entrer votre numéro')
      return
    }

    setPaying(true)
    try {
      const res = await fetch(`${API_BASE_URL}/portal/public/pay/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.portal_token,
          amount: paymentAmount,
          provider: 'mobile_money',
          phone_number: phone,
        }),
      })

      if (res.ok) {
        toast.success('Paiement effectué !')
        // Refresh invoice
        const refreshRes = await fetch(`${API_BASE_URL}/portal/public/invoice/${token}`)
        if (refreshRes.ok) {
          setInvoice(await refreshRes.json())
          setShowPaymentForm(false)
        }
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Erreur lors du paiement')
      }
    } catch (err) {
      toast.error('Erreur de connexion')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#6b7280' }}>Chargement de la facture...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        padding: '20px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px',
        }}>
          <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
            {error || 'Facture non trouvée'}
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Ce lien est peut-être expiré ou invalide.
          </p>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            Contactez l'entreprise pour obtenir un nouveau lien.
          </p>
        </div>
      </div>
    )
  }

  const statusIcon = invoice.status === 'PAID' ? CheckCircle :
    invoice.status === 'OVERDUE' ? AlertTriangle : Clock

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1f2937',
            }}>
              Facture {invoice.invoice_number}
            </h1>
            <p style={{ color: '#6b7280', marginTop: '4px' }}>
              {invoice.organisation.name}
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
            {statusIcon && <statusIcon size={18} color={
              invoice.status === 'PAID' ? '#16a34a' :
                invoice.status === 'OVERDUE' ? '#dc2626' : '#4f46e5'
            } />}
            <span style={{
              fontWeight: '600',
              color: invoice.status === 'PAID' ? '#166534' :
                invoice.status === 'OVERDUE' ? '#991b1b' : '#4338ca',
            }}>
              {statusLabels[invoice.status]}
            </span>
          </div>
        </div>

        {/* Invoice Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          marginBottom: '24px',
        }}>
          {/* Organisation Info */}
          <div style={{
            padding: '20px',
            background: '#f9fafb',
            borderBottom: '1px solid #f3f4f6',
          }}>
            <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
              {invoice.organisation.name}
            </div>
            {invoice.organisation.address && (
              <div style={{ color: '#6b7280', fontSize: '14px' }}>{invoice.organisation.address}</div>
            )}
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
              {invoice.organisation.phone && <span>Tél: {invoice.organisation.phone}</span>}
              {invoice.organisation.email && <span>{invoice.organisation.email}</span>}
            </div>
          </div>

          {/* Invoice Details */}
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Client</div>
                <div style={{ fontWeight: '600', color: '#1f2937' }}>{invoice.customer_name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Date d'émission</div>
                <div style={{ fontWeight: '500', color: '#1f2937' }}>
                  {new Date(invoice.issue_date).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>

            {/* Items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Description</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>Qté</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>Prix</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 8px', color: '#1f2937' }}>{item.description}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#6b7280' }}>{item.quantity}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#6b7280' }}>
                      {formatCurrency(item.unit_price, invoice.currency)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '500', color: '#1f2937' }}>
                      {formatCurrency(item.line_total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '250px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#6b7280' }}>Sous-total</span>
                    <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                  </div>
                  {invoice.tax_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#6b7280' }}>TVA</span>
                      <span>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
                    </div>
                  )}
                  {invoice.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#6b7280' }}>Remise</span>
                      <span style={{ color: '#10b981' }}>-{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '2px solid #e5e7eb',
                    fontWeight: '700',
                    fontSize: '18px',
                  }}>
                    <span>Total</span>
                    <span>{formatCurrency(invoice.total_amount, invoice.currency)}</span>
                  </div>

                  {invoice.amount_paid > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: '#10b981' }}>
                        <span>Payé</span>
                        <span>-{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '8px',
                        padding: '8px',
                        background: invoice.balance_due > 0 ? '#fef3c7' : '#dcfce7',
                        borderRadius: '6px',
                        fontWeight: '600',
                      }}>
                        <span>Reste à payer</span>
                        <span>{formatCurrency(invoice.balance_due, invoice.currency)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        {invoice.balance_due > 0 && invoice.status !== 'CANCELLED' && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                <CreditCard size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Effectuer un paiement
              </h2>
            </div>

            <div style={{ padding: '20px' }}>
              {!showPaymentForm ? (
                <button
                  onClick={() => setShowPaymentForm(true)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: 'pointer',
                  }}
                >
                  Payer {formatCurrency(invoice.balance_due, invoice.currency)}
                </button>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                      Montant à payer
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={invoice.balance_due.toString()}
                      max={invoice.balance_due}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '15px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                      Opérateur Mobile Money
                    </label>
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                      }}
                    >
                      <option value="orange">Orange Money</option>
                      <option value="mtm">MTN MoMo</option>
                      <option value="wave">Wave</option>
                      <option value="moov">Moov Money</option>
                      <option value="mpesa">M-Pesa</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                      Numéro de téléphone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+225 07 00 00 00 00"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '15px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setShowPaymentForm(false)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handlePayment}
                      disabled={paying}
                      style={{
                        flex: 2,
                        padding: '12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        fontWeight: '600',
                        cursor: paying ? 'not-allowed' : 'pointer',
                        opacity: paying ? 0.7 : 1,
                      }}
                    >
                      {paying ? 'Traitement...' : 'Confirmer le paiement'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '12px',
        }}>
          Propulsé par <strong>FacturePro Africa</strong>
        </div>
      </div>
    </div>
  )
}
