import { useEffect, useState } from 'react'
import { ShoppingBag, TrendingUp, AlertTriangle, Calendar } from 'lucide-react'
import api from '../../lib/api'

interface Stats {
  sales_today: number; revenue_today: number
  sales_this_month: number; revenue_this_month: number
  low_stock_count: number; top_products_today: any[]
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  const cards = stats ? [
    { icon: ShoppingBag, label: 'Ventes aujourd\'hui', value: stats.sales_today.toString(), sub: `${fmt(stats.revenue_today)} XOF` },
    { icon: TrendingUp, label: 'CA ce mois', value: `${fmt(stats.revenue_this_month)} XOF`, sub: `${stats.sales_this_month} ventes` },
    { icon: AlertTriangle, label: 'Stocks faibles', value: stats.low_stock_count.toString(), sub: 'Produits à réapprovisionner' },
    { icon: Calendar, label: 'Ventes du mois', value: stats.sales_this_month.toString(), sub: 'Transactions complétées' },
  ] : []

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>Tableau de bord</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>Vue d'ensemble de votre activité</p>
      </div>

      {stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
          {cards.map(({ icon: Icon, label, value, sub }) => (
            <div key={label} style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={16} style={{ color: 'var(--color-text-secondary)' }} />
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--color-text-primary)' }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>
      )}

      <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)', padding: '20px 24px' }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 16px', color: 'var(--color-text-primary)' }}>Accès rapides</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { href: '/pos', label: 'Ouvrir la caisse' },
            { href: '/products', label: 'Gérer les produits' },
            { href: '/stock', label: 'Mouvements de stock' },
            { href: '/reports', label: 'Voir les rapports' },
          ].map(({ href, label }) => (
            <a key={href} href={href} style={{
              padding: '8px 16px', borderRadius: 'var(--border-radius-md)',
              border: '0.5px solid var(--color-border-secondary)',
              textDecoration: 'none', fontSize: 13,
              color: 'var(--color-text-primary)', background: 'var(--color-background-secondary)',
            }}>{label}</a>
          ))}
        </div>
      </div>
    </div>
  )
}
