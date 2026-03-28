import { 
  Package, MapPin, Phone, Mail, User, Clock,
  CheckCircle, Truck, XCircle, RefreshCw
} from 'lucide-react'
import { OnlineOrder } from '../../store/ecommerce'

interface OrderCardProps {
  order: OnlineOrder
  onConfirm?: () => void
  onShip?: () => void
  onDeliver?: () => void
  onCancel?: () => void
  onView?: () => void
  compact?: boolean
}

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

export default function OrderCard({
  order,
  onConfirm,
  onShip,
  onDeliver,
  onCancel,
  onView,
  compact = false,
}: OrderCardProps) {
  const statusConfig = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]
  const paymentConfig = PAYMENT_STATUS_CONFIG[order.payment_status as keyof typeof PAYMENT_STATUS_CONFIG]
  const StatusIcon = statusConfig.icon

  if (compact) {
    return (
      <div 
        className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-light)] p-3 hover:border-emerald-300 cursor-pointer transition-colors"
        onClick={onView}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm text-[var(--text-primary)]">{order.order_number}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig.color}`}>
            <StatusIcon size={10} />
            {statusConfig.label}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>{order.customer_name}</span>
          <span className="font-medium text-[var(--text-primary)]">
            {Number(order.total).toLocaleString()} XOF
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-light)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-4">
          <div>
            <p className="font-semibold text-[var(--text-primary)]">{order.order_number}</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {new Date(order.created_at).toLocaleString('fr-FR')}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
            <StatusIcon size={12} />
            {statusConfig.label}
          </span>
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${paymentConfig.color}`}>
            {paymentConfig.label}
          </span>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg text-[var(--text-primary)]">
            {Number(order.total).toLocaleString()} XOF
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {order.delivery_method === 'pickup' ? 'Retrait magasin' : 'Livraison'}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Customer Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <User size={14} className="text-[var(--text-tertiary)]" />
              <p className="text-sm font-medium text-[var(--text-primary)]">{order.customer_name}</p>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Mail size={14} className="text-[var(--text-tertiary)]" />
              <p className="text-xs text-[var(--text-secondary)]">{order.customer_email}</p>
            </div>
            {order.customer_phone && (
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-[var(--text-tertiary)]" />
                <p className="text-xs text-[var(--text-secondary)]">{order.customer_phone}</p>
              </div>
            )}
          </div>

          {/* Items Preview */}
          <div className="flex-1">
            <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">Articles ({order.items.length})</p>
            <div className="space-y-1">
              {order.items.slice(0, 3).map((item, idx) => (
                <p key={idx} className="text-sm text-[var(--text-secondary)]">
                  {item.quantity}x {item.product_name}
                </p>
              ))}
              {order.items.length > 3 && (
                <p className="text-xs text-[var(--text-tertiary)]">
                  +{order.items.length - 3} autre(s)
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {order.status === 'pending' && onConfirm && (
              <button
                onClick={onConfirm}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                Confirmer
              </button>
            )}
            {order.status === 'confirmed' && onShip && (
              <button
                onClick={onShip}
                className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600"
              >
                Expédier
              </button>
            )}
            {order.status === 'shipped' && onDeliver && (
              <button
                onClick={onDeliver}
                className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
              >
                Livrer
              </button>
            )}
            {['pending', 'confirmed'].includes(order.status) && onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
              >
                Annuler
              </button>
            )}
            {onView && (
              <button
                onClick={onView}
                className="px-3 py-1.5 border border-[var(--border-light)] rounded-lg text-sm hover:bg-[var(--bg-secondary)]"
              >
                Détails
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
