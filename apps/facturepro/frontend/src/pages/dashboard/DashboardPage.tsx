import { useEffect, useState } from 'react'
import api from '../../lib/api'
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => { api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {}) }, [])
  return (
    <div>
      <div style={{ marginBottom: 24 }}><h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Tableau de bord</h1><p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>Vue d'ensemble de votre facturation</p></div>
      {stats ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'CA total', value: `${fmt(stats.total_revenue)} XOF` },
              { label: 'CA ce mois', value: `${fmt(stats.revenue_this_month)} XOF` },
              { label: 'Factures payées', value: stats.invoices_paid },
              { label: 'En retard', value: stats.invoices_overdue },
              { label: 'Envoyées', value: stats.invoices_sent },
              { label: 'Brouillons', value: stats.invoices_draft },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
          {stats.top_customers.length > 0 && (
            <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '20px 24px' }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 14px' }}>Top clients</h2>
              {stats.top_customers.map((c: any, i: number) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < stats.top_customers.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                  <span style={{ fontSize: 13 }}>{c.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{fmt(c.revenue)} XOF</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>}
    </div>
  )
}
