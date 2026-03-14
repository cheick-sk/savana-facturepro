import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../../lib/api'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
const COLORS = ['#378ADD', '#1D9E75', '#D85A30', '#BA7517', '#D4537E']

export default function ReportsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month')
  const [report, setReport] = useState<any>(null)

  useEffect(() => {
    api.get('/reports/sales', { params: { period } }).then(r => setReport(r.data)).catch(() => setReport(null))
  }, [period])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Rapports</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>Analyse de vos ventes</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['today', 'week', 'month'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 14px', fontSize: 13,
              background: period === p ? 'var(--color-background-secondary)' : 'none',
              fontWeight: period === p ? 500 : 400,
            }}>
              {p === 'today' ? "Aujourd'hui" : p === 'week' ? '7 jours' : 'Ce mois'}
            </button>
          ))}
        </div>
      </div>

      {report ? (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Nb ventes', value: report.total_sales },
              { label: 'Chiffre d\'affaires', value: `${fmt(report.total_revenue)} XOF` },
              { label: 'Coût des ventes', value: `${fmt(report.total_cost)} XOF` },
              { label: 'Marge brute', value: `${fmt(report.gross_margin)} XOF` },
              { label: '% Marge', value: `${Math.round(report.gross_margin_pct * 10) / 10}%` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Top products bar chart */}
            <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '20px 24px' }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 16px' }}>Top produits</h2>
              {report.top_products.length > 0 ? (
                <div style={{ height: `${report.top_products.length * 44 + 40}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.top_products} layout="vertical" margin={{ left: 8, right: 32 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis type="number" tickFormatter={v => `${fmt(v)}`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(v: number) => [`${fmt(v)} XOF`, 'CA']} />
                      <Bar dataKey="revenue" fill="#378ADD" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Aucune donnée</p>}
            </div>

            {/* Payment method pie chart */}
            <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '20px 24px' }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 16px' }}>Modes de paiement</h2>
              {report.by_payment_method.length > 0 ? (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    {report.by_payment_method.map((d: any, i: number) => (
                      <span key={d.method} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                        {d.method} — {fmt(d.revenue)} XOF
                      </span>
                    ))}
                  </div>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={report.by_payment_method} dataKey="revenue" nameKey="method" cx="50%" cy="50%" outerRadius={80} label={({ method }) => method}>
                          {report.by_payment_method.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => `${fmt(v)} XOF`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Aucune donnée</p>}
            </div>
          </div>
        </>
      ) : (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement des rapports...</div>
      )}
    </div>
  )
}
