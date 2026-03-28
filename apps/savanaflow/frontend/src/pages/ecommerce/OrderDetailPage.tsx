import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Package, MapPin, Phone, Mail, User, Clock,
  CheckCircle, Truck, XCircle, CreditCard, Tag, MessageSquare,
  RefreshCw, Printer, ExternalLink, Copy
} from 'lucide-react'
import { useEcommerceStore, OnlineOrder } from '../../store/ecommerce'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  processing: { label: 'En préparation', color: 'bg-purple-100 text-purple-700', icon: Package },
  ready: { label: 'Prête', color: 'bg-indigo-100 text-indigo-700', icon: Package },
  shipped: { label: 'Expédiée', color: 'bg-cyan-100 text-cyan-700', icon: Truck },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
  refunded: { label: 'Remboursée', color: 'bg-gray-100 text-gray-700', icon: RefreshCw },
}

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Payée', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Échouée', color: 'bg-red-100 text-red-700' },
  refunded: { label: 'Remboursée', color: 'bg-gray-100 text-gray-700' },
}

const STATUS_TIMELINE = [
  { status: 'pending', label: 'Commande reçue' },
  { status: 'confirmed', label: 'Confirmée' },
  { status: 'processing', label: 'En préparation' },
  { status: 'shipped', label: 'Expédiée' },
  { status: 'delivered', label: 'Livrée' },
]

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentOrder, fetchOrder, confirmOrder, shipOrder, deliverOrder, cancelOrder, syncOrderToPos, loading } = useEcommerceStore()
  const [showSyncConfirm, setShowSyncConfirm] = useState(false)

  useEffect(() => {
    if (id) {
      fetchOrder(Number(id))
    }
  }, [id, fetchOrder])

  const handleStatusUpdate = async (action: 'confirm' | 'ship' | 'deliver' | 'cancel') => {
    if (!currentOrder) return

    try {
      switch (action) {
        case 'confirm':
          await confirmOrder(currentOrder.id)
          toast.success('Commande confirmée')
          break
        case 'ship':
          await shipOrder(currentOrder.id)
          toast.success('Commande expédiée')
          break
        case 'deliver':
          await deliverOrder(currentOrder.id)
          toast.success('Commande livrée')
          break
        case 'cancel':
          if (!confirm('Annuler cette commande ?')) return
          await cancelOrder(currentOrder.id)
          toast.success('Commande annulée')
          break
      }
      fetchOrder(Number(id))
    } catch (err) {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleSyncToPos = async () => {
    if (!currentOrder) return
    try {
      const result = await syncOrderToPos(currentOrder.id)
      toast.success(`Vente #${result.sale_id} créée dans le POS`)
      fetchOrder(Number(id))
      setShowSyncConfirm(false)
    } catch (err) {
      toast.error('Erreur lors de la synchronisation')
    }
  }

  const handleCopyOrderNumber = () => {
    if (currentOrder) {
      navigator.clipboard.writeText(currentOrder.order_number)
      toast.success('Numéro de commande copié')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const getTimelineStatus = (status: string) => {
    if (!currentOrder) return 'pending'
    const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
    const currentIndex = statusOrder.indexOf(currentOrder.status)
    const checkIndex = statusOrder.indexOf(status)
    
    if (currentOrder.status === 'cancelled') {
      return status === 'pending' ? 'cancelled' : 'pending'
    }
    
    if (checkIndex < currentIndex) return 'completed'
    if (checkIndex === currentIndex) return 'current'
    return 'pending'
  }

  if (loading && !currentOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!currentOrder) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <p className="text-amber-700">Commande non trouvée</p>
        <Link to="/ecommerce/orders" className="text-emerald-600 hover:underline mt-2 inline-block">
          Retour aux commandes
        </Link>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[currentOrder.status as keyof typeof STATUS_CONFIG]
  const paymentConfig = PAYMENT_STATUS_CONFIG[currentOrder.payment_status as keyof typeof PAYMENT_STATUS_CONFIG]
  const StatusIcon = statusConfig.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/ecommerce/orders')}
            className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {currentOrder.order_number}
              </h1>
              <button onClick={handleCopyOrderNumber} className="p-1 hover:bg-[var(--bg-secondary)] rounded">
                <Copy size={16} className="text-[var(--text-tertiary)]" />
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Créée le {new Date(currentOrder.created_at).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
            <Printer size={16} />
            <span className="hidden sm:inline">Imprimer</span>
          </button>
          {currentOrder.sale_id && (
            <Link
              to={`/pos?sale=${currentOrder.sale_id}`}
              className="btn-secondary flex items-center gap-2"
            >
              <ExternalLink size={16} />
              Voir vente
            </Link>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
        <h2 className="font-semibold text-[var(--text-primary)] mb-4">Suivi de la commande</h2>
        <div className="flex items-center justify-between">
          {STATUS_TIMELINE.map((step, index) => {
            const timelineStatus = getTimelineStatus(step.status)
            return (
              <div key={step.status} className="flex-1 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  timelineStatus === 'completed' ? 'bg-green-500 text-white' :
                  timelineStatus === 'current' ? 'bg-emerald-500 text-white' :
                  timelineStatus === 'cancelled' ? 'bg-red-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {timelineStatus === 'completed' ? (
                    <CheckCircle size={16} />
                  ) : timelineStatus === 'cancelled' ? (
                    <XCircle size={16} />
                  ) : (
                    index + 1
                  )}
                </div>
                <p className={`text-xs mt-2 text-center ${
                  timelineStatus === 'current' ? 'text-emerald-600 font-medium' :
                  timelineStatus === 'completed' ? 'text-green-600' :
                  'text-[var(--text-tertiary)]'
                }`}>
                  {step.label}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)]">
            <div className="px-4 py-3 border-b border-[var(--border-light)]">
              <h2 className="font-semibold text-[var(--text-primary)]">Articles commandés</h2>
            </div>
            <div className="divide-y divide-[var(--border-light)]">
              {currentOrder.items.map((item) => (
                <div key={item.id} className="px-4 py-3 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-[var(--bg-tertiary)] overflow-hidden flex-shrink-0">
                    {item.product_image ? (
                      <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 m-auto text-[var(--text-tertiary)]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--text-primary)]">{item.product_name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {item.quantity} x {Number(item.unit_price).toLocaleString()} XOF
                    </p>
                  </div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {Number(item.total).toLocaleString()} XOF
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Info */}
          {currentOrder.shipping_address && (
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-emerald-500" />
                <h2 className="font-semibold text-[var(--text-primary)]">Adresse de livraison</h2>
              </div>
              <div className="text-sm text-[var(--text-secondary)] space-y-1">
                <p>{currentOrder.shipping_address.address_line1}</p>
                {currentOrder.shipping_address.address_line2 && (
                  <p>{currentOrder.shipping_address.address_line2}</p>
                )}
                <p>
                  {currentOrder.shipping_address.city}
                  {currentOrder.shipping_address.state && `, ${currentOrder.shipping_address.state}`}
                </p>
                {currentOrder.shipping_address.postal_code && (
                  <p>{currentOrder.shipping_address.postal_code}</p>
                )}
                <p>{currentOrder.shipping_address.country || 'Côte d\'Ivoire'}</p>
              </div>
              {currentOrder.delivery_notes && (
                <div className="mt-3 pt-3 border-t border-[var(--border-light)]">
                  <p className="text-xs text-[var(--text-tertiary)]">Notes:</p>
                  <p className="text-sm text-[var(--text-secondary)]">{currentOrder.delivery_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Customer Notes */}
          {currentOrder.customer_notes && (
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={18} className="text-emerald-500" />
                <h2 className="font-semibold text-[var(--text-primary)]">Notes du client</h2>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{currentOrder.customer_notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                <StatusIcon size={14} />
                {statusConfig.label}
              </span>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${paymentConfig.color}`}>
                {paymentConfig.label}
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {currentOrder.status === 'pending' && (
                <button
                  onClick={() => handleStatusUpdate('confirm')}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  Confirmer
                </button>
              )}
              {currentOrder.status === 'confirmed' && (
                <button
                  onClick={() => handleStatusUpdate('ship')}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  <Truck size={16} />
                  Expédier
                </button>
              )}
              {currentOrder.status === 'shipped' && (
                <button
                  onClick={() => handleStatusUpdate('deliver')}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  Marquer livrée
                </button>
              )}
              {['pending', 'confirmed'].includes(currentOrder.status) && (
                <button
                  onClick={() => handleStatusUpdate('cancel')}
                  className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2"
                >
                  <XCircle size={16} />
                  Annuler
                </button>
              )}
            </div>
          </div>

          {/* Customer Card */}
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <User size={18} className="text-emerald-500" />
              <h2 className="font-semibold text-[var(--text-primary)]">Client</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User size={14} className="text-[var(--text-tertiary)]" />
                <span className="text-sm text-[var(--text-primary)]">{currentOrder.customer_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-[var(--text-tertiary)]" />
                <a href={`mailto:${currentOrder.customer_email}`} className="text-sm text-emerald-600 hover:underline">
                  {currentOrder.customer_email}
                </a>
              </div>
              {currentOrder.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-[var(--text-tertiary)]" />
                  <a href={`tel:${currentOrder.customer_phone}`} className="text-sm text-emerald-600 hover:underline">
                    {currentOrder.customer_phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Payment Card */}
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={18} className="text-emerald-500" />
              <h2 className="font-semibold text-[var(--text-primary)]">Paiement</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Méthode</span>
                <span className="text-[var(--text-primary)]">
                  {currentOrder.payment_method === 'cinetpay' ? 'CinetPay' :
                   currentOrder.payment_method === 'paystack' ? 'Paystack' :
                   currentOrder.payment_method === 'mpesa' ? 'M-Pesa' :
                   currentOrder.payment_method === 'cash_on_delivery' ? 'Paiement à la livraison' :
                   currentOrder.payment_method || '-'}
                </span>
              </div>
              {currentOrder.payment_reference && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Référence</span>
                  <span className="text-[var(--text-primary)] font-mono text-xs">
                    {currentOrder.payment_reference}
                  </span>
                </div>
              )}
              {currentOrder.paid_at && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Payé le</span>
                  <span className="text-[var(--text-primary)]">
                    {new Date(currentOrder.paid_at).toLocaleString('fr-FR')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <Tag size={18} className="text-emerald-500" />
              <h2 className="font-semibold text-[var(--text-primary)]">Récapitulatif</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Sous-total</span>
                <span className="text-[var(--text-primary)]">
                  {Number(currentOrder.subtotal).toLocaleString()} XOF
                </span>
              </div>
              {Number(currentOrder.discount_amount) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Réduction</span>
                  <span>-{Number(currentOrder.discount_amount).toLocaleString()} XOF</span>
                </div>
              )}
              {Number(currentOrder.delivery_fee) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Livraison</span>
                  <span className="text-[var(--text-primary)]">
                    {Number(currentOrder.delivery_fee).toLocaleString()} XOF
                  </span>
                </div>
              )}
              {Number(currentOrder.tax_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Taxes</span>
                  <span className="text-[var(--text-primary)]">
                    {Number(currentOrder.tax_amount).toLocaleString()} XOF
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-[var(--border-light)]">
                <span className="text-[var(--text-primary)]">Total</span>
                <span className="text-[var(--text-primary)]">
                  {Number(currentOrder.total).toLocaleString()} XOF
                </span>
              </div>
            </div>
          </div>

          {/* Sync to POS */}
          {!currentOrder.sale_id && currentOrder.payment_status === 'paid' && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
              <p className="text-sm text-emerald-700 mb-3">
                Cette commande est payée mais pas encore synchronisée avec le POS.
              </p>
              {showSyncConfirm ? (
                <div className="space-y-2">
                  <p className="text-xs text-emerald-600">Créer une vente dans le POS ?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSyncToPos}
                      className="flex-1 btn-primary text-sm"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setShowSyncConfirm(false)}
                      className="flex-1 px-3 py-1 border border-emerald-200 rounded-lg text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowSyncConfirm(true)}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  Synchroniser avec POS
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
