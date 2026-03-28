import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Percent, Plus, Edit, Trash2, Tag, Calendar, Users } from 'lucide-react'
import { useEcommerceStore, Coupon } from '../../store/ecommerce'
import toast from 'react-hot-toast'

export default function CouponsPage() {
  const [searchParams] = useSearchParams()
  const storeId = Number(searchParams.get('store'))

  const { coupons, fetchCoupons, createCoupon, updateCoupon, loading } = useEcommerceStore()
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: 0,
    min_order_amount: '',
    max_uses: '',
    uses_per_customer: 1,
    starts_at: '',
    expires_at: '',
    is_active: true,
  })

  useEffect(() => {
    if (storeId) {
      fetchCoupons(storeId)
    }
  }, [storeId])

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percent',
      discount_value: 0,
      min_order_amount: '',
      max_uses: '',
      uses_per_customer: 1,
      starts_at: '',
      expires_at: '',
      is_active: true,
    })
    setEditingCoupon(null)
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      min_order_amount: coupon.min_order_amount ? String(coupon.min_order_amount) : '',
      max_uses: coupon.max_uses ? String(coupon.max_uses) : '',
      uses_per_customer: coupon.uses_per_customer,
      starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 16) : '',
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 16) : '',
      is_active: coupon.is_active,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        online_store_id: storeId,
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        min_order_amount: formData.min_order_amount ? Number(formData.min_order_amount) : null,
        max_uses: formData.max_uses ? Number(formData.max_uses) : null,
        uses_per_customer: Number(formData.uses_per_customer),
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        is_active: formData.is_active,
      }

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, data)
        toast.success('Code promo mis à jour')
      } else {
        await createCoupon(data)
        toast.success('Code promo créé')
      }
      setShowModal(false)
      resetForm()
      fetchCoupons(storeId)
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(f => ({ ...f, code }))
  }

  if (!storeId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <p className="text-amber-700">Veuillez sélectionner une boutique</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Codes promo</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Créez et gérez vos codes promotionnels
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Nouveau code
        </button>
      </div>

      {/* Coupons List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-12 text-center">
          <Percent className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-4" />
          <h3 className="font-semibold text-[var(--text-primary)] mb-2">Aucun code promo</h3>
          <p className="text-[var(--text-secondary)] mb-4">
            Créez des codes promo pour fidéliser vos clients
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Créer un code
          </button>
        </div>
      ) : (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--bg-secondary)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Réduction</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Utilisations</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Validité</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {coupons.map(coupon => {
                const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date()
                const isActive = coupon.is_active && !isExpired

                return (
                  <tr key={coupon.id} className="hover:bg-[var(--bg-secondary)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-emerald-500" />
                        <span className="font-mono font-medium">{coupon.code}</span>
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">{coupon.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {coupon.discount_type === 'percent' 
                          ? `${coupon.discount_value}%` 
                          : `${Number(coupon.discount_value).toLocaleString()} XOF`
                        }
                      </span>
                      {coupon.min_order_amount && (
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Min: {Number(coupon.min_order_amount).toLocaleString()} XOF
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Users size={14} className="text-[var(--text-tertiary)]" />
                        <span>{coupon.current_uses}</span>
                        {coupon.max_uses && <span className="text-[var(--text-tertiary)]">/ {coupon.max_uses}</span>}
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {coupon.uses_per_customer}x/client
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {coupon.expires_at ? (
                        <div className="flex items-center gap-1">
                          <Calendar size={14} className={isExpired ? 'text-red-500' : 'text-[var(--text-tertiary)]'} />
                          <span className={isExpired ? 'text-red-600' : ''}>
                            {new Date(coupon.expires_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">Illimité</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        isActive ? 'bg-green-100 text-green-700' : 
                        isExpired ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {isActive ? 'Actif' : isExpired ? 'Expiré' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(coupon)}
                          className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--bg-primary)] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingCoupon ? 'Modifier le code promo' : 'Nouveau code promo'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Code *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      className="flex-1 px-3 py-2 border border-[var(--border-light)] rounded-lg font-mono"
                      placeholder="SUMMER2024"
                      required
                    />
                    <button type="button" onClick={generateCode} className="btn-secondary">
                      Générer
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                    placeholder="Remise été 2024"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type de réduction *</label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData(f => ({ ...f, discount_type: e.target.value as 'percent' | 'fixed' }))}
                      className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                    >
                      <option value="percent">Pourcentage (%)</option>
                      <option value="fixed">Montant fixe (XOF)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Valeur *</label>
                    <input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData(f => ({ ...f, discount_value: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                      min={0}
                      max={formData.discount_type === 'percent' ? 100 : undefined}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Montant minimum (XOF)</label>
                    <input
                      type="number"
                      value={formData.min_order_amount}
                      onChange={(e) => setFormData(f => ({ ...f, min_order_amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Utilisations max</label>
                    <input
                      type="number"
                      value={formData.max_uses}
                      onChange={(e) => setFormData(f => ({ ...f, max_uses: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                      min={1}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Utilisations par client</label>
                  <input
                    type="number"
                    value={formData.uses_per_customer}
                    onChange={(e) => setFormData(f => ({ ...f, uses_per_customer: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                    min={1}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date de début</label>
                    <input
                      type="datetime-local"
                      value={formData.starts_at}
                      onChange={(e) => setFormData(f => ({ ...f, starts_at: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Date d'expiration</label>
                    <input
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={(e) => setFormData(f => ({ ...f, expires_at: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Code actif</span>
                </label>

                <div className="flex items-center gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    {editingCoupon ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
