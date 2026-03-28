import { Clock, Store, DollarSign, ShoppingCart, RotateCcw, TrendingUp } from 'lucide-react'
import type { ActiveShift, ShiftRecord } from '../../store/employee'

interface ActiveShiftProps {
  shift: ActiveShift | ShiftRecord
  showDetails?: boolean
}

export default function ActiveShiftDisplay({ shift, showDetails = true }: ActiveShiftProps) {
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })
  }

  const formatDuration = (clockIn: string, clockOut?: string | null) => {
    const start = new Date(clockIn)
    const end = clockOut ? new Date(clockOut) : new Date()
    const diff = end.getTime() - start.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}min`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      minimumFractionDigits: 0,
    }).format(amount) + ' GNF'
  }

  const isActive = !('clock_out' in shift) || !shift.clock_out
  const shiftData = shift as ShiftRecord

  return (
    <div className={`rounded-xl border p-4 ${
      isActive 
        ? 'bg-emerald-50 border-emerald-200' 
        : 'bg-[var(--bg-primary)] border-[var(--border-light)]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isActive ? 'bg-emerald-500' : 'bg-gray-400'
          } text-white font-semibold`}>
            {shift.employee?.first_name?.[0] || '?'}{shift.employee?.last_name?.[0] || '?'}
          </div>
          <div>
            <h4 className="font-semibold text-[var(--text-primary)]">
              {shift.employee?.full_name || 'Employé inconnu'}
            </h4>
            <p className="text-xs text-[var(--text-tertiary)]">
              {shift.employee?.employee_number}
            </p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          isActive 
            ? 'bg-emerald-500 text-white' 
            : 'bg-gray-200 text-gray-700'
        }`}>
          {isActive ? 'En cours' : 'Terminé'}
        </span>
      </div>

      {/* Store & Time */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Store size={14} className="text-[var(--text-tertiary)]" />
          <span className="text-[var(--text-secondary)]">
            {shift.store?.name || 'Magasin inconnu'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock size={14} className="text-[var(--text-tertiary)]" />
          <span className="text-[var(--text-secondary)]">
            {formatDate(shift.clock_in)} à {formatTime(shift.clock_in)}
          </span>
        </div>
      </div>

      {/* Duration */}
      <div className="mb-4 p-2 bg-[var(--bg-primary)] rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">Durée</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {formatDuration(shift.clock_in, 'clock_out' in shift ? shift.clock_out : null)}
          </span>
        </div>
      </div>

      {/* Stats */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--bg-primary)] rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-1">
              <ShoppingCart size={12} />
              Ventes
            </div>
            <div className="font-semibold text-[var(--text-primary)]">
              {shift.sales_count}
            </div>
          </div>
          <div className="bg-[var(--bg-primary)] rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-1">
              <DollarSign size={12} />
              Total ventes
            </div>
            <div className="font-semibold text-[var(--text-primary)]">
              {formatCurrency(shift.sales_total)}
            </div>
          </div>
          
          {'refunds_count' in shift && shift.refunds_count > 0 && (
            <>
              <div className="bg-[var(--bg-primary)] rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-1">
                  <RotateCcw size={12} />
                  Retours
                </div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {shift.refunds_count}
                </div>
              </div>
              <div className="bg-[var(--bg-primary)] rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-1">
                  <TrendingUp size={12} />
                  Commission
                </div>
                <div className="font-semibold text-emerald-600">
                  {formatCurrency(shift.commission_earned)}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Cash Details */}
      {showDetails && shift.opening_cash !== null && (
        <div className="mt-4 pt-4 border-t border-[var(--border-light)]">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[var(--text-tertiary)]">Caisse ouverture:</span>
              <p className="font-medium text-[var(--text-primary)]">
                {formatCurrency(shift.opening_cash)}
              </p>
            </div>
            {'closing_cash' in shift && shift.closing_cash !== null && (
              <div>
                <span className="text-[var(--text-tertiary)]">Caisse fermeture:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {formatCurrency(shift.closing_cash)}
                </p>
              </div>
            )}
          </div>
          {'cash_difference' in shift && shift.cash_difference !== 0 && (
            <div className={`mt-2 text-sm font-medium ${
              shift.cash_difference > 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              Différence: {shift.cash_difference > 0 ? '+' : ''}{formatCurrency(shift.cash_difference)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
