import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Plus,
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  CreditCard,
  Receipt,
  MoreHorizontal,
} from 'lucide-react'
import { Card, CardHeader, CardContent, CardFooter } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Skeleton, SkeletonCard } from '../../components/ui/Skeleton'
import { Avatar } from '../../components/ui/Avatar'
import { Dropdown, DropdownItem, DropdownSeparator } from '../../components/ui/Dropdown'
import api from '../../lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(n)

const fmtCompact = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return n.toString()
}

interface Stats {
  total_revenue: number
  revenue_this_month: number
  invoices_paid: number
  invoices_overdue: number
  invoices_sent: number
  invoices_draft: number
  top_customers: Array<{ id: string; name: string; revenue: number }>
}

// Stat Card Component
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: number; isPositive: boolean }
  gradient: string
  delay?: number
}

function StatCard({ title, value, subtitle, icon, trend, gradient, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-32 h-32 ${gradient} opacity-10 rounded-full -mr-16 -mt-16`} />
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {value}
              </p>
              {subtitle && (
                <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
              )}
              {trend && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`inline-flex items-center gap-0.5 text-sm font-medium ${
                    trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {trend.isPositive ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    {trend.value}%
                  </span>
                  <span className="text-xs text-gray-400">vs mois dernier</span>
                </div>
              )}
            </div>
            <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center shadow-lg`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Quick Action Button
interface QuickActionProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  gradient: string
}

function QuickAction({ icon, label, onClick, gradient }: QuickActionProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg transition-all duration-200"
    >
      <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center text-white shadow-md`}>
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
    </motion.button>
  )
}

// Activity Item
interface ActivityItemProps {
  type: 'invoice' | 'payment' | 'customer' | 'expense'
  title: string
  description: string
  amount?: string
  time: string
}

function ActivityItem({ type, title, description, amount, time }: ActivityItemProps) {
  const config = {
    invoice: { 
      icon: <FileText className="w-4 h-4" />, 
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400' 
    },
    payment: { 
      icon: <DollarSign className="w-4 h-4" />, 
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400' 
    },
    customer: { 
      icon: <Users className="w-4 h-4" />, 
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400' 
    },
    expense: { 
      icon: <CreditCard className="w-4 h-4" />, 
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400' 
    },
  }

  const { icon, bg, text } = config[type]

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <div className={`w-10 h-10 rounded-xl ${bg} ${text} flex items-center justify-center`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>
      </div>
      {amount && (
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{amount}</p>
        </div>
      )}
      <span className="text-xs text-gray-400 whitespace-nowrap">{time}</span>
    </motion.div>
  )
}

