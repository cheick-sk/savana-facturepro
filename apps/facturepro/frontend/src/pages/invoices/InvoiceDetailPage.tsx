import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Send, CreditCard } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n * 100) / 100)
export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [inv, setInv] = useState<any>(null)
  const [showPay, setShowPay] = useState(false)
  const [payForm, setPayForm] = useState({ phone_number: '', operator: 'Orange Money' })
  const load = () => api.get(`/invoices/${id}`).then(r => setInv(r.data))
  useEffect(() => { load() }, [id])
  const pay = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post(`/invoices/${id}/simulate-payment`, payForm)
      toast.success('Paiement Mobile Money enregistré'); setShowPay(false); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Erreur') }
  }
  if (!inv) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>
  const STATUS: Record<string, string> = { DRAFT: 'Brouillon', SENT: 'Envoyée', PAID: 'Payée', OVERDUE: 'En retard' }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/invoices')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4, padding: 4 }}><ArrowLeft size={16} /> Retour</button>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>{inv.invoice_number}</h1>
        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }}>{STATUS[inv.status]}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => window.open(`/api/v1/invoices/${id}/pdf`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12 }}><Download size={13} /> PDF</button>
          {inv.status !== 'PAID' && <button onClick={() => setShowPay(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12 }}><CreditCard size={13} /> Paiement Mobile Money</button>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8 }}>CLIENT</div>
          <div style={{ fontWeight: 500 }}>{inv.customer.name}</div>
          {inv.customer.email && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{inv.customer.email}</div>}
          {inv.customer.phone && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{inv.customer.phone}</div>}
        </div>
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Date émission</span><span>{new Date(inv.issue_date).toLocaleDateString('fr-FR')}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Échéance</span><span>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, fontSize: 15, paddingTop: 6, borderTop: '0.5px solid var(--color-border-tertiary)' }}><span>Total</span><span>{fmt(inv.total_amount)} {inv.currency}</span></div>
          </div>
        </div>
      </div>
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: 'var(--color-background-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            {['Description','Quantité','Prix unit.','TVA','Total'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{h}</th>)}
          </tr></thead>
          <tbody>{inv.items.map((item: any) => (
            <tr key={item.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <td style={{ padding: '10px 14px' }}>{item.description}</td>
              <td style={{ padding: '10px 14px' }}>{item.quantity}</td>
              <td style={{ padding: '10px 14px' }}>{fmt(item.unit_price)} {inv.currency}</td>
              <td style={{ padding: '10px 14px' }}>{item.tax_rate}%</td>
              <td style={{ padding: '10px 14px', fontWeight: 500 }}>{fmt(item.line_total)} {inv.currency}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {showPay && (
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 20, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 500 }}>Simuler paiement Mobile Money</h3>
          <form onSubmit={pay} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Numéro de téléphone *</label><input value={payForm.phone_number} onChange={e => setPayForm({...payForm, phone_number: e.target.value})} placeholder="+221 77 000 0000" required /></div>
            <div><label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>Opérateur</label>
              <select value={payForm.operator} onChange={e => setPayForm({...payForm, operator: e.target.value})}>
                {['Orange Money','Wave','Free Money','MTN Mobile Money','Airtel Money'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <button type="submit">Confirmer le paiement</button>
            <button type="button" onClick={() => setShowPay(false)} style={{ background: 'none', color: 'var(--color-text-secondary)' }}>Annuler</button>
          </form>
        </div>
      )}
    </div>
  )
}
