import { useState } from 'react'
import { DollarSign, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import type { EmployeeCommission } from '../../store/employee'

interface CommissionTableProps {
  commissions: EmployeeCommission[]
  onPay?: (commissionIds: number[]) => void
  selectable?: boolean
}

export default function CommissionTable({ commissions, onPay, selectable = false }: CommissionTableProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [sortField, setSortField] = useState<'created_at' | 'commission_amount' | 'sale_amount'>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      minimumFractionDigits: 0,
    }).format(amount) + ' GNF'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedCommissions = [...commissions].sort((a, b) => {
    let comparison = 0
    if (sortField === 'created_at') {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    } else {
      comparison = a[sortField] - b[sortField]
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    const unpaidIds = commissions.filter(c => !c.is_paid).map(c => c.id)
    if (selectedIds.length === unpaidIds.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(unpaidIds)
    }
  }

  const totalSelected = selectedIds.reduce((sum, id) => {
    const commission = commissions.find(c => c.id === id)
    return sum + (commission?.commission_amount || 0)
  }, 0)

  const unpaidCommissions = commissions.filter(c => !c.is_paid)
  const paidCommissions = commissions.filter(c => c.is_paid)

  return (
    <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-light)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="text-[var(--primary-600)]" size={20} />
          <h3 className="font-semibold text-[var(--text-primary)]">Commissions</h3>
        </div>
        {selectable && selectedIds.length > 0 && onPay && (
          <button
            onClick={() => onPay(selectedIds)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            <CheckCircle size={16} />
            Payer ({formatCurrency(totalSelected)})
          </button>
        )}
      </div>

      {/* Select All */}
      {selectable && unpaidCommissions.length > 0 && (
        <div className="px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-light)]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.length === unpaidCommissions.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-[var(--border-light)] text-[var(--primary-600)] focus:ring-[var(--primary-500)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              Tout sélectionner ({unpaidCommissions.length} non payées)
            </span>
          </label>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg-secondary)]">
              {selectable && <th className="w-10 px-4 py-2"></th>}
              <th 
                className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase cursor-pointer hover:text-[var(--text-secondary)]"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Date
                  {sortField === 'created_at' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">
                Employé
              </th>
              <th 
                className="px-4 py-2 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase cursor-pointer hover:text-[var(--text-secondary)]"
                onClick={() => handleSort('sale_amount')}
              >
                <div className="flex items-center justify-end gap-1">
                  Montant vente
                  {sortField === 'sale_amount' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase">
                Taux
              </th>
              <th 
                className="px-4 py-2 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase cursor-pointer hover:text-[var(--text-secondary)]"
                onClick={() => handleSort('commission_amount')}
              >
                <div className="flex items-center justify-end gap-1">
                  Commission
                  {sortField === 'commission_amount' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
            {sortedCommissions.map(commission => (
              <tr 
                key={commission.id} 
                className={`hover:bg-[var(--bg-secondary)] ${
                  selectedIds.includes(commission.id) ? 'bg-emerald-50' : ''
                }`}
              >
                {selectable && (
                  <td className="px-4 py-3">
                    {!commission.is_paid && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(commission.id)}
                        onChange={() => toggleSelect(commission.id)}
                        className="w-4 h-4 rounded border-[var(--border-light)] text-[var(--primary-600)] focus:ring-[var(--primary-500)]"
                      />
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {formatDate(commission.created_at)}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                  {commission.employee?.full_name || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)] text-right">
                  {formatCurrency(commission.sale_amount)}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)] text-right">
                  {commission.commission_rate === 100 
                    ? 'Fixe' 
                    : `${commission.commission_rate}%`
                  }
                </td>
                <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)] text-right">
                  {formatCurrency(commission.commission_amount)}
                </td>
                <td className="px-4 py-3 text-center">
                  {commission.is_paid ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      <CheckCircle size={12} />
                      Payée
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                      <Clock size={12} />
                      En attente
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-light)]">
        <div className="flex justify-between text-sm">
          <div>
            <span className="text-[var(--text-tertiary)]">Total non payé: </span>
            <span className="font-medium text-amber-600">
              {formatCurrency(unpaidCommissions.reduce((sum, c) => sum + c.commission_amount, 0))}
            </span>
            <span className="text-[var(--text-tertiary)]"> ({unpaidCommissions.length})</span>
          </div>
          <div>
            <span className="text-[var(--text-tertiary)]">Total payé: </span>
            <span className="font-medium text-emerald-600">
              {formatCurrency(paidCommissions.reduce((sum, c) => sum + c.commission_amount, 0))}
            </span>
            <span className="text-[var(--text-tertiary)]"> ({paidCommissions.length})</span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {commissions.length === 0 && (
        <div className="px-4 py-8 text-center">
          <DollarSign className="mx-auto text-[var(--text-tertiary)] mb-2" size={32} />
          <p className="text-[var(--text-tertiary)]">Aucune commission trouvée</p>
        </div>
      )}
    </div>
  )
}
