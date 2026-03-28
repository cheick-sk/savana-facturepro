import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { CreditCard, Smartphone, Check, AlertCircle, Loader } from 'lucide-react'
import { API_BASE_URL } from '../../lib/api'

interface Invoice {
  id: number
  invoice_number: string
  total_amount: number
  amount_paid: number
  balance_due: number
  currency: string
}

interface PaymentFormProps {
  token: string
  invoice: Invoice
  onSuccess: () => void
  onCancel: () => void
}

const operators = [
  { id: 'orange', name: 'Orange Money', logo: '🟠' },
  { id: 'mtm', name: 'MTN MoMo', logo: '🟡' },
  { id: 'wave', name: 'Wave', logo: '🔵' },
  { id: 'moov', name: 'Moov Money', logo: '🟣' },
  { id: 'mpesa', name: 'M-Pesa', logo: '🟢' },
]

export default function PortalPaymentPage({ token, invoice, onSuccess, onCancel }: PaymentFormProps) {
  const { t } = useTranslation()
  const [method, setMethod] = useState<'mobile' | 'card'>('mobile')
  const [operator, setOperator] = useState('orange')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState(invoice.balance_due.toString())
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const formatCurrency = (val: number, currency: string = 'XOF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const paymentAmount = parseFloat(amount)
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Veuillez entrer un montant valide')
      return
    }

    if (paymentAmount > invoice.balance_due) {
      toast.error(`Le montant ne peut pas dépasser ${formatCurrency(invoice.balance_due, invoice.currency)}`)
      return
    }

    if (method === 'mobile' && !phone) {
      toast.error('Veuillez entrer votre numéro de téléphone')
      return
    }

    setLoading(true)

    try {
      const endpoint = method === 'mobile'
        ? `${API_BASE_URL}/portal/payments/mobile-money`
        : `${API_BASE_URL}/portal/payments/process`

      const body = method === 'mobile'
        ? {
          invoice_id: invoice.id,
          amount: paymentAmount,
          phone_number: phone,
          operator: operator,
        }
        : {
          invoice_id: invoice.id,
          amount: paymentAmount,
          provider: 'stripe',
        }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setSuccess(true)
        toast.success('Paiement effectué avec succès !')
        setTimeout(onSuccess, 2000)
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Erreur lors du paiement')
      }
    } catch (error) {
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{
        padding: '60px 40px',
        textAlign: 'center',
        background: 'white',
        borderRadius: '16px',
        maxWidth: '500px',
        margin: '0 auto',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#dcfce7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <Check size={40} color="#16a34a" />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '12px' }}>
          Paiement réussi !
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          Votre paiement de <strong>{formatCurrency(parseFloat(amount), invoice.currency)}</strong> a été enregistré.
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Redirection en cours...
        </p>
      </div>
    )
  }

  return (
    <div style={{
      padding: '24px',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      {/* Invoice Summary */}
      <div style={{
        background: '#f9fafb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#6b7280' }}>Facture</span>
          <span style={{ fontWeight: '600' }}>{invoice.invoice_number}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#6b7280' }}>Montant total</span>
          <span>{formatCurrency(invoice.total_amount, invoice.currency)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#6b7280' }}>Déjà payé</span>
          <span style={{ color: '#10b981' }}>{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: '12px',
          borderTop: '1px solid #e5e7eb',
        }}>
          <span style={{ fontWeight: '600' }}>Reste à payer</span>
          <span style={{ fontWeight: '700', color: '#1f2937' }}>
            {formatCurrency(invoice.balance_due, invoice.currency)}
          </span>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #f3f4f6',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            Effectuer un paiement
          </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Amount */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#374151',
            }}>
              Montant à payer
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={invoice.balance_due}
                step="0.01"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              />
              <span style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280',
                fontSize: '14px',
              }}>
                {invoice.currency}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAmount(invoice.balance_due.toString())}
              style={{
                marginTop: '8px',
                padding: '4px 12px',
                borderRadius: '4px',
                border: 'none',
                background: '#e0e7ff',
                color: '#4338ca',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Payer la totalité
            </button>
          </div>

          {/* Payment Method Toggle */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
          }}>
            <button
              type="button"
              onClick={() => setMethod('mobile')}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '12px',
                border: method === 'mobile' ? '2px solid #6366f1' : '1px solid #d1d5db',
                background: method === 'mobile' ? '#eef2ff' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Smartphone size={24} color={method === 'mobile' ? '#4f46e5' : '#6b7280'} style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: '600', color: method === 'mobile' ? '#4f46e5' : '#374151' }}>
                Mobile Money
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Orange, MTN, Wave...
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMethod('card')}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '12px',
                border: method === 'card' ? '2px solid #6366f1' : '1px solid #d1d5db',
                background: method === 'card' ? '#eef2ff' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <CreditCard size={24} color={method === 'card' ? '#4f46e5' : '#6b7280'} style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: '600', color: method === 'card' ? '#4f46e5' : '#374151' }}>
                Carte bancaire
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Visa, Mastercard...
              </div>
            </button>
          </div>

          {/* Mobile Money Form */}
          {method === 'mobile' && (
            <>
              {/* Operator Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151',
                }}>
                  Opérateur
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                  gap: '8px',
                }}>
                  {operators.map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setOperator(op.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: operator === op.id ? '2px solid #6366f1' : '1px solid #d1d5db',
                        background: operator === op.id ? '#eef2ff' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{op.logo}</div>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                        {op.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Number */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151',
                }}>
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: +225 07 00 00 00 00"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '15px',
                  }}
                />
              </div>

              {/* Info Box */}
              <div style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                background: '#fef3c7',
                borderRadius: '8px',
                marginBottom: '24px',
              }}>
                <AlertCircle size={20} color="#92400e" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: '#92400e' }}>
                  Vous recevrez une notification sur votre téléphone pour confirmer le paiement.
                </p>
              </div>
            </>
          )}

          {/* Card Form */}
          {method === 'card' && (
            <div style={{
              padding: '20px',
              background: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Le paiement par carte bancaire sera disponible prochainement.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                color: '#374151',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || method === 'card'}
              style={{
                flex: 2,
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  Payer {formatCurrency(parseFloat(amount) || 0, invoice.currency)}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Security Note */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#f0fdf4',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <Check size={16} color="#16a34a" />
        <span style={{ fontSize: '13px', color: '#166534' }}>
          Paiement sécurisé • Vos données sont protégées
        </span>
      </div>
    </div>
  )
}
