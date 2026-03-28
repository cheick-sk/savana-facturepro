import { useState, useEffect } from 'react'
import { DollarSign, Calendar, Users, Download, Filter } from 'lucide-react'
import { useEmployeeStore } from '../../store/employee'
import CommissionTable from '../../components/employees/CommissionTable'
import toast from 'react-hot-toast'

export default function CommissionPage() {
  const [activeView, setActiveView] = useState<'unpaid' | 'all' | 'report'>('unpaid')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [employees, setEmployees] = useState<any[]>([])
  const [commissions, setCommissions] = useState<any[]>(null)
  const [report, setReport] = useState<any[]>([])

  const { 
    fetchUnpaidCommissions, 
    fetchCommissionReport, 
    payCommissions, 
    fetchCommissions,
    loading 
  } = useEmployeeStore()

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    loadData()
  }, [activeView, selectedEmployeeId])

  const loadEmployees = async () => {
    try {
      const { data } = await fetch('/api/v1/employees?is_active=true&size=100', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }).then(res => res.json())
      setEmployees(data?.items || [])
    } catch (error) {
      console.error('Failed to load employees:', error)
    }
  }

  const loadData = async () => {
    if (activeView === 'unpaid') {
      await loadUnpaid()
    } else if (activeView === 'report') {
      await loadReport()
    }
  }

  const loadUnpaid = async () => {
    try {
      const data = await fetchUnpaidCommissions(selectedEmployeeId || undefined)
      setCommissions(data)
    } catch (error) {
      toast.error('Erreur lors du chargement')
    }
  }

  const loadReport = async () => {
    try {
      const data = await fetchCommissionReport({
        employee_id: selectedEmployeeId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      })
      setReport(data)
    } catch (error) {
      toast.error('Erreur lors du chargement du rapport')
    }
  }

  const handlePay = async (commissionIds: number[]) => {
    try {
      const result = await payCommissions(commissionIds)
      toast.success(result.message)
      loadUnpaid()
    } catch (error) {
      toast.error('Erreur lors du paiement')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      minimumFractionDigits: 0,
    }).format(amount) + ' GNF'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Commissions</h1>
          <p className="text-[var(--text-secondary)]">Gérez les commissions des employés</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-light)]">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveView('unpaid')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeView === 'unpaid'
                ? 'border-[var(--primary-600)] text-[var(--primary-600)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Non payées
          </button>
          <button
            onClick={() => setActiveView('all')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeView === 'all'
                ? 'border-[var(--primary-600)] text-[var(--primary-600)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setActiveView('report')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeView === 'report'
                ? 'border-[var(--primary-600)] text-[var(--primary-600)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Rapport
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Employé</label>
            <select
              value={selectedEmployeeId || ''}
              onChange={(e) => setSelectedEmployeeId(Number(e.target.value) || null)}
              className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)]"
            >
              <option value="">Tous les employés</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>
          {(activeView === 'report' || activeView === 'all') && (
            <>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">Date début</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">Date fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                />
              </div>
            </>
          )}
          <div className="flex items-end">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg font-medium hover:bg-[var(--primary-700)] transition-colors"
            >
              Filtrer
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeView === 'unpaid' && (
        <CommissionTable
          commissions={commissions || []}
          selectable={true}
          onPay={handlePay}
        />
      )}

      {activeView === 'all' && selectedEmployeeId && (
        <CommissionTable
          commissions={commissions?.items || []}
          selectable={false}
        />
      )}

      {activeView === 'all' && !selectedEmployeeId && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-8 text-center">
          <Users className="mx-auto text-[var(--text-tertiary)] mb-2" size={32} />
          <p className="text-[var(--text-tertiary)]">Sélectionnez un employé pour voir ses commissions</p>
        </div>
      )}

      {activeView === 'report' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-2">
                <DollarSign size={16} />
                <span className="text-sm">Total commissions</span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatCurrency(report.reduce((sum, r) => sum + r.total_commission, 0))}
              </p>
            </div>
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <DollarSign size={16} />
                <span className="text-sm">Non payées</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">
                {formatCurrency(report.reduce((sum, r) => sum + r.unpaid_commission, 0))}
              </p>
            </div>
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <DollarSign size={16} />
                <span className="text-sm">Payées</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">
                {formatCurrency(report.reduce((sum, r) => sum + r.paid_commission, 0))}
              </p>
            </div>
          </div>

          {/* Report Table */}
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">Employé</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase">Payé</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase">Non payé</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase">Ventes</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase">Nb. Commissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)]">
                {report.map((row, index) => (
                  <tr key={index} className="hover:bg-[var(--bg-secondary)]">
                    <td className="px-4 py-3 text-[var(--text-primary)] font-medium">{row.employee_name}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-primary)]">{formatCurrency(row.total_commission)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(row.paid_commission)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(row.unpaid_commission)}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{formatCurrency(row.sales_total)}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{row.commission_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {report.length === 0 && (
              <div className="px-4 py-8 text-center">
                <DollarSign className="mx-auto text-[var(--text-tertiary)] mb-2" size={32} />
                <p className="text-[var(--text-tertiary)]">Aucune donnée de commission</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
