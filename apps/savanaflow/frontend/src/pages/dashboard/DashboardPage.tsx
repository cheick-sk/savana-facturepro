import { useEffect, useState } from 'react'
import { 
  ShoppingBag, TrendingUp, TrendingDown, AlertTriangle, Calendar, 
  DollarSign, Package, Users, ArrowUpRight, ArrowDownRight, 
  Clock, ChevronRight, MoreHorizontal, RefreshCw, Filter
} from 'lucide-react'
import api from '../../lib/api'

interface Stats {
  sales_today: number
  revenue_today: number
  sales_this_month: number
  revenue_this_month: number
  low_stock_count: number
  top_products_today: any[]
  sales_trend?: number
  revenue_trend?: number
}

const fmt = (n: number, currency: string = 'GNF') => 
  new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n)

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today')
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [activityFeed, setActivityFeed] = useState<any[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {}),
      api.get('/sales', { params: { size: 5 } }).then(r => setRecentSales(r.data.items || [])).catch(() => []),
    ]).finally(() => setLoading(false))
  }, [timeRange])

  const kpiCards = stats ? [
    { 
      icon: ShoppingBag, 
      label: 'Ventes aujourd\'hui', 
      value: stats.sales_today, 
      sub: fmt(stats.revenue_today),
      trend: 12.5,
      trendUp: true,
      color: 'emerald' as const,
      bgColor: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    { 
      icon: DollarSign, 
      label: 'Chiffre d\'affaires', 
      value: fmt(stats.revenue_this_month), 
      sub: `${stats.sales_this_month} transactions`,
      trend: 8.2,
      trendUp: true,
      color: 'blue' as const,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    { 
      icon: Package, 
      label: 'Produits en stock', 
      value: '248', 
      sub: '12 catégories',
      trend: 3.1,
      trendUp: false,
      color: 'purple' as const,
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    { 
      icon: AlertTriangle, 
      label: 'Alertes stock', 
      value: stats.low_stock_count, 
      sub: 'Produits à réapprovisionner',
      trend: 0,
      trendUp: false,
      color: 'amber' as const,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      alert: stats.low_stock_count > 0
    },
  ] : []

  // Quick actions
  const quickActions = [
    { href: '/pos', icon: ShoppingBag, label: 'Nouvelle vente', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { href: '/products', icon: Package, label: 'Ajouter un produit', color: 'bg-blue-500 hover:bg-blue-600' },
    { href: '/stock', icon: TrendingUp, label: 'Mouvement de stock', color: 'bg-purple-500 hover:bg-purple-600' },
    { href: '/reports', icon: Calendar, label: 'Rapport du jour', color: 'bg-orange-500 hover:bg-orange-600' },
  ]

  // Recent activity
  const activities = [
    { icon: ShoppingBag, text: 'Nouvelle vente #1234', time: 'Il y a 5 min', color: 'text-emerald-500' },
    { icon: Package, text: 'Stock mis à jour - Riz 5kg', time: 'Il y a 15 min', color: 'text-blue-500' },
    { icon: Users, text: 'Nouveau client inscrit', time: 'Il y a 1h', color: 'text-purple-500' },
    { icon: AlertTriangle, text: 'Alerte: Stock faible', time: 'Il y a 2h', color: 'text-amber-500' },
  ]

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-36 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-80 rounded-xl" />
          <div className="skeleton h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tableau de bord</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Bienvenue, voici un aperçu de votre activité
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time range selector */}
          <div className="flex items-center bg-[var(--bg-primary)] rounded-lg border border-[var(--border-light)] p-1">
            {(['today', 'week', 'month'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  timeRange === range 
                    ? 'bg-[var(--primary-500)] text-white shadow-sm' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {range === 'today' ? "Aujourd'hui" : range === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
          
          {/* Refresh button */}
          <button 
            onClick={() => setLoading(true)}
            className="p-2 rounded-lg border border-[var(--border-light)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <RefreshCw size={18} className={`text-[var(--text-secondary)] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <div 
            key={i} 
            className={`
              kpi-card group cursor-pointer
              ${card.alert ? 'border-amber-300 bg-amber-50/30' : ''}
            `}
          >
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <card.icon size={22} className={card.iconColor} />
              </div>
              
              {card.trend !== 0 && (
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  card.trendUp 
                    ? 'text-emerald-700 bg-emerald-100' 
                    : 'text-red-700 bg-red-100'
                }`}>
                  {card.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {card.trend}%
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                {typeof card.value === 'number' ? fmtCompact(card.value) : card.value}
              </div>
              <div className="text-sm font-medium text-[var(--text-primary)] mt-1">{card.label}</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{card.sub}</div>
            </div>
            
            {/* Hover indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:from-transparent group-hover:via-emerald-500 group-hover:to-transparent opacity-0 group-hover:opacity-100 transition-all rounded-b-xl" />
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart area */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Aperçu des ventes</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">Évolution sur les 7 derniers jours</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost btn-sm">
                <Filter size={14} />
              </button>
              <button className="btn-ghost btn-sm">
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>
          
          <div className="card-body">
            {/* Placeholder chart */}
            <div className="relative h-64 flex items-end justify-around gap-2 px-4">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, i) => {
                const heights = [60, 80, 45, 90, 70, 95, 55]
                const isToday = i === new Date().getDay() - 1
                return (
                  <div key={day} className="flex flex-col items-center gap-2 flex-1">
                    <div 
                      className={`
                        w-full max-w-[40px] rounded-t-lg transition-all duration-500
                        ${isToday 
                          ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' 
                          : 'bg-[var(--bg-tertiary)] hover:bg-[var(--primary-200)]'
                        }
                      `}
                      style={{ 
                        height: `${heights[i]}%`,
                        animationDelay: `${i * 100}ms`
                      }}
                    />
                    <span className={`text-xs ${isToday ? 'font-medium text-emerald-600' : 'text-[var(--text-tertiary)]'}`}>
                      {day}
                    </span>
                  </div>
                )
              })}
            </div>
            
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[var(--border-light)]">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--text-primary)]">1,248K</div>
                <div className="text-xs text-[var(--text-tertiary)]">Ventes totales</div>
              </div>
              <div className="text-center border-x border-[var(--border-light)]">
                <div className="text-2xl font-bold text-[var(--text-primary)]">45.2M</div>
                <div className="text-xs text-[var(--text-tertiary)]">Chiffre d'affaires</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--text-primary)]">36.2K</div>
                <div className="text-xs text-[var(--text-tertiary)]">Panier moyen</div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-[var(--text-primary)]">Actions rapides</h2>
            </div>
            <div className="card-body p-3">
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, i) => (
                  <a
                    key={i}
                    href={action.href}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-xl
                      text-white font-medium text-sm transition-all
                      ${action.color}
                    `}
                  >
                    <action.icon size={24} />
                    <span className="text-center">{action.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-primary)]">Activité récente</h2>
              <button className="text-xs text-[var(--primary-600)] hover:underline">Voir tout</button>
            </div>
            <div className="divide-y divide-[var(--border-light)]">
              {activities.map((activity, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
                  <div className={`p-2 rounded-lg bg-[var(--bg-secondary)] ${activity.color}`}>
                    <activity.icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--text-primary)] truncate">{activity.text}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">Ventes récentes</h2>
            <a href="/reports" className="text-xs text-[var(--primary-600)] hover:underline flex items-center gap-1">
              Voir tout <ChevronRight size={12} />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Vente</th>
                  <th>Client</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length > 0 ? recentSales.map((sale, i) => (
                  <tr key={sale.id || i} className="hover:bg-[var(--bg-secondary)] cursor-pointer">
                    <td>
                      <div className="font-medium text-[var(--text-primary)]">#{sale.sale_number || `VTE-${i + 1}`}</div>
                      <div className="text-xs text-[var(--text-tertiary)]">{new Date(sale.created_at || Date.now()).toLocaleTimeString('fr-FR')}</div>
                    </td>
                    <td>
                      <div className="text-[var(--text-primary)]">{sale.customer_name || 'Client passage'}</div>
                    </td>
                    <td className="font-medium">{fmt(sale.total || 0)}</td>
                    <td>
                      <span className="badge badge-success">Complété</span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-[var(--text-tertiary)]">
                      Aucune vente récente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">Produits populaires</h2>
            <a href="/products" className="text-xs text-[var(--primary-600)] hover:underline flex items-center gap-1">
              Voir tout <ChevronRight size={12} />
            </a>
          </div>
          <div className="divide-y divide-[var(--border-light)]">
            {(stats?.top_products_today?.length ?? 0) > 0 ? stats!.top_products_today.map((product: any, i: number) => (
              <div key={product.id || i} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-medium text-[var(--text-secondary)]">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)] truncate">{product.name}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{product.quantity_sold || 0} vendus</div>
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {fmt(product.revenue || 0)}
                </div>
              </div>
            )) : [
              { name: 'Riz 5kg Premium', qty: 45, revenue: 675000 },
              { name: 'Huile Palme 1L', qty: 38, revenue: 380000 },
              { name: 'Sucre 1kg', qty: 32, revenue: 224000 },
              { name: 'Savon Multipack', qty: 28, revenue: 196000 },
              { name: 'Lait Concentré', qty: 24, revenue: 168000 },
            ].map((product, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-medium text-[var(--text-secondary)]">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)] truncate">{product.name}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{product.qty} vendus</div>
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {fmt(product.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
