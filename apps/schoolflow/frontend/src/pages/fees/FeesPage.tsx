import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
const STATUS: Record<string, any> = {
  PENDING: { label: 'En attente', bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)' },
  PARTIAL: { label: 'Partiel', bg: 'var(--color-background-info)', color: 'var(--color-text-info)' },
  PAID:    { label: 'Payée', bg: 'var(--color-background-success)', color: 'var(--color-text-success)' },
}
export default function FeesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [showPay, setShowPay] = useState<number | null>(null)
  const [payAmt, setPayAmt] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')
  const load = () => api.get('/fees/invoices', { params: { size: 50 } }).then(r => setInvoices(r.data.items || [])).catch(() => {})
  useEffect(() => { load() }, [])
  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post(`/fees/invoices/${showPay}/payments`, { amount: +payAmt, payment_method: payMethod })
      toast.success('Paiement enregistré'); setShowPay(null); setPayAmt(''); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Erreur') }
  }
  return (
    <div>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Scolarité</h1><p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>Suivi des frais de scolarité</p></div>
      {showPay !== null && (
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 20, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 500 }}>Enregistrer un paiement</h3>
          <form onSubmit={recordPayment} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Montant (XOF) *</label><input type="number" min="1" value={payAmt} onChange={e => setPayAmt(e.target.value)} required /></div>
            <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Mode de paiement</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                {['CASH','MOBILE_MONEY','BANK_TRANSFER','CARD'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <button type="submit">Confirmer</button>
            <button type="button" onClick={() => setShowPay(null)} style={{ background: 'none', color: 'var(--color-text-secondary)' }}>Annuler</button>
          </form>
        </div>
      )}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: 'var(--color-background-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            {['Élève','Description','Montant dû','Payé','Reste','Statut','Action'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{h}</th>)}
          </tr></thead>
          <tbody>{invoices.map((inv: any) => {
            const st = STATUS[inv.status] || STATUS.PENDING
            return (
              <tr key={inv.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 500 }}>{inv.student?.first_name} {inv.student?.last_name}</td>
                <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{inv.description}</td>
                <td style={{ padding: '10px 14px' }}>{fmt(inv.amount)} XOF</td>
                <td style={{ padding: '10px 14px', color: 'var(--color-text-success)' }}>{fmt(inv.paid_amount)} XOF</td>
                <td style={{ padding: '10px 14px', color: 'var(--color-text-warning)' }}>{fmt(inv.balance)} XOF</td>
                <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color }}>{st.label}</span></td>
                <td style={{ padding: '10px 14px' }}>
                  {inv.status !== 'PAID' && <button onClick={() => { setShowPay(inv.id); setPayAmt(String(inv.balance)) }} style={{ fontSize: 11, padding: '4px 10px' }}>Payer</button>}
                </td>
              </tr>
            )
          })}</tbody>
        </table>
        {invoices.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>Aucune facture de scolarité</div>}
      </div>
    </div>
  )
}
