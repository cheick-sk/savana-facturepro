import { useEffect, useState } from 'react'
import { DollarSign, ChevronDown, CreditCard, Smartphone, CheckCircle, Clock, AlertCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useParentPortalStore } from '../../store/parentPortal'

export default function FeesPage() {
  const { children, feeInvoices, fetchChildren, fetchFees, payFeeMobileMoney } = useParentPortalStore()
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedFee, setSelectedFee] = useState<any>(null)
  const [paymentProvider, setPaymentProvider] = useState('orange')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id)
    }
  }, [children, selectedChildId])

  useEffect(() => {
    if (selectedChildId) {
      fetchFees(selectedChildId)
    }
  }, [selectedChildId, fetchFees])

  const openPaymentModal = (fee: any) => {
    setSelectedFee(fee)
    setPaymentAmount(fee.amount_remaining)
    setShowPaymentModal(true)
  }

  const handlePayment = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast.error('Veuillez entrer un numéro de téléphone valide')
      return
    }

    setProcessing(true)
    try {
      const result = await payFeeMobileMoney(selectedFee.id, paymentAmount, paymentProvider, phoneNumber)
      toast.success('Paiement initié! Veuillez confirmer sur votre téléphone.')
      setShowPaymentModal(false)
      fetchFees(selectedChildId!)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du paiement')
    } finally {
      setProcessing(false)
    }
  }

  const statusConfig: Record<string, { icon: any; bg: string; color: string; label: string }> = {
    PAID: { icon: CheckCircle, bg: '#ecfdf5', color: '#059669', label: 'Payé' },
    PENDING: { icon: Clock, bg: '#fffbeb', color: '#f59e0b', label: 'En attente' },
    OVERDUE: { icon: AlertCircle, bg: '#fef2f2', color: '#dc2626', label: 'En retard' }
  }

  const providers = [
    { id: 'orange', name: 'Orange Money', color: '#ff7900' },
    { id: 'mtn', name: 'MTN MoMo', color: '#ffcc00' },
    { id: 'wave', name: 'Wave', color: '#00c8ff' },
    { id: 'moov', name: 'Moov Money', color: '#004c8c' },
    { id: 'mpesa', name: 'M-Pesa', color: '#00a651' }
  ]

  // Calculate totals
  const totalAmount = feeInvoices.reduce((sum, f) => sum + f.amount, 0)
  const totalPaid = feeInvoices.reduce((sum, f) => sum + f.amount_paid, 0)
  const totalRemaining = totalAmount - totalPaid

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)' }}>Scolarité</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Gérez les frais de scolarité
          </p>
        </div>

        {/* Child selector */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedChildId || ''}
            onChange={(e) => setSelectedChildId(parseInt(e.target.value))}
            style={{
              padding: '10px 36px 10px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-border-primary)',
              background: 'var(--color-background-primary)',
              fontSize: 14,
              appearance: 'none',
              cursor: 'pointer'
            }}
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>{child.full_name}</option>
            ))}
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-secondary)' }} />
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Total facturé</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{totalAmount.toLocaleString()} FCFA</div>
        </div>
        <div style={{ background: '#ecfdf5', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, color: '#059669', marginBottom: 8 }}>Total payé</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#059669' }}>{totalPaid.toLocaleString()} FCFA</div>
        </div>
        <div style={{ background: totalRemaining > 0 ? '#fef2f2' : '#ecfdf5', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, color: totalRemaining > 0 ? '#dc2626' : '#059669', marginBottom: 8 }}>Reste à payer</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: totalRemaining > 0 ? '#dc2626' : '#059669' }}>{totalRemaining.toLocaleString()} FCFA</div>
        </div>
      </div>

      {/* Fee invoices */}
      {feeInvoices.length === 0 ? (
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <DollarSign size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Aucune facture de scolarité</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feeInvoices.map((fee) => {
            const config = statusConfig[fee.status] || statusConfig.PENDING
            const Icon = config.icon
            return (
              <div
                key={fee.id}
                style={{
                  background: 'var(--color-background-primary)',
                  borderRadius: 12,
                  padding: 20
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{fee.description}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {fee.invoice_number} • {fee.term_name || 'Annuelle'}
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 20,
                    background: config.bg,
                    color: config.color,
                    fontSize: 13,
                    fontWeight: 500
                  }}>
                    <Icon size={14} />
                    {config.label}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Montant</div>
                      <div style={{ fontWeight: 600 }}>{fee.amount.toLocaleString()} FCFA</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Payé</div>
                      <div style={{ fontWeight: 600, color: '#059669' }}>{fee.amount_paid.toLocaleString()} FCFA</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Reste</div>
                      <div style={{ fontWeight: 600, color: fee.amount_remaining > 0 ? '#dc2626' : '#059669' }}>
                        {fee.amount_remaining.toLocaleString()} FCFA
                      </div>
                    </div>
                  </div>

                  {fee.amount_remaining > 0 && (
                    <button
                      onClick={() => openPaymentModal(fee)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 16px',
                        background: 'linear-gradient(135deg, #059669, #10b981)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      <Smartphone size={16} />
                      Payer
                    </button>
                  )}
                </div>

                {/* Payment history */}
                {fee.payments.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border-tertiary)' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Historique des paiements</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {fee.payments.map((payment) => (
                        <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span>{new Date(payment.paid_at).toLocaleDateString('fr-FR')} • {payment.method}</span>
                          <span style={{ fontWeight: 500 }}>{payment.amount.toLocaleString()} FCFA</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Payment modal */}
      {showPaymentModal && selectedFee && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--color-background-primary)',
            borderRadius: 16,
            padding: 24,
            width: 420,
            maxWidth: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>Paiement Mobile Money</h3>
              <button onClick={() => setShowPaymentModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 16, padding: 16, background: 'var(--color-background-secondary)', borderRadius: 8 }}>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{selectedFee.description}</div>
              <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{paymentAmount.toLocaleString()} FCFA</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Opérateur</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPaymentProvider(p.id)}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: paymentProvider === p.id ? `2px solid ${p.color}` : '1px solid var(--color-border-primary)',
                      background: paymentProvider === p.id ? `${p.color}15` : 'transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Numéro de téléphone</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 077000000"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border-primary)',
                  fontSize: 14
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border-primary)',
                  background: 'transparent',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handlePayment}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: 'white',
                  cursor: processing ? 'wait' : 'pointer',
                  fontWeight: 500
                }}
              >
                {processing ? 'Traitement...' : 'Payer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
