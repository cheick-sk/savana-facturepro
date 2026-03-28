import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, User } from 'lucide-react'
import { useEmployeeStore, type Employee } from '../../store/employee'
import toast from 'react-hot-toast'

const POSITIONS = [
  { value: 'vendeur', label: 'Vendeur' },
  { value: 'caissier', label: 'Caissier' },
  { value: 'manager', label: 'Manager' },
  { value: 'gerant', label: 'Gérant' },
]

const SALARY_FREQUENCIES = [
  { value: 'daily', label: 'Journalier' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
]

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  position: 'vendeur' | 'caissier' | 'manager' | 'gerant'
  hire_date: string
  store_ids: number[]
  primary_store_id: number | null
  can_void_sale: boolean
  can_refund: boolean
  can_apply_discount: boolean
  max_discount_percent: number
  can_open_close_shift: boolean
  can_manage_products: boolean
  can_view_reports: boolean
  can_manage_employees: boolean
  commission_enabled: boolean
  commission_type: 'percent' | 'fixed'
  commission_value: number
  base_salary: string
  salary_frequency: 'daily' | 'weekly' | 'monthly'
}

const initialFormData: FormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  position: 'vendeur',
  hire_date: new Date().toISOString().split('T')[0],
  store_ids: [],
  primary_store_id: null,
  can_void_sale: false,
  can_refund: false,
  can_apply_discount: false,
  max_discount_percent: 0,
  can_open_close_shift: false,
  can_manage_products: false,
  can_view_reports: false,
  can_manage_employees: false,
  commission_enabled: false,
  commission_type: 'percent',
  commission_value: 0,
  base_salary: '',
  salary_frequency: 'monthly',
}

