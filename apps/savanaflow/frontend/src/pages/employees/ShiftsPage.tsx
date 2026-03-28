import { useState, useEffect } from 'react'
import { Clock, Calendar, Store, User, Download } from 'lucide-react'
import { useEmployeeStore } from '../../store/employee'
import ShiftClock from '../../components/employees/ShiftClock'
import ActiveShiftDisplay from '../../components/employees/ActiveShift'
import toast from 'react-hot-toast'

export default function ShiftsPage() {
  const [activeView, setActiveView] = useState<'clock' | 'history'>('clock')
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [page, setPage] = useState(1)
  const [stores, setStores] = useState<{ id: number; name: string }[]>([])
  const [shiftHistory, setShiftHistory] = useState<any>(null)

  const { fetchActiveShifts, fetchShiftHistory, activeShifts, loading } = useEmployeeStore()

  useEffect(() => {
    loadStores()
    loadActiveShifts()
  }, [])

  useEffect(() => {
    if (activeView === 'history') {
      loadHistory()
    }
  }, [activeView, page, selectedStoreId, selectedEmployeeId, startDate, endDate])

  const loadStores = async () => {
    try {
      const { data } = await fetch('/api/v1/stores', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }).then(res => res.json())
      setStores(data?.items || data || [])
      if (data?.items?.length > 0) {
        setSelectedStoreId(data.items[0].id)
      }
    } catch (error) {
      console.error('Failed to load stores:', error)
    }
  }

  const loadActiveShifts = async () => {
    try {
      await fetchActiveShifts(selectedStoreId || undefined)
    } catch (error) {
      console.error('Failed to load active shifts:', error)
    }
  }

  const loadHistory = async () => {
    try {
      const result = await fetchShiftHistory({
        store_id: selectedStoreId || undefined,
        employee_id: selectedEmployeeId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        size: 10,
      })
      setShiftHistory(result)
    } catch (error) {
      toast.error('Erreur lors du chargement de l\'historique')
    }
  }

  const formatDuration = (clockIn: string, clockOut?: string | null) => {
    const start = new Date(clockIn)
    const end = clockOut ? new Date(clockOut) : new Date()
    const diff = end.getTime() - start.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}min`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gestion des Shifts</h1>
          <p className="text-[var(--text-secondary)]">Pointage et suivi des shifts employés</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-light)]">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveView('clock')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeView === 'clock'
                ? 'border-[var(--primary-600)] text-[var(--primary-600)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Pointage
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeView === 'history'
                ? 'border-[var(--primary-600)] text-[var(--primary-600)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Historique
          </button>
        </div>
      </div>

      {activeView === 'clock' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clock In/Out Panel */}
          <div className="lg:col-span-1">
            <ShiftClock
              storeId={selectedStoreId || undefined}
              stores={stores}
              onClockIn={loadActiveShifts}
              onClockOut={loadActiveShifts}
            />
          </div>

          {/* Active Shifts */}
          <div className="lg:col-span-2">
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Clock className="text-[var(--primary-600)]" size={20} />
                  Shifts actifs ({activeShifts.length})
                </h3>
                <select
                  value={selectedStoreId || ''}
                  onChange={(e) => setSelectedStoreId(Number(e.target.value) || null)}
                  className="px-3 py-1.5 text-sm border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                >
                  <option value="">Tous les magasins</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              {activeShifts.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto text-[var(--text-tertiary)] mb-2" size={32} />
                  <p className="text-[var(--text-tertiary)]">Aucun shift actif</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeShifts.map(shift => (
                    <ActiveShiftDisplay key={shift.id} shift={shift} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeView === 'history' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">Magasin</label>
                <select
                  value={selectedStoreId || ''}
                  onChange={(e) => { setSelectedStoreId(Number(e.target.value) || null); setPage(1) }}
                  className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                >
                  <option value="">Tous les magasins</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">Date début</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">Date fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadHistory}
                  className="w-full px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg font-medium hover:bg-[var(--primary-700)] transition-colors"
                >
                  Rechercher
                </button>
              </div>
            </div>
          </div>

          {/* History List */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4 animate-pulse">
                  <div className="h-4 bg-[var(--bg-secondary)] rounded w-1/3 mb-2" />
                  <div className="h-3 bg-[var(--bg-secondary)] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : shiftHistory?.items?.length > 0 ? (
            <div className="space-y-3">
              {shiftHistory.items.map((shift: any) => (
                <ActiveShiftDisplay key={shift.id} shift={shift} />
              ))}
            </div>
          ) : (
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-8 text-center">
              <Calendar className="mx-auto text-[var(--text-tertiary)] mb-2" size={32} />
              <p className="text-[var(--text-tertiary)]">Aucun shift trouvé</p>
            </div>
          )}

          {/* Pagination */}
          {shiftHistory?.pages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-secondary)] disabled:opacity-50"
              >
                Précédent
              </button>
              <span className="px-3 py-1 text-[var(--text-secondary)]">
                Page {page} sur {shiftHistory.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(shiftHistory.pages, p + 1))}
                disabled={page === shiftHistory.pages}
                className="px-3 py-1 rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-secondary)] disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
