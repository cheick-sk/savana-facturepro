import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Truck, Plus, Edit, Trash2, MapPin, DollarSign } from 'lucide-react'
import { useEcommerceStore, DeliveryZone } from '../../store/ecommerce'
import toast from 'react-hot-toast'

export default function DeliveryZonesPage() {
  const [searchParams] = useSearchParams()
  const storeId = Number(searchParams.get('store'))

  const { deliveryZones, fetchDeliveryZones, createDeliveryZone, updateDeliveryZone, loading } = useEcommerceStore()
  const [showModal, setShowModal] = useState(false)
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    areas: '',
    base_fee: 0,
    free_delivery_minimum: '',
    estimated_delivery_hours: 24,
    is_active: true,
  })

  useEffect(() => {
    if (storeId) {
      fetchDeliveryZones(storeId)
    }
  }, [storeId])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      areas: '',
      base_fee: 0,
      free_delivery_minimum: '',
      estimated_delivery_hours: 24,
      is_active: true,
    })
    setEditingZone(null)
  }

  const handleEdit = (zone: DeliveryZone) => {
    setEditingZone(zone)
    setFormData({
      name: zone.name,
      description: zone.description || '',
      areas: zone.areas.join(', '),
      base_fee: Number(zone.base_fee),
      free_delivery_minimum: zone.free_delivery_minimum ? String(zone.free_delivery_minimum) : '',
      estimated_delivery_hours: zone.estimated_delivery_hours,
      is_active: zone.is_active,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        online_store_id: storeId,
        name: formData.name,
        description: formData.description || null,
        areas: formData.areas.split(',').map(a => a.trim()).filter(Boolean),
        base_fee: Number(formData.base_fee),
        free_delivery_minimum: formData.free_delivery_minimum ? Number(formData.free_delivery_minimum) : null,
        estimated_delivery_hours: Number(formData.estimated_delivery_hours),
        is_active: formData.is_active,
      }

      if (editingZone) {
        await updateDeliveryZone(editingZone.id, data)
        toast.success('Zone mise à jour')
      } else {
        await createDeliveryZone(data)
        toast.success('Zone créée')
      }
      setShowModal(false)
      resetForm()
      fetchDeliveryZones(storeId)
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde')
    }
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Zones de livraison</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Configurez les zones et tarifs de livraison
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Nouvelle zone
        </button>
      </div>

      {/* Zones List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      ) : deliveryZones.length === 0 ? (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-12 text-center">
          <Truck className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-4" />
          <h3 className="font-semibold text-[var(--text-primary)] mb-2">Aucune zone de livraison</h3>
          <p className="text-[var(--text-secondary)] mb-4">
            Créez des zones de livraison pour proposer la livraison à vos clients
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Créer une zone
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deliveryZones.map(zone => (
            <div key={zone.id} className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{zone.name}</h3>
                  {zone.description && (
                    <p className="text-sm text-[var(--text-secondary)]">{zone.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleEdit(zone)}
                  className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg"
                >
                  <Edit size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={14} className="text-[var(--text-tertiary)]" />
                  <span className="text-[var(--text-secondary)]">
                    {zone.areas.slice(0, 3).join(', ')}
                    {zone.areas.length > 3 && ` +${zone.areas.length - 3}`}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <DollarSign size={14} className="text-emerald-500" />
                    <span className="font-medium">{Number(zone.base_fee).toLocaleString()} XOF</span>
                  </div>
                  {zone.free_delivery_minimum && (
                    <span className="text-xs text-[var(--text-tertiary)]">
                      Gratuit dès {Number(zone.free_delivery_minimum).toLocaleString()} XOF
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className={`inline-flex px-2 py-0.5 rounded-full ${
                    zone.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {zone.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-[var(--text-tertiary)]">
                    ~{zone.estimated_delivery_hours}h
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--bg-primary)] rounded-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingZone ? 'Modifier la zone' : 'Nouvelle zone de livraison'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Zones couvertes *</label>
                  <textarea
                    value={formData.areas}
                    onChange={(e) => setFormData(f => ({ ...f, areas: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                    rows={2}
                    placeholder="Cocody, Plateau, Treichville..."
                    required
                  />
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Séparez par des virgules</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Frais de base (XOF) *</label>
                    <input
                      type="number"
                      value={formData.base_fee}
                      onChange={(e) => setFormData(f => ({ ...f, base_fee: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                      min={0}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Livraison gratuite dès (XOF)</label>
                    <input
                      type="number"
                      value={formData.free_delivery_minimum}
                      onChange={(e) => setFormData(f => ({ ...f, free_delivery_minimum: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                      min={0}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Délai estimé (heures)</label>
                  <input
                    type="number"
                    value={formData.estimated_delivery_hours}
                    onChange={(e) => setFormData(f => ({ ...f, estimated_delivery_hours: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                    min={1}
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Zone active</span>
                </label>

                <div className="flex items-center gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    {editingZone ? 'Mettre à jour' : 'Créer'}
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