export default function EmployeeFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { createEmployee, updateEmployee, fetchEmployee, loading } = useEmployeeStore()
  
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [stores, setStores] = useState<{ id: number; name: string }[]>([])
  const isEditing = Boolean(id)

  useEffect(() => {
    loadStores()
    if (id) {
      loadEmployee(Number(id))
    }
  }, [id])

  const loadStores = async () => {
    try {
      const { data } = await fetch('/api/v1/stores', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }).then(res => res.json())
      setStores(data?.items || data || [])
    } catch (error) {
      console.error('Failed to load stores:', error)
    }
  }

  const loadEmployee = async (employeeId: number) => {
    try {
      const employee = await fetchEmployee(employeeId)
      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email || '',
        phone: employee.phone || '',
        position: employee.position,
        hire_date: employee.hire_date,
        store_ids: employee.assigned_stores?.map(s => s.id) || [],
        primary_store_id: employee.assigned_stores?.find(s => s.id === employee.assigned_stores?.[0]?.id)?.id || null,
        can_void_sale: employee.can_void_sale,
        can_refund: employee.can_refund,
        can_apply_discount: employee.can_apply_discount,
        max_discount_percent: employee.max_discount_percent,
        can_open_close_shift: employee.can_open_close_shift,
        can_manage_products: employee.can_manage_products,
        can_view_reports: employee.can_view_reports,
        can_manage_employees: employee.can_manage_employees,
        commission_enabled: employee.commission_enabled,
        commission_type: employee.commission_type,
        commission_value: employee.commission_value,
        base_salary: employee.base_salary?.toString() || '',
        salary_frequency: employee.salary_frequency,
      })
    } catch (error) {
      toast.error('Erreur lors du chargement de l\'employé')
      navigate('/employees')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.first_name || !formData.last_name || !formData.position || !formData.hire_date) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      const data: any = {
        ...formData,
        base_salary: formData.base_salary ? parseFloat(formData.base_salary) : null,
      }

      if (isEditing && id) {
        await updateEmployee(Number(id), data)
        toast.success('Employé mis à jour')
      } else {
        await createEmployee(data)
        toast.success('Employé créé')
      }
      navigate('/employees')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde')
    }
  }

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleStoreToggle = (storeId: number) => {
    setFormData(prev => {
      const newStoreIds = prev.store_ids.includes(storeId)
        ? prev.store_ids.filter(id => id !== storeId)
        : [...prev.store_ids, storeId]
      
      return {
        ...prev,
        store_ids: newStoreIds,
        primary_store_id: newStoreIds.length === 1 ? newStoreIds[0] : prev.primary_store_id,
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {isEditing ? 'Modifier l\'employé' : 'Nouvel employé'}
          </h1>
          <p className="text-[var(--text-secondary)]">
            {isEditing ? 'Mettez à jour les informations de l\'employé' : 'Remplissez les informations du nouvel employé'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <User size={20} className="text-[var(--primary-600)]" />
            Informations personnelles
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Prénom *
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Nom *
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Poste *
              </label>
              <select
                value={formData.position}
                onChange={(e) => handleChange('position', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                required
              >
                {POSITIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Date d'embauche *
              </label>
              <input
                type="date"
                value={formData.hire_date}
                onChange={(e) => handleChange('hire_date', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                required
              />
            </div>
          </div>
        </div>

        {/* Assigned Stores */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Magasins assignés
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {stores.map(store => (
              <label
                key={store.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.store_ids.includes(store.id)
                    ? 'border-[var(--primary-500)] bg-[var(--primary-50)]'
                    : 'border-[var(--border-light)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.store_ids.includes(store.id)}
                  onChange={() => handleStoreToggle(store.id)}
                  className="w-4 h-4 text-[var(--primary-600)] focus:ring-[var(--primary-500)]"
                />
                <span className="text-sm text-[var(--text-primary)]">{store.name}</span>
              </label>
            ))}
          </div>
          
          {formData.store_ids.length > 1 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Magasin principal
              </label>
              <select
                value={formData.primary_store_id || ''}
                onChange={(e) => handleChange('primary_store_id', Number(e.target.value))}
                className="w-full max-w-xs px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
              >
                {formData.store_ids.map(id => {
                  const store = stores.find(s => s.id === id)
                  return store ? (
                    <option key={id} value={id}>{store.name}</option>
                  ) : null
                })}
              </select>
            </div>
          )}
        </div>

        {/* Permissions */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Permissions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'can_void_sale', label: 'Annuler des ventes' },
              { key: 'can_refund', label: 'Effectuer des remboursements' },
              { key: 'can_apply_discount', label: 'Appliquer des remises' },
              { key: 'can_open_close_shift', label: 'Ouvrir/fermer les shifts' },
              { key: 'can_manage_products', label: 'Gérer les produits' },
              { key: 'can_view_reports', label: 'Voir les rapports' },
              { key: 'can_manage_employees', label: 'Gérer les employés' },
            ].map(perm => (
              <label key={perm.key} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData[perm.key as keyof FormData] as boolean}
                  onChange={(e) => handleChange(perm.key as keyof FormData, e.target.checked)}
                  className="w-4 h-4 text-[var(--primary-600)] focus:ring-[var(--primary-500)]"
                />
                <span className="text-sm text-[var(--text-primary)]">{perm.label}</span>
              </label>
            ))}
          </div>
          
          {formData.can_apply_discount && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Remise maximum (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.max_discount_percent}
                onChange={(e) => handleChange('max_discount_percent', parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
              />
            </div>
          )}
        </div>

        {/* Commission & Salary */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Commission et salaire
          </h2>
          
          <div className="space-y-4">
            {/* Commission */}
            <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={formData.commission_enabled}
                  onChange={(e) => handleChange('commission_enabled', e.target.checked)}
                  className="w-4 h-4 text-[var(--primary-600)] focus:ring-[var(--primary-500)]"
                />
                <span className="font-medium text-[var(--text-primary)]">Activer les commissions</span>
              </label>
              
              {formData.commission_enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Type de commission
                    </label>
                    <select
                      value={formData.commission_type}
                      onChange={(e) => handleChange('commission_type', e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                    >
                      <option value="percent">Pourcentage (%)</option>
                      <option value="fixed">Montant fixe (GNF)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      {formData.commission_type === 'percent' ? 'Taux (%)' : 'Montant (GNF)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={formData.commission_type === 'percent' ? '0.5' : '1000'}
                      value={formData.commission_value}
                      onChange={(e) => handleChange('commission_value', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Salary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Salaire de base (GNF)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={formData.base_salary}
                  onChange={(e) => handleChange('base_salary', e.target.value)}
                  placeholder="Optionnel"
                  className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Fréquence de paiement
                </label>
                <select
                  value={formData.salary_frequency}
                  onChange={(e) => handleChange('salary_frequency', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                >
                  {SALARY_FREQUENCIES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="px-4 py-2 border border-[var(--border-light)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg font-medium hover:bg-[var(--primary-700)] disabled:opacity-50 transition-colors"
          >
            <Save size={18} />
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </form>
    </div>
  )
}
