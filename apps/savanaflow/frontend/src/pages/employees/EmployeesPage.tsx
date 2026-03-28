import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, UserPlus, Users } from 'lucide-react'
import { useEmployeeStore } from '../../store/employee'
import EmployeeCard from '../../components/employees/EmployeeCard'
import toast from 'react-hot-toast'

const POSITION_FILTERS = [
  { value: '', label: 'Tous les postes' },
  { value: 'vendeur', label: 'Vendeur' },
  { value: 'caissier', label: 'Caissier' },
  { value: 'manager', label: 'Manager' },
  { value: 'gerant', label: 'Gérant' },
]

const STATUS_FILTERS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'active', label: 'Actifs' },
  { value: 'inactive', label: 'Inactifs' },
]

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const { employees, fetchEmployees, loading, deactivateEmployee, activateEmployee } = useEmployeeStore()

  useEffect(() => {
    loadEmployees()
  }, [page, positionFilter, statusFilter])

  const loadEmployees = async () => {
    try {
      const result = await fetchEmployees({
        search: search || undefined,
        position: positionFilter || undefined,
        is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        page,
        size: 12,
      })
      setTotalPages(result.pages)
    } catch (error) {
      toast.error('Erreur lors du chargement des employés')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadEmployees()
  }

  const handleDeactivate = async (employeeId: number, fullName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir désactiver ${fullName} ?`)) return
    try {
      await deactivateEmployee(employeeId)
      toast.success('Employé désactivé')
      loadEmployees()
    } catch (error) {
      toast.error('Erreur lors de la désactivation')
    }
  }

  const handleActivate = async (employeeId: number, fullName: string) => {
    try {
      await activateEmployee(employeeId)
      toast.success(`${fullName} réactivé`)
      loadEmployees()
    } catch (error) {
      toast.error('Erreur lors de la réactivation')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Employés</h1>
          <p className="text-[var(--text-secondary)]">Gérez vos employés et leurs permissions</p>
        </div>
        <Link
          to="/employees/new"
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg font-medium hover:bg-[var(--primary-700)] transition-colors"
        >
          <Plus size={18} />
          Nouvel employé
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un employé..."
              className="w-full pl-10 pr-4 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
            />
          </div>
          <select
            value={positionFilter}
            onChange={(e) => { setPositionFilter(e.target.value); setPage(1) }}
            className="px-4 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
          >
            {POSITION_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-4 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
          >
            {STATUS_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Rechercher
          </button>
        </form>
      </div>

      {/* Employee Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)]" />
                <div className="flex-1">
                  <div className="h-4 bg-[var(--bg-secondary)] rounded w-24 mb-2" />
                  <div className="h-3 bg-[var(--bg-secondary)] rounded w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-[var(--bg-secondary)] rounded w-full" />
                <div className="h-3 bg-[var(--bg-secondary)] rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-12 text-center">
          <Users className="mx-auto text-[var(--text-tertiary)] mb-4" size={48} />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Aucun employé trouvé</h3>
          <p className="text-[var(--text-secondary)] mb-4">
            {search || positionFilter || statusFilter 
              ? 'Essayez de modifier vos filtres'
              : 'Commencez par ajouter votre premier employé'}
          </p>
          <Link
            to="/employees/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg font-medium hover:bg-[var(--primary-700)] transition-colors"
          >
            <UserPlus size={18} />
            Ajouter un employé
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(employee => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onDeactivate={() => handleDeactivate(employee.id, employee.full_name)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-secondary)] disabled:opacity-50"
          >
            Précédent
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded-lg ${
                page === i + 1
                  ? 'bg-[var(--primary-600)] text-white'
                  : 'border border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-secondary)] disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}
