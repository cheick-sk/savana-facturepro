import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit, User, Phone, Mail, Calendar, Store, DollarSign, TrendingUp, Settings, Trash2, Check } from 'lucide-react'
import { useEmployeeStore } from '../../store/employee'
import PerformanceChart from '../../components/employees/PerformanceChart'
import toast from 'react-hot-toast'

const POSITION_LABELS: Record<string, string> = {
  vendeur: 'Vendeur',
  caissier: 'Caissier',
  manager: 'Manager',
  gerant: 'Gérant',
}

export default function EmployeeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { 
    fetchEmployee, 
    fetchPerformance, 
    deactivateEmployee, 
    activateEmployee,
    currentEmployee,
    performance,
    loading 
  } = useEmployeeStore()

  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'permissions'>('overview')

  useEffect(() => {
    if (id) {
      loadData(Number(id))
    }
  }, [id])

  const loadData = async (employeeId: number) => {
    try {
      await fetchEmployee(employeeId)
      await fetchPerformance(employeeId)
    } catch (error) {
      toast.error('Erreur lors du chargement')
      navigate('/employees')
    }
  }

  const handleDeactivate = async () => {
    if (!currentEmployee) return
    if (!confirm(`Désactiver ${currentEmployee.full_name} ?`)) return
    
    try {
      await deactivateEmployee(currentEmployee.id)
      toast.success('Employé désactivé')
      loadData(currentEmployee.id)
    } catch (error) {
      toast.error('Erreur lors de la désactivation')
    }
  }

  const handleActivate = async () => {
    if (!currentEmployee) return
    
    try {
      await activateEmployee(currentEmployee.id)
      toast.success('Employé réactivé')
      loadData(currentEmployee.id)
    } catch (error) {
      toast.error('Erreur lors de la réactivation')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (!currentEmployee && !loading) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">Employé non trouvé</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/employees')}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${
              currentEmployee?.is_active ? 'bg-emerald-500' : 'bg-gray-400'
            }`}>
              {currentEmployee?.first_name?.[0]}{currentEmployee?.last_name?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {currentEmployee?.full_name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[var(--text-secondary)]">{currentEmployee?.employee_number}</span>
                <span className="px-2 py-0.5 bg-[var(--primary-100)] text-[var(--primary-700)] rounded text-xs font-medium">
                  {currentEmployee?.position && POSITION_LABELS[currentEmployee.position]}
                </span>
                {!currentEmployee?.is_active && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                    Inactif
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentEmployee?.is_active ? (
            <button
              onClick={handleDeactivate}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={18} />
              Désactiver
            </button>
          ) : (
            <button
              onClick={handleActivate}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Check size={18} />
              Réactiver
            </button>
          )}
          <Link
            to={`/employees/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] transition-colors"
          >
            <Edit size={18} />
            Modifier
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
          <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-2">
            <DollarSign size={16} />
            <span className="text-sm">Ventes totales</span>
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {formatCurrency(currentEmployee?.total_sales || 0)}
          </p>
        </div>
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
          <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-2">
            <TrendingUp size={16} />
            <span className="text-sm">Commissions</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">
            {formatCurrency(currentEmployee?.total_commission || 0)}
          </p>
        </div>
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
          <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-2">
            <Calendar size={16} />
            <span className="text-sm">Date d'embauche</span>
          </div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {currentEmployee?.hire_date && formatDate(currentEmployee.hire_date)}
          </p>
        </div>
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
          <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-2">
            <Store size={16} />
            <span className="text-sm">Magasins</span>
          </div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {currentEmployee?.assigned_stores?.length || 0} assigné(s)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-light)]">
        <div className="flex gap-6">
          {[
            { id: 'overview', label: 'Aperçu' },
            { id: 'performance', label: 'Performance' },
            { id: 'permissions', label: 'Permissions' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--primary-600)] text-[var(--primary-600)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <User size={18} className="text-[var(--primary-600)]" />
              Informations
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-[var(--text-tertiary)]" />
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Téléphone</p>
                  <p className="text-[var(--text-primary)]">{currentEmployee?.phone || 'Non renseigné'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-[var(--text-tertiary)]" />
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Email</p>
                  <p className="text-[var(--text-primary)]">{currentEmployee?.email || 'Non renseigné'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Stores */}
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Store size={18} className="text-[var(--primary-600)]" />
              Magasins assignés
            </h3>
            <div className="space-y-2">
              {currentEmployee?.assigned_stores?.map(store => (
                <div key={store.id} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{store.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{store.city || 'N/A'}</p>
                  </div>
                </div>
              ))}
              {(!currentEmployee?.assigned_stores || currentEmployee.assigned_stores.length === 0) && (
                <p className="text-[var(--text-tertiary)] text-center py-4">Aucun magasin assigné</p>
              )}
            </div>
          </div>

          {/* Salary & Commission */}
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <DollarSign size={18} className="text-[var(--primary-600)]" />
              Rémunération
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                <p className="text-xs text-[var(--text-tertiary)]">Salaire de base ({currentEmployee?.salary_frequency})</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {currentEmployee?.base_salary ? formatCurrency(currentEmployee.base_salary) : 'Non défini'}
                </p>
              </div>
              {currentEmployee?.commission_enabled && (
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-xs text-emerald-600">Commission</p>
                  <p className="text-lg font-semibold text-emerald-700">
                    {currentEmployee.commission_type === 'percent' 
                      ? `${currentEmployee.commission_value}% du CA`
                      : formatCurrency(currentEmployee.commission_value) + ' par vente'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && performance && (
        <PerformanceChart performance={performance} />
      )}

      {activeTab === 'permissions' && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Settings size={18} className="text-[var(--primary-600)]" />
            Permissions et accès
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'can_void_sale', label: 'Annuler des ventes' },
              { key: 'can_refund', label: 'Effectuer des remboursements' },
              { key: 'can_apply_discount', label: 'Appliquer des remises', extra: currentEmployee?.max_discount_percent ? ` (max ${currentEmployee.max_discount_percent}%)` : '' },
              { key: 'can_open_close_shift', label: 'Ouvrir/fermer les shifts' },
              { key: 'can_manage_products', label: 'Gérer les produits' },
              { key: 'can_view_reports', label: 'Voir les rapports' },
              { key: 'can_manage_employees', label: 'Gérer les employés' },
            ].map(perm => (
              <div key={perm.key} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                <span className="text-[var(--text-primary)]">{perm.label}{perm.extra}</span>
                {currentEmployee?.[perm.key as keyof typeof currentEmployee] ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                    Autorisé
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                    Refusé
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
