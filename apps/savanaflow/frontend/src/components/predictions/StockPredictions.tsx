/**
 * Stock Predictions Dashboard Component
 *
 * Displays AI-powered stock predictions and reorder recommendations
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  Package, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../../lib/api';

interface PredictionItem {
  product_id: number;
  product_name: string;
  sku: string | null;
  barcode: string | null;
  category_name: string | null;
  current_stock: number;
  predicted_demand: number;
  days_of_stock: number;
  reorder_point: number;
  safety_stock: number;
  suggested_order_quantity: number;
  confidence: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  trend_percentage: number;
  avg_daily_sales: number;
  sales_velocity: number;
}

interface PredictionSummary {
  total_products: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_to_order: number;
}

interface PredictionResponse {
  summary: PredictionSummary;
  predictions: PredictionItem[];
  generated_at: string;
}

export function StockPredictions() {
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [summary, setSummary] = useState<PredictionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [sortField, setSortField] = useState<keyof PredictionItem>('urgency');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('urgency', filter);
      }

      const response = await api.get<PredictionResponse>(`/predictions/stock?${params.toString()}`);
      setPredictions(response.data.predictions);
      setSummary(response.data.summary);
    } catch (err: any) {
      console.error('Failed to fetch predictions:', err);
      setError(err.response?.data?.detail || 'Erreur lors du chargement des prédictions');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const handleSort = (field: keyof PredictionItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedPredictions = [...predictions].sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    if (sortField === 'urgency') {
      const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      return sortAsc ? diff : -diff;
    }

    const aVal = a[sortField];
    const bVal = b[sortField];

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Prédictions de Stock</h2>
          <p className="text-gray-500 mt-1">
            Analyse IA des besoins de réapprovisionnement
          </p>
        </div>
        <button
          onClick={fetchPredictions}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard
            label="Critique"
            value={summary.critical_count}
            color="red"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          <SummaryCard
            label="Haute priorité"
            value={summary.high_count}
            color="orange"
          />
          <SummaryCard
            label="Moyenne priorité"
            value={summary.medium_count}
            color="yellow"
          />
          <SummaryCard
            label="Stock OK"
            value={summary.low_count}
            color="green"
          />
          <SummaryCard
            label="À commander"
            value={Math.round(summary.total_to_order)}
            color="blue"
            suffix="unités"
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === f
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {f === 'all' ? 'Tous' : f === 'critical' ? 'Critique' : f === 'high' ? 'Haute' : f === 'medium' ? 'Moyenne' : 'Basse'}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Predictions Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('product_name')}
                  >
                    Produit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Catégorie
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('current_stock')}
                  >
                    Stock actuel
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('days_of_stock')}
                  >
                    Jours de stock
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('predicted_demand')}
                  >
                    Demande prévue
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Tendance
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('suggested_order_quantity')}
                  >
                    À commander
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('urgency')}
                  >
                    Priorité
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Confiance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedPredictions.map((prediction) => (
                  <tr key={prediction.product_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{prediction.product_name}</p>
                        {prediction.sku && (
                          <p className="text-xs text-gray-500">SKU: {prediction.sku}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {prediction.category_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${
                        prediction.current_stock <= prediction.safety_stock
                          ? 'text-red-600'
                          : prediction.current_stock <= prediction.reorder_point
                            ? 'text-orange-600'
                            : 'text-gray-900'
                      }`}>
                        {prediction.current_stock.toLocaleString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${
                        prediction.days_of_stock < 7
                          ? 'text-red-600'
                          : prediction.days_of_stock < 14
                            ? 'text-orange-600'
                            : 'text-gray-900'
                      }`}>
                        {prediction.days_of_stock.toFixed(1)} jours
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {prediction.predicted_demand.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TrendIndicator trend={prediction.trend} percentage={prediction.trend_percentage} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {prediction.suggested_order_quantity > 0 ? (
                        <span className="font-medium text-emerald-600">
                          {prediction.suggested_order_quantity.toLocaleString('fr-FR')}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <UrgencyBadge urgency={prediction.urgency} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              prediction.confidence >= 0.8
                                ? 'bg-emerald-500'
                                : prediction.confidence >= 0.5
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${prediction.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round(prediction.confidence * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {predictions.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune prédiction disponible</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  icon,
  suffix,
}: {
  label: string;
  value: number;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'blue';
  icon?: React.ReactNode;
  suffix?: string;
}) {
  const colorClasses = {
    red: 'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold mt-1">
        {value.toLocaleString('fr-FR')}
        {suffix && <span className="text-sm font-normal ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

function TrendIndicator({ trend, percentage }: { trend: string; percentage: number }) {
  if (trend === 'increasing') {
    return (
      <div className="flex items-center gap-1 text-emerald-600">
        <TrendingUp className="w-4 h-4" />
        <span className="text-xs font-medium">+{percentage.toFixed(1)}%</span>
      </div>
    );
  }

  if (trend === 'decreasing') {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingDown className="w-4 h-4" />
        <span className="text-xs font-medium">{percentage.toFixed(1)}%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-gray-400">
      <Minus className="w-4 h-4" />
      <span className="text-xs">Stable</span>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const config = {
    critical: { label: 'Critique', class: 'bg-red-100 text-red-700' },
    high: { label: 'Haute', class: 'bg-orange-100 text-orange-700' },
    medium: { label: 'Moyenne', class: 'bg-yellow-100 text-yellow-700' },
    low: { label: 'Basse', class: 'bg-green-100 text-green-700' },
  };

  const { label, class: className } = config[urgency as keyof typeof config] || config.low;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export default StockPredictions;
