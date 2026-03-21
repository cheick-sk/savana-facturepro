import { useEffect, useState } from 'react'
import { 
  ShoppingBag, TrendingUp, TrendingDown, AlertTriangle, Calendar, 
  DollarSign, Package, Users, ArrowUpRight, ArrowDownRight, 
  Clock, ChevronRight, MoreHorizontal, RefreshCw, Filter, 
  Sparkles, BarChart3, PieChart, Activity, Zap, ArrowRight
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

const fmtNumber = (n: number) => 
  new Intl.NumberFormat('fr-FR').format(n)

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today')
  const [recentSales, setRecentSales] = useState<any[]>([])

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
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
      iconColor: 'text-white',
      lightBg: 'bg-emerald-50'
    },
    { 
      icon: DollarSign, 
      label: 'Chiffre d\'affaires', 
      value: fmt(stats.revenue_this_month), 
      sub: `${stats.sales_this_month} transactions`,
      trend: 8.2,
      trendUp: true,
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-gradient-to-br from-blue-400 to-indigo-500',
      iconColor: 'text-white',
      lightBg: 'bg-blue-50'
    },
    { 
      icon: Package, 
      label: 'Produits en stock', 
      value: '248', 
      sub: '12 catégories',
      trend: 3.1,
      trendUp: false,
      gradient: 'from-purple-500 to-violet-600',
      iconBg: 'bg-gradient-to-br from-purple-400 to-violet-500',
      iconColor: 'text-white',
      lightBg: 'bg-purple-50'
    },
    { 
      icon: AlertTriangle, 
      label: 'Alertes stock', 
      value: stats.low_stock_count, 
      sub: 'À réapprovisionner',
      trend: 0,
      trendUp: false,
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
      iconColor: 'text-white',
      lightBg: 'bg-amber-50',
      alert: stats.low_stock_count > 0
    },
  ] : []

  const quickActions = [
    { href: '/pos', icon: ShoppingBag, label: 'Nouvelle vente', gradient: 'from-emerald-500 to-teal-600' },
    { href: '/products', icon: Package, label: 'Ajouter produit', gradient: 'from-blue-500 to-indigo-600' },
    { href: '/stock', icon: TrendingUp, label: 'Mouvement stock', gradient: 'from-purple-500 to-violet-600' },
    { href: '/reports', icon: BarChart3, label: 'Rapport du jour', gradient: 'from-orange-500 to-amber-600' },
  ]

  const activities = [
    { icon: ShoppingBag, text: 'Nouvelle vente #1234', time: 'Il y a 5 min', color: 'text-emerald-500', bg: 'bg-emerald-100' },
    { icon: Package, text: 'Stock mis à jour - Riz 5kg', time: 'Il y a 15 min', color: 'text-blue-500', bg: 'bg-blue-100' },
    { icon: Users, text: 'Nouveau client inscrit', time: 'Il y a 1h', color: 'text-purple-500', bg: 'bg-purple-100' },
    { icon: AlertTriangle, text: 'Alerte: Stock faible', time: 'Il y a 2h', color: 'text-amber-500', bg: 'bg-amber-100' },
  ]

  const chartData = [
    { day: 'Lun', value: 60, sales: 32 },
    { day: 'Mar', value: 80, sales: 45 },
    { day: 'Mer', value: 45, sales: 28 },
    { day: 'Jeu', value: 90, sales: 52 },
    { day: 'Ven', value: 70, sales: 38 },
    { day: 'Sam', value: 95, sales: 58 },
    { day: 'Dim', value: 55, sales: 35 },
  ]

  const todayIndex = new Date().getDay() - 1
  const adjustedTodayIndex = todayIndex < 0 ? 6 : todayIndex

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-8 w-48 rounded-lg" />
            <div className="skeleton h-4 w-64 rounded-lg" />
          </div>
          <div className="skeleton h-10 w-64 rounded-xl" />
        </div>
        
        {/* KPI cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
        
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-96 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header - Modern */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <span>Tableau de bord</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <Sparkles size={12} />
              Pro
            </span>
          </h1>
          <p className="page-subtitle">
            Bienvenue ! Voici un aperçu de votre activité commerciale
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="time-range-selector">
            {(['today', 'week', 'month'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`time-range-btn ${timeRange === range ? 'active' : ''}`}
              >
                {range === 'today' ? "Aujourd'hui" : range === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
          
          {/* Refresh Button */}
          <button 
            onClick={() => setLoading(true)}
            className={`refresh-btn ${loading ? 'loading' : ''}`}
            title="Actualiser"
          >
            <RefreshCw size={18} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* KPI Cards - Modern Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <div 
            key={i} 
            className={`
              group relative overflow-hidden rounded-2xl p-5 
              bg-white border border-gray-100
              transition-all duration-300 ease-out
              hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1
              ${card.alert ? 'border-amber-200 bg-amber-50/30' : ''}
              animate-slideUp stagger-${i + 1}
            `}
          >
            {/* Top gradient line */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                <card.icon size={22} className={card.iconColor} />
              </div>
              
              {card.trend !== 0 && (
                <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  card.trendUp 
                    ? 'text-emerald-700 bg-emerald-100' 
                    : 'text-red-700 bg-red-100'
                }`}>
                  {card.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {card.trend}%
                </div>
              )}
            </div>
            
            {/* Value */}
            <div className="space-y-1">
              <div className="text-3xl font-bold text-gray-900 tracking-tight">
                {typeof card.value === 'number' ? fmtCompact(card.value) : card.value}
              </div>
              <div className="text-sm font-medium text-gray-800">{card.label}</div>
              <div className="text-xs text-gray-500">{card.sub}</div>
            </div>

            {/* Decorative background */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${card.lightBg} rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500`} />
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Area - Enhanced */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 size={20} className="text-emerald-500" />
                Aperçu des ventes
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">Évolution sur les 7 derniers jours</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Filter size={16} />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {/* Enhanced Chart */}
            <div className="chart-container h-64">
              {chartData.map((item, i) => {
                const isToday = i === adjustedTodayIndex
                return (
                  <div key={item.day} className="flex flex-col items-center gap-3 flex-1 group">
                    <div className="relative w-full flex flex-col items-center">
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {item.sales} ventes
                        <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                      </div>
                      
                      <div 
                        className={`
                          w-full max-w-[40px] rounded-t-xl transition-all duration-500 cursor-pointer
                          ${isToday 
                            ? 'bg-gradient-to-t from-emerald-500 to-teal-400 shadow-lg shadow-emerald-200' 
                            : 'bg-gray-100 hover:bg-emerald-100 group-hover:bg-emerald-100'
                          }
                        `}
                        style={{ 
                          height: `${item.value * 2.5}px`,
                          animationDelay: `${i * 100}ms`
                        }}
                      />
                    </div>
                    <span className={`text-sm font-medium transition-colors ${isToday ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                      {item.day}
                    </span>
                  </div>
                )
              })}
            </div>
            
            {/* Stats Summary - Enhanced */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-100">
              <div className="text-center group">
                <div className="text-2xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">1,248K</div>
                <div className="text-xs text-gray-500 mt-1">Ventes totales</div>
                <div className="h-1 w-12 mx-auto mt-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-emerald-500 rounded-full" />
                </div>
              </div>
              <div className="text-center group border-x border-gray-100">
                <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">45.2M</div>
                <div className="text-xs text-gray-500 mt-1">Chiffre d'affaires</div>
                <div className="h-1 w-12 mx-auto mt-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-blue-500 rounded-full" />
                </div>
              </div>
              <div className="text-center group">
                <div className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">36.2K</div>
                <div className="text-xs text-gray-500 mt-1">Panier moyen</div>
                <div className="h-1 w-12 mx-auto mt-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-purple-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions - Modern */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Zap size={18} className="text-amber-500" />
                Actions rapides
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action, i) => (
                  <a
                    key={i}
                    href={action.href}
                    className={`
                      quick-action bg-gradient-to-br ${action.gradient}
                      shadow-md hover:shadow-xl
                    `}
                  >
                    <action.icon size={24} strokeWidth={2} />
                    <span className="text-center leading-tight">{action.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Feed - Enhanced */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Activity size={18} className="text-blue-500" />
                Activité récente
              </h2>
              <button className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                Voir tout
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {activities.map((activity, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className={`p-2.5 rounded-xl ${activity.bg} transition-transform group-hover:scale-110`}>
                    <activity.icon size={16} className={activity.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{activity.text}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{activity.time}</div>
                  </div>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales - Modern Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingBag size={18} className="text-emerald-500" />
              Ventes récentes
            </h2>
            <a href="/reports" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              Voir tout <ChevronRight size={14} />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Vente</th>
                  <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Client</th>
                  <th className="text-right font-medium text-gray-500 text-xs uppercase tracking-wider">Montant</th>
                  <th className="text-center font-medium text-gray-500 text-xs uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentSales.length > 0 ? recentSales.map((sale, i) => (
                  <tr key={sale.id || i} className="hover:bg-gray-50/50 cursor-pointer transition-colors group">
                    <td className="py-4">
                      <div className="font-semibold text-gray-900">#{sale.sale_number || `VTE-${i + 1}`}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(sale.created_at || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-gray-700">{sale.customer_name || 'Client passage'}</div>
                    </td>
                    <td className="py-4 text-right">
                      <span className="font-semibold text-gray-900">{fmt(sale.total || 0)}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                        Complété
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="text-center py-12">
                      <div className="empty-state">
                        <ShoppingBag size={40} className="empty-state-icon" />
                        <div className="empty-state-title">Aucune vente récente</div>
                        <div className="empty-state-description">Les nouvelles ventes apparaîtront ici</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products - Modern List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <PieChart size={18} className="text-purple-500" />
              Produits populaires
            </h2>
            <a href="/products" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              Voir tout <ChevronRight size={14} />
            </a>
          </div>
          <div className="divide-y divide-gray-50">
            {(stats?.top_products_today?.length ?? 0) > 0 ? stats!.top_products_today.map((product: any, i: number) => (
              <div key={product.id || i} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                <div className={`product-rank ${i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : ''}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{product.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{product.quantity_sold || 0} vendus</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {fmt(product.revenue || 0)}
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            )) : [
              { name: 'Riz 5kg Premium', qty: 45, revenue: 675000 },
              { name: 'Huile Palme 1L', qty: 38, revenue: 380000 },
              { name: 'Sucre 1kg', qty: 32, revenue: 224000 },
              { name: 'Savon Multipack', qty: 28, revenue: 196000 },
              { name: 'Lait Concentré', qty: 24, revenue: 168000 },
            ].map((product, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                <div className={`product-rank ${i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : ''}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{product.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{product.qty} vendus</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {fmt(product.revenue)}
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
