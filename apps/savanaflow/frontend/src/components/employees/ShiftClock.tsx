import { useState, useEffect, useCallback } from 'react'
import { Clock, LogIn, LogOut, DollarSign, Store, User } from 'lucide-react'
import { useEmployeeStore, type Employee, type ActiveShift } from '../../store/employee'
import toast from 'react-hot-toast'

interface ShiftClockProps {
  storeId?: number
  stores: { id: number; name: string }[]
  onClockIn?: () => void
  onClockOut?: () => void
}

export default function ShiftClock({ storeId, stores, onClockIn, onClockOut }: ShiftClockProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(storeId || null)
  const [openingCash, setOpeningCash] = useState<string>('')
  const [closingCash, setClosingCash] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [activeShifts, setActiveShifts] = useState<ActiveShift[]>([])

  const { fetchEmployees, fetchActiveShifts, clockIn, clockOut, loading } = useEmployeeStore()

  // Get active shift for selected employee - derived state, not useEffect
  const activeShiftForEmployee = selectedEmployeeId 
    ? activeShifts.find(s => s.employee_id === selectedEmployeeId) || null 
    : null

  const loadData = useCallback(async () => {
    try {
      const [empResult, shiftsResult] = await Promise.all([
        fetchEmployees({ is_active: true, size: 100 }),
        fetchActiveShifts(storeId),
      ])
      setEmployees(empResult.items)
      setActiveShifts(shiftsResult)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }, [fetchEmployees, fetchActiveShifts, storeId])

  // Load employees and active shifts on mount
  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [loadData])

  const handleClockIn = async () => {
    if (!selectedEmployeeId || !selectedStoreId) {
      toast.error('Veuillez sélectionner un employé et un magasin')
      return
    }

    try {
      await clockIn({
        employee_id: selectedEmployeeId,
        store_id: selectedStoreId,
        opening_cash: openingCash ? parseFloat(openingCash) : undefined,
        notes: notes || undefined,
      })
      toast.success('Pointage d\'entrée réussi')
      setOpeningCash('')
      setNotes('')
      void loadData()
      onClockIn?.()
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du pointage')
    }
  }

  const handleClockOut = async () => {
    if (!activeShiftForEmployee) {
      toast.error('Aucun shift actif trouvé')
      return
    }

    if (!closingCash) {
      toast.error('Veuillez entrer le montant de caisse de clôture')
      return
    }

    try {
      await clockOut({
        shift_record_id: activeShiftForEmployee.id,
        closing_cash: parseFloat(closingCash),
        notes: notes || undefined,
      })
      toast.success('Pointage de sortie réussi')
      setClosingCash('')
      setNotes('')
      void loadData()
      onClockOut?.()
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du pointage')
    }
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (clockIn: string) => {
    const start = new Date(clockIn)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}min`
  }

  return (
    <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="text-[var(--primary-600)]" size={20} />
        <h3 className="font-semibold text-[var(--text-primary)]">Pointage</h3>
      </div>

      {/* Employee Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          Employé
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={16} />
          <select
            value={selectedEmployeeId || ''}
            onChange={(e) => setSelectedEmployeeId(Number(e.target.value) || null)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
          >
            <option value="">Sélectionner un employé</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} ({emp.employee_number})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Store Selection (if not provided) */}
      {!storeId && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Magasin
          </label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={16} />
            <select
              value={selectedStoreId || ''}
              onChange={(e) => setSelectedStoreId(Number(e.target.value) || null)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
            >
              <option value="">Sélectionner un magasin</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Active Shift Display */}
      {activeShiftForEmployee && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-800">Shift actif</span>
            <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-xs font-medium">
              En cours
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-emerald-700">
            <div>Entrée: {formatTime(activeShiftForEmployee.clock_in)}</div>
            <div>Durée: {formatDuration(activeShiftForEmployee.clock_in)}</div>
            <div>Ventes: {activeShiftForEmployee.sales_count}</div>
            <div>Total: {activeShiftForEmployee.sales_total.toLocaleString()} GNF</div>
          </div>
        </div>
      )}

      {/* Cash Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          {activeShiftForEmployee ? 'Caisse de clôture' : 'Caisse d\'ouverture'}
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={16} />
          <input
            type="number"
            value={activeShiftForEmployee ? closingCash : openingCash}
            onChange={(e) => activeShiftForEmployee ? setClosingCash(e.target.value) : setOpeningCash(e.target.value)}
            placeholder="Montant en GNF"
            className="w-full pl-10 pr-4 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          Notes (optionnel)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Remarques..."
          rows={2}
          className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!activeShiftForEmployee ? (
          <button
            onClick={handleClockIn}
            disabled={loading || !selectedEmployeeId || !selectedStoreId}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <LogIn size={18} />
            Pointer l'entrée
          </button>
        ) : (
          <button
            onClick={handleClockOut}
            disabled={loading || !closingCash}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <LogOut size={18} />
            Pointer la sortie
          </button>
        )}
      </div>

      {/* Active Shifts Summary */}
      {activeShifts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border-light)]">
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
            Shifts actifs ({activeShifts.length})
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {activeShifts.map(shift => (
              <div key={shift.id} className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-medium">
                    {shift.employee?.first_name?.[0]}{shift.employee?.last_name?.[0]}
                  </div>
                  <span className="text-[var(--text-primary)]">{shift.employee?.full_name}</span>
                </div>
                <span className="text-[var(--text-tertiary)]">{formatTime(shift.clock_in)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