// Revenue chart bar
function ChartBar({ value, label, maxValue, delay }: { value: number; label: string; maxValue: number; delay: number }) {
  const height = (value / maxValue) * 100
  return (
    <div className="flex-1 flex flex-col items-center gap-2">
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: `${height}%` }}
        transition={{ delay, duration: 0.6, ease: 'easeOut' }}
        className="w-full rounded-t-lg bg-gradient-to-t from-primary-500 to-primary-400 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-shadow cursor-pointer relative group"
        style={{ minHeight: '4px' }}
      >
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {fmt(value)}
        </div>
      </motion.div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/dashboard/stats')
      .then((r) => setStats(r.data))
      .catch(() => {
        // Set demo data if API fails
        setStats({
          total_revenue: 15750000,
          revenue_this_month: 2350000,
          invoices_paid: 45,
          invoices_overdue: 3,
          invoices_sent: 12,
          invoices_draft: 8,
          top_customers: [
            { id: '1', name: 'Acme Corp', revenue: 4500000 },
            { id: '2', name: 'Tech Solutions SARL', revenue: 3200000 },
            { id: '3', name: 'Global Trade SA', revenue: 2800000 },
          ],
        })
      })
      .finally(() => setLoading(false))
  }, [])

  // Chart data
  const chartData = [
    { month: 'Jan', value: 2100000 },
    { month: 'Fév', value: 1800000 },
    { month: 'Mar', value: 2650000 },
    { month: 'Avr', value: 1950000 },
    { month: 'Mai', value: 3100000 },
    { month: 'Juin', value: 2350000 },
  ]
  const maxChartValue = Math.max(...chartData.map(d => d.value))

  // Sample activity data
  const recentActivity = [
    { type: 'invoice' as const, title: 'Facture #INV-2024-001', description: 'Envoyée à Acme Corp', amount: '1,500,000 XOF', time: '2h' },
    { type: 'payment' as const, title: 'Paiement reçu', description: 'De Tech Solutions SARL', amount: '750,000 XOF', time: '5h' },
    { type: 'customer' as const, title: 'Nouveau client', description: 'Digital Services SA ajouté', time: '1j' },
    { type: 'invoice' as const, title: 'Facture #INV-2024-002', description: 'Payée par Global Trade', amount: '2,300,000 XOF', time: '1j' },
    { type: 'expense' as const, title: 'Dépense enregistrée', description: 'Achat fournitures bureau', amount: '125,000 XOF', time: '2j' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Tableau de bord
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Bienvenue ! Voici un aperçu de votre activité
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={<Calendar className="w-4 h-4" />}>
            Ce mois
          </Button>
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
            Nouvelle facture
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Chiffre d'affaires"
            value={fmt(stats.total_revenue)}
            icon={<DollarSign className="w-6 h-6 text-white" />}
            trend={{ value: 12.5, isPositive: true }}
            gradient="bg-gradient-to-br from-primary-500 to-primary-600"
            delay={0}
          />
          <StatCard
            title="CA ce mois"
            value={fmt(stats.revenue_this_month)}
            icon={<TrendingUp className="w-6 h-6 text-white" />}
            trend={{ value: 8.2, isPositive: true }}
            gradient="bg-gradient-to-br from-green-500 to-green-600"
            delay={0.1}
          />
          <StatCard
            title="Factures payées"
            value={stats.invoices_paid}
            subtitle="Ce mois"
            icon={<CheckCircle className="w-6 h-6 text-white" />}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            delay={0.2}
          />
          <StatCard
            title="En retard"
            value={stats.invoices_overdue}
            subtitle="À relancer"
            icon={<AlertTriangle className="w-6 h-6 text-white" />}
            gradient="bg-gradient-to-br from-red-500 to-red-600"
            delay={0.3}
          />
          <StatCard
            title="Envoyées"
            value={stats.invoices_sent}
            subtitle="En attente"
            icon={<Receipt className="w-6 h-6 text-white" />}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            delay={0.4}
          />
          <StatCard
            title="Brouillons"
            value={stats.invoices_draft}
            subtitle="À finaliser"
            icon={<Clock className="w-6 h-6 text-white" />}
            gradient="bg-gradient-to-br from-amber-500 to-amber-600"
            delay={0.5}
          />
        </div>
      ) : null}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-700 px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Revenus</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Évolution sur les 6 derniers mois
              </p>
            </div>
            <Dropdown
              trigger={
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              }
            >
              <DropdownItem icon={<Download className="w-4 h-4" />}>Exporter CSV</DropdownItem>
              <DropdownItem icon={<Filter className="w-4 h-4" />}>Filtrer</DropdownItem>
            </Dropdown>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 flex items-end justify-between gap-3">
              {chartData.map((data, i) => (
                <ChartBar
                  key={data.month}
                  value={data.value}
                  label={data.month}
                  maxValue={maxChartValue}
                  delay={i * 0.1}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Top Customers */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Actions rapides</h3>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <QuickAction
                  icon={<FileText className="w-5 h-5" />}
                  label="Facture"
                  gradient="bg-gradient-to-br from-primary-500 to-primary-600"
                />
                <QuickAction
                  icon={<Users className="w-5 h-5" />}
                  label="Client"
                  gradient="bg-gradient-to-br from-green-500 to-green-600"
                />
                <QuickAction
                  icon={<Receipt className="w-5 h-5" />}
                  label="Devis"
                  gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <QuickAction
                  icon={<Download className="w-5 h-5" />}
                  label="Exporter"
                  gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* Top Customers */}
          {stats?.top_customers && stats.top_customers.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top clients</h3>
                <Button variant="ghost" size="sm">
                  Voir tout
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {stats.top_customers.map((customer, index) => (
                    <motion.div
                      key={customer.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {customer.name}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {fmtCompact(customer.revenue)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Activité récente</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Dernières actions sur votre compte
            </p>
          </div>
          <Button variant="ghost" size="sm">
            Voir tout
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton variant="circular" width={40} height={40} />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentActivity.map((activity, index) => (
                <ActivityItem key={index} {...activity} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
