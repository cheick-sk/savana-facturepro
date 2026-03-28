/**
 * AI Insights Dashboard Component
 *
 * Displays AI-generated business insights and recommendations
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle,
  Lightbulb, Package, Users, DollarSign,
  RefreshCw, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { api } from '../../lib/api';

interface TopProduct {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: number;
  percentage_of_total: number;
}

interface SalesInsight {
  type: string;
  title: string;
  description: string;
  priority: string;
  value?: number;
  change_percent?: number;
  recommendation?: string;
}

interface DashboardInsights {
  total_revenue: number;
  revenue_change: number;
  total_sales: number;
  sales_change: number;
  average_order_value: number;
  top_products: TopProduct[];
  low_stock_count: number;
  insights: SalesInsight[];
}

export function InsightsDashboard() {
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<DashboardInsights>(`/insights/sales?days=${days}`);
      setInsights(response.data);
    } catch (err: any) {
      console.error('Failed to fetch insights:', err);
      setError(err.response?.data?.detail || 'Erreur lors du chargement des insights');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Insights Business</h2>
          <p className="text-gray-500 mt-1">
            Recommandations IA pour optimiser votre activité
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
            <option value={60}>60 derniers jours</option>
            <option value={90}>90 derniers jours</option>
          </select>
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : insights && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard
              title="Chiffre d'affaires"
              value={insights.total_revenue}
              change={insights.revenue_change}
              icon={<DollarSign className="w-6 h-6" />}
              format="currency"
            />
            <KPICard
              title="Ventes"
              value={insights.total_sales}
              change={insights.sales_change}
              icon={<Package className="w-6 h-6" />}
            />
            <KPICard
              title="Panier moyen"
              value={insights.average_order_value}
              icon={<TrendingUp className="w-6 h-6" />}
              format="currency"
            />
            <KPICard
              title="Stock bas"
              value={insights.low_stock_count}
              icon={<AlertTriangle className="w-6 h-6" />}
              alert={insights.low_stock_count > 5}
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Insights List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <Lightbulb className="w-5 h-5 inline mr-2 text-yellow-500" />
                Recommandations IA
              </h3>

              {insights.insights.length > 0 ? (
                <div className="space-y-4">
                  {insights.insights.map((insight, idx) => (
                    <InsightCard key={idx} insight={insight} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Aucune recommandation disponible
                </div>
              )}
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <Package className="w-5 h-5 inline mr-2 text-emerald-500" />
                Top Produits
              </h3>

              {insights.top_products.length > 0 ? (
                <div className="space-y-3">
                  {insights.top_products.map((product, idx) => (
                    <div
                      key={product.product_id}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{product.product_name}</p>
                        <p className="text-sm text-gray-500">
                          {product.quantity_sold.toLocaleString('fr-FR')} vendus
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {product.revenue.toLocaleString('fr-FR')} GNF
                        </p>
                        <p className="text-sm text-emerald-600">
                          {product.percentage_of_total.toFixed(1)}% du CA
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Aucune donnée de vente disponible
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KPICard({
  title,
  value,
  change,
  icon,
  format,
  alert,
}: {
  title: string;
  value: number;
  change?: number;
  icon: React.ReactNode;
  format?: 'currency';
  alert?: boolean;
}) {
  const formatValue = () => {
    if (format === 'currency') {
      return `${value.toLocaleString('fr-FR')} GNF`;
    }
    return value.toLocaleString('fr-FR');
  };

  return (
    <div className={`p-5 rounded-xl border ${alert ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'} shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`${alert ? 'text-red-500' : 'text-emerald-600'}`}>
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <span className={`text-2xl font-bold ${alert ? 'text-red-700' : 'text-gray-900'}`}>
          {formatValue()}
        </span>
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-sm ${
          change >= 0 ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {change >= 0 ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          <span>{Math.abs(change).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: SalesInsight }) {
  const priorityColors = {
    critical: 'border-l-red-500 bg-red-50',
    high: 'border-l-orange-500 bg-orange-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
    low: 'border-l-green-500 bg-green-50',
  };

  const iconMap: Record<string, React.ReactNode> = {
    sales_trend: <TrendingUp className="w-5 h-5" />,
    low_stock: <AlertTriangle className="w-5 h-5" />,
    top_product: <Package className="w-5 h-5" />,
    customer_insight: <Users className="w-5 h-5" />,
  };

  return (
    <div className={`p-4 rounded-lg border-l-4 ${priorityColors[insight.priority as keyof typeof priorityColors] || priorityColors.low}`}>
      <div className="flex items-start gap-3">
        <div className="text-gray-600">
          {iconMap[insight.type] || <Lightbulb className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{insight.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
          {insight.recommendation && (
            <p className="text-sm text-emerald-700 mt-2 font-medium">
              💡 {insight.recommendation}
            </p>
          )}
        </div>
        {insight.change_percent !== undefined && (
          <span className={`text-sm font-medium ${
            insight.change_percent >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {insight.change_percent >= 0 ? '+' : ''}{insight.change_percent.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default InsightsDashboard;
