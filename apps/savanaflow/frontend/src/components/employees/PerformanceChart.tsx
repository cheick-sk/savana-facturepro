import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Clock, ShoppingBag, DollarSign } from 'lucide-react'
import type { EmployeePerformance } from '../../store/employee'

interface PerformanceChartProps {
  performance: EmployeePerformance
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function PerformanceChart({ performance }: PerformanceChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Process data for charts
  const salesByHourData = useMemo(() => {
    return performance.sales_by_hour.map(item => ({
      hour: `${item.hour}h`,
      ventes: item.count,
      total: item.total,
    }))
  }, [performance.sales_by_hour])

  const salesByDayData = useMemo(() => {
    return performance.sales_by_day.slice(-14).map(item => ({
      date: new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      ventes: item.count,
      total: item.total,
    }))
  }, [performance.sales_by_day])

  const topProductsData = useMemo(() => {
    return performance.top_products.slice(0, 5).map(item => ({
      name: item.product_name.length > 20 ? item.product_name.slice(0, 20) + '...' : item.product_name,
      quantite: item.quantity_sold,
      total: item.total_sales,
    }))
  }, [performance.top_products])

  const summaryStats = useMemo(() => [
    { 
      label: 'Ventes totales', 
      value: performance.sales_count, 
      icon: ShoppingBag, 
      color: 'text-blue-600 bg-blue-100' 
    },
    { 
      label: 'Chiffre d\'affaires', 
      value: formatCurrency(performance.sales_total), 
      icon: DollarSign, 
      color: 'text-emerald-600 bg-emerald-100' 
    },
    { 
      label: 'Heures travaillées', 
      value: `${performance.hours_worked.toFixed(1)}h`, 
      icon: Clock, 
      color: 'text-amber-600 bg-amber-100' 
    },
    { 
      label: 'Panier moyen', 
      value: formatCurrency(performance.avg_sale_value), 
      icon: TrendingUp, 
      color: 'text-purple-600 bg-purple-100' 
    },
  ], [performance])

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat, index) => (
          <div key={index} className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">{stat.label}</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Day */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Ventes par jour</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesByDayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  tickLine={false}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'total' ? formatCurrency(value) : value,
                    name === 'total' ? 'Total' : 'Ventes'
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Hour */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Ventes par heure</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByHourData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'ventes' ? value : formatCurrency(value),
                    name === 'ventes' ? 'Nombre de ventes' : 'Total'
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="ventes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4 lg:col-span-2">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Top produits vendus</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProductsData}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {topProductsData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {performance.top_products.slice(0, 5).map((product, index) => (
                <div key={product.product_id} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">{product.product_name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {product.quantity_sold} vendus • {formatCurrency(product.total_sales)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Refunds */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Retours et remboursements</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600 mb-1">Nombre de retours</p>
              <p className="text-2xl font-bold text-red-700">{performance.refunds_count}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600 mb-1">Montant retours</p>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(performance.refunds_total)}</p>
            </div>
          </div>
          {performance.sales_count > 0 && (
            <div className="mt-4 text-sm text-[var(--text-secondary)]">
              Taux de retour: {((performance.refunds_count / performance.sales_count) * 100).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Commissions */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Commissions gagnées</h3>
          <div className="p-4 bg-emerald-50 rounded-lg text-center">
            <p className="text-xs text-emerald-600 mb-1">Total commissions</p>
            <p className="text-3xl font-bold text-emerald-700">{formatCurrency(performance.commission_earned)}</p>
          </div>
          {performance.sales_total > 0 && (
            <div className="mt-4 text-sm text-[var(--text-secondary)] text-center">
              {(performance.commission_earned / performance.sales_total * 100).toFixed(1)}% du chiffre d'affaires
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
