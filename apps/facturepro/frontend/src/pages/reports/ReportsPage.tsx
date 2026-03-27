import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

interface ReportData {
  period: string;
  invoices_total: number;
  invoices_count: number;
  expenses_total: number;
  expenses_count: number;
  payments_total: number;
  payments_count: number;
  overdue_total: number;
  overdue_count: number;
  by_currency: { [currency: string]: number };
  by_customer: { name: string; amount: number; count: number }[];
  by_product: { name: string; quantity: number; amount: number }[];
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'overview' | 'vat' | 'revenue' | 'customers'>('overview');
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    fetchReport();
  }, [reportType, period, year, month]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = { period, year };
      if (period === 'month') params.month = month;
      
      const response = await api.get(`/reports/${reportType}`, { params });
      setReportData(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement du rapport');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    try {
      const response = await api.get(`/reports/${reportType}/export`, {
        params: { period, year, month, format: 'pdf' },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_${reportType}_${year}${period === 'month' ? `_${month}` : ''}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'XOF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ' + currency;
  };

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
          <p className="text-gray-600">Analysez vos performances financières</p>
        </div>
        <button
          onClick={exportPDF}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exporter PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type de rapport</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="overview">Vue d'ensemble</option>
            <option value="vat">TVA</option>
            <option value="revenue">Revenus</option>
            <option value="customers">Clients</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="month">Mensuel</option>
            <option value="quarter">Trimestriel</option>
            <option value="year">Annuel</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2023, 2022, 2021].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {period === 'month' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {months.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Chargement...
        </div>
      ) : !reportData ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Aucune donnée disponible pour cette période
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Chiffre d'affaires</div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(reportData.invoices_total)}</div>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">{reportData.invoices_count} factures</div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Dépenses</div>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(reportData.expenses_total)}</div>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">{reportData.expenses_count} dépenses</div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Encaissements</div>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(reportData.payments_total)}</div>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">{reportData.payments_count} paiements</div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Impayés</div>
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(reportData.overdue_total)}</div>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">{reportData.overdue_count} factures en retard</div>
            </div>
          </div>

          {/* Benefice */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-lg shadow text-white">
            <div className="text-sm opacity-80">Résultat net</div>
            <div className="text-3xl font-bold">
              {formatCurrency(reportData.invoices_total - reportData.expenses_total)}
            </div>
            <div className="text-sm opacity-80 mt-1">
              Marge: {reportData.invoices_total > 0 ? ((reportData.invoices_total - reportData.expenses_total) / reportData.invoices_total * 100).toFixed(1) : 0}%
            </div>
          </div>

          {/* Top Customers */}
          {reportData.by_customer && reportData.by_customer.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="font-semibold text-gray-900">Top Clients</h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Factures</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.by_customer.slice(0, 10).map((customer, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{customer.name}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{customer.count}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(customer.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top Products */}
          {reportData.by_product && reportData.by_product.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="font-semibold text-gray-900">Produits les plus vendus</h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.by_product.slice(0, 10).map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{product.quantity}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(product.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
