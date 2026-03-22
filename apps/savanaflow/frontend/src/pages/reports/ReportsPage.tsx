import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, DollarSign, ShoppingBag, Percent, Calendar, Download } from 'lucide-react'
import api from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { motion } from 'framer-motion'

const formatNumber = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
const formatCurrency = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#8b5cf6', '#ec4899']

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

export default function ReportsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month')
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/reports/sales', { params: { period } })
      .then(r => setReport(r.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [period])

  const periods = [
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week', label: '7 jours' },
    { key: 'month', label: 'Ce mois' },
  ] as const

  const kpis = report ? [
    { icon: ShoppingBag, label: 'Nombre de ventes', value: report.total_sales.toString(), color: 'from-blue-500 to-blue-600' },
    { icon: DollarSign, label: 'Chiffre d\'affaires', value: formatCurrency(report.total_revenue), color: 'from-secondary-500 to-green-600' },
    { icon: TrendingUp, label: 'Coût des ventes', value: formatCurrency(report.total_cost), color: 'from-amber-500 to-orange-600' },
    { icon: DollarSign, label: 'Marge brute', value: formatCurrency(report.gross_margin), color: 'from-purple-500 to-purple-600' },
    { icon: Percent, label: 'Taux de marge', value: `${Math.round(report.gross_margin_pct * 10) / 10}%`, color: 'from-pink-500 to-rose-600' },
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            Rapports
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Analyse de vos ventes et performances
          </p>
        </div>
        <div className="flex items-center gap-2">
          {periods.map(({ key, label }) => (
            <Button
              key={key}
              variant={period === key ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : report ? (
        <>
          {/* KPI Cards */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {kpis.map((kpi, index) => (
              <motion.div key={kpi.label} variants={item}>
                <Card hover className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3 shadow-lg`}>
                      <kpi.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{kpi.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Top produits</h2>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {report.top_products?.length > 0 ? (
                  <div style={{ height: `${report.top_products.length * 44 + 40}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={report.top_products}
                        layout="vertical"
                        margin={{ left: 8, right: 32 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis
                          type="number"
                          tickFormatter={v => formatNumber(v)}
                          tick={{ fontSize: 10, fill: '#6b7280' }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          width={100}
                        />
                        <Tooltip
                          formatter={(v: number) => [formatCurrency(v), 'CA']}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
                    <p>Aucune donnée disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Modes de paiement</h2>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {report.by_payment_method?.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-3 mb-4">
                      {report.by_payment_method.map((d: any, i: number) => (
                        <div key={d.method} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {d.method} — {formatCurrency(d.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={report.by_payment_method}
                            dataKey="revenue"
                            nameKey="method"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ method }) => method}
                          >
                            {report.by_payment_method.map((_: any, i: number) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <DollarSign className="w-12 h-12 mb-3 opacity-30" />
                    <p>Aucune donnée disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg text-gray-500 dark:text-gray-400">
              Impossible de charger les rapports
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Vérifiez que le serveur backend est accessible
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
