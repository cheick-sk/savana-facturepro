import { User, Phone, Mail, Calendar, DollarSign, TrendingUp, MoreVertical } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Employee } from '../../store/employee'

interface EmployeeCardProps {
  employee: Employee
  onEdit?: () => void
  onDeactivate?: () => void
}

const POSITION_LABELS: Record<string, string> = {
  vendeur: 'Vendeur',
  caissier: 'Caissier',
  manager: 'Manager',
  gerant: 'Gérant',
}

const POSITION_COLORS: Record<string, string> = {
  vendeur: 'bg-blue-100 text-blue-800',
  caissier: 'bg-purple-100 text-purple-800',
  manager: 'bg-amber-100 text-amber-800',
  gerant: 'bg-emerald-100 text-emerald-800',
}

export default function EmployeeCard({ employee, onEdit, onDeactivate }: EmployeeCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
            employee.is_active ? 'bg-emerald-500' : 'bg-gray-400'
          }`}>
            {employee.first_name[0]}{employee.last_name[0]}
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">{employee.full_name}</h3>
            <p className="text-sm text-[var(--text-tertiary)]">{employee.employee_number}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${POSITION_COLORS[employee.position]}`}>
          {POSITION_LABELS[employee.position]}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        {employee.phone && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Phone size={14} />
            <span>{employee.phone}</span>
          </div>
        )}
        {employee.email && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Mail size={14} />
            <span className="truncate">{employee.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Calendar size={14} />
          <span>Embauché le {new Date(employee.hire_date).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-1">
            <DollarSign size={12} />
            Ventes totales
          </div>
          <div className="font-semibold text-[var(--text-primary)]">
            {formatCurrency(employee.total_sales)}
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-1">
            <TrendingUp size={12} />
            Commissions
          </div>
          <div className="font-semibold text-[var(--text-primary)]">
            {formatCurrency(employee.total_commission)}
          </div>
        </div>
      </div>

      {employee.assigned_stores.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Magasins assignés</p>
          <div className="flex flex-wrap gap-1">
            {employee.assigned_stores.map(store => (
              <span key={store.id} className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded text-xs text-[var(--text-secondary)]">
                {store.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-light)]">
        <Link
          to={`/employees/${employee.id}`}
          className="text-sm text-[var(--primary-600)] hover:text-[var(--primary-700)] font-medium"
        >
          Voir détails
        </Link>
        <div className="flex items-center gap-2">
          {!employee.is_active && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
              Inactif
            </span>
          )}
          {employee.commission_enabled && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
              Commission
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
