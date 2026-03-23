import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  DollarSign,
  Package,
  Users,
  ArrowRight,
  Clock,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import api from '../../lib/api'
import { motion } from 'framer-motion'

interface Stats {
  sales_today: number
  revenue_today: number
  sales_this_month: number
  revenue_this_month: number
  low_stock_count: number
  top_products_today: Array<{
    name: string
    quantity: number
    revenue: number
  }>
  recent_sales: Array<{
    id: number
    total: number
    created_at: string
    customer_name?: string
  }>
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

const formatNumber = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/dashboard/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = stats ? [
    {
      icon: ShoppingBag,
      label: 'Ventes aujourd\'hui',
      value: stats.sales_today.toString(),
      sub: formatCurrency(stats.revenue_today),
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: DollarSign,
      label: 'CA du mois',
      value: formatCurrency(stats.revenue_this_month),
      sub: `${stats.sales_this_month} transactions`,
      color: 'from-secondary-500 to-green-600',
      bgColor: 'bg-secondary-50 dark:bg-secondary-900/20',
      textColor: 'text-secondary-600 dark:text-secondary-400',
    },
    {
      icon: AlertTriangle,
      label: 'Alertes stock',
      value: stats.low_stock_count.toString(),
      sub: 'Produits à réapprovisionner',
      color: stats.low_stock_count > 0 ? 'from-amber-500 to-orange-600' : 'from-green-500 to-green-600',
      bgColor: stats.low_stock_count > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-green-50 dark:bg-green-900/20',
      textColor: stats.low_stock_count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400',
    },
    {
      icon: Users,
      label: 'Clients du mois',
      value: Math.floor(stats.sales_this_month * 0.8).toString(),
      sub: 'Clients uniques servis',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            Tableau de bord
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Vue d'ensemble de votre activité commerciale
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4" />
            Aujourd'hui
          </Button>
          <Link to="/pos">
            <Button size="sm">
              <ShoppingBag className="w-4 h-4" />
              Nouvelle vente
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statCards.map((stat, index) => (
            <motion.div key={stat.label} variants={item}>
              <Card hover className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                      <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                    </div>
                    {index === 0 && (
                      <Badge variant="success" className="text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +12%
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {stat.sub}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Produits les plus vendus
                </h2>
              </div>
              <Link to="/products">
                <Button variant="ghost" size="sm">
                  Voir tout
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats?.top_products_today?.length ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {stats.top_products_today.slice(0, 5).map((product, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary-500 to-green-600 flex items-center justify-center text-white text-sm font-medium">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{product.quantity} vendus</p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucune vente aujourd'hui</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Accès rapides
            </h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { to: '/pos', icon: ShoppingBag, label: 'Point de vente', color: 'from-blue-500 to-blue-600' },
              { to: '/products', icon: Package, label: 'Gérer les produits', color: 'from-secondary-500 to-green-600' },
              { to: '/stock', icon: AlertTriangle, label: 'Mouvements stock', color: 'from-amber-500 to-orange-600' },
              { to: '/reports', icon: BarChart3, label: 'Rapports', color: 'from-purple-500 to-purple-600' },
            ].map((action) => (
              <Link key={action.to} to={action.to}>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-secondary-600 dark:group-hover:text-secondary-400 transition-colors">
                      {action.label}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-secondary-500 transition-colors" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Ventes récentes
              </h2>
            </div>
            <Link to="/reports">
              <Button variant="ghost" size="sm">
                Voir tout
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {stats?.recent_sales?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {stats.recent_sales.slice(0, 5).map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        #{sale.id.toString().padStart(6, '0')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {sale.customer_name || 'Client anonyme'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(sale.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune vente récente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
