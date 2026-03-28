import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { 
  ShoppingCart, Search, Eye, Truck, CheckCircle,
  XCircle, Clock, Package, RefreshCw
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

export default function OrdersPage() {
  const [searchParams] = useSearchParams()
  const storeId = Number(searchParams.get('store'))

  const { 
    orders, fetchOrders, confirmOrder, shipOrder, deliverOrder, cancelOrder, syncOrderToPos, loading 
  } = useEcommerceStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [paymentFilter, setPaymentFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null)

  useEffect(() => {
    if (storeId) {
      loadOrders()
    }
  }, [storeId, page, statusFilter, paymentFilter])

  const loadOrders = async () => {
    if (!storeId) return
    try {
      const result = await fetchOrders({
        online_store_id: storeId,
        status: statusFilter || undefined,
        payment_status: paymentFilter || undefined,
        search: search || undefined,
        page,
        per_page: 20,
      })
      setTotal(result.total)
    } catch (err) {
      console.error('Failed to load orders:', err)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadOrders()
  }

  const handleStatusUpdate = async (order: OnlineOrder, action: 'confirm' | 'ship' | 'deliver' | 'cancel') => {
    try {
      switch (action) {
        case 'confirm':
          await confirmOrder(order.id)
          toast.success('Commande confirmée')
          break
        case 'ship':
          await shipOrder(order.id)
          toast.success('Commande expédiée')
          break
        case 'deliver':
          await deliverOrder(order.id)
          toast.success('Commande livrée')
          break
        case 'cancel':
          if (!confirm('Annuler cette commande ?')) return
          await cancelOrder(order.id)
          toast.success('Commande annulée')
          break
      }
      loadOrders()
    } catch (err) {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleSyncToPos = async (order: OnlineOrder) => {
    try {
      const result = await syncOrderToPos(order.id)
      toast.success(`Vente #${result.sale_id} créée dans le POS`)
      loadOrders()
    } catch (err) {
      toast.error('Erreur lors de la synchronisation')
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Commandes</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {total} commande{total > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['pending', 'confirmed', 'shipped', 'delivered'].map(status => {
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
          const count = orders.filter(o => o.status === status).length
          const Icon = config.icon
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
              className={`p-4 rounded-xl border transition-all ${
                statusFilter === status 
                  ? 'border-emerald-500 bg-emerald-50' 
                  : 'border-[var(--border-light)] bg-[var(--bg-primary)] hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${
                  status === 'pending' ? 'text-amber-500' :
                  status === 'delivered' ? 'text-green-500' : 'text-blue-500'
                }`} />
                <div className="text-left">
                  <p className="text-lg font-bold text-[var(--text-primary)]">{count}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{config.label}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="N° commande, email, nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-3 py-2 border border-[var(--border-light)] rounded-lg"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-[var(--border-light)] rounded-lg"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border border-[var(--border-light)] rounded-lg"
          >
            <option value="">Tous les paiements</option>
            {Object.entries(PAYMENT_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-12 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-4" />
            <p className="text-[var(--text-secondary)]">Aucune commande trouvée</p>
          </div>
        ) : (
          orders.map(order => {
            const statusConfig = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]
            const paymentConfig = PAYMENT_STATUS_CONFIG[order.payment_status as keyof typeof PAYMENT_STATUS_CONFIG]
            const StatusIcon = statusConfig.icon

            return (
              <div key={order.id} className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] overflow-hidden">
                {/* Order Header */}
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

                {/* Order Body */}
                <div className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Customer Info */}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{order.customer_name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{order.customer_email}</p>
                      {order.customer_phone && (
                        <p className="text-xs text-[var(--text-tertiary)]">{order.customer_phone}</p>
                      )}
                    </div>

                    {/* Items Preview */}
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">Articles</p>
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
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleStatusUpdate(order, 'confirm')}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                        >
                          Confirmer
                        </button>
                      )}
                      {order.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatusUpdate(order, 'ship')}
                          className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600"
                        >
                          Expédier
                        </button>
                      )}
                      {order.status === 'shipped' && (
                        <button
                          onClick={() => handleStatusUpdate(order, 'deliver')}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                        >
                          Livrer
                        </button>
                      )}
                      {['pending', 'confirmed'].includes(order.status) && (
                        <button
                          onClick={() => handleStatusUpdate(order, 'cancel')}
                          className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                        >
                          Annuler
                        </button>
                      )}
                      {!order.sale_id && order.payment_status === 'paid' && (
                        <button
                          onClick={() => handleSyncToPos(order)}
                          className="px-3 py-1.5 border border-emerald-500 text-emerald-600 rounded-lg text-sm hover:bg-emerald-50"
                        >
                          Sync POS
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            Affichage de {((page - 1) * 20) + 1} à {Math.min(page * 20, total)} sur {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-[var(--border-light)] rounded-lg disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 20 >= total}
              className="px-3 py-1 border border-[var(--border-light)] rounded-lg disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-[var(--bg-primary)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{selectedOrder.order_number}</h2>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg">
                  <XCircle size={20} />
                </button>
              </div>

              {/* Order details */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Client</h3>
                  <p>{selectedOrder.customer_name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{selectedOrder.customer_email}</p>
                  {selectedOrder.customer_phone && <p className="text-sm">{selectedOrder.customer_phone}</p>}
                </div>

                <div>
                  <h3 className="font-medium mb-2">Articles</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>{Number(item.total).toLocaleString()} XOF</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Sous-total</span>
                    <span>{Number(selectedOrder.subtotal).toLocaleString()} XOF</span>
                  </div>
                  {Number(selectedOrder.discount_amount) > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Réduction</span>
                      <span>-{Number(selectedOrder.discount_amount).toLocaleString()} XOF</span>
                    </div>
                  )}
                  {Number(selectedOrder.delivery_fee) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Livraison</span>
                      <span>{Number(selectedOrder.delivery_fee).toLocaleString()} XOF</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                    <span>Total</span>
                    <span>{Number(selectedOrder.total).toLocaleString()} XOF</span>
                  </div>
                </div>

                {selectedOrder.shipping_address && (
                  <div>
                    <h3 className="font-medium mb-2">Adresse de livraison</h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {selectedOrder.shipping_address.address_line1}<br />
                      {selectedOrder.shipping_address.city}
                    </p>
                  </div>
                )}

                {selectedOrder.customer_notes && (
                  <div>
                    <h3 className="font-medium mb-2">Notes du client</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{selectedOrder.customer_notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
