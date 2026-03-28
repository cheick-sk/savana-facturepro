import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Store, Package, ShoppingCart, Tag, Truck, Percent, BarChart2,
  Plus, Settings, ExternalLink, TrendingUp, Users, AlertCircle
} from 'lucide-react'
import { useEcommerceStore } from '../../store/ecommerce'
import { useAuthStore } from '../../store/auth'

export default function EcommercePage() {
  const { stores, stats, fetchStores, fetchStats, loading } = useEcommerceStore()
  const { user } = useAuthStore()
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  useEffect(() => {
    if (selectedStoreId) {
      fetchStats(selectedStoreId)
    }
  }, [selectedStoreId, fetchStats])

  useEffect(() => {
    if (stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id)
    }
  }, [stores, selectedStoreId])

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  if (loading && stores.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">E-commerce</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Gérez votre boutique en ligne
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stores.length > 0 && (
            <select
              value={selectedStoreId || ''}
              onChange={(e) => setSelectedStoreId(Number(e.target.value))}
              className="px-3 py-2 border border-[var(--border-light)] rounded-lg text-sm bg-[var(--bg-primary)]"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <Link
            to="/ecommerce/stores/new"
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nouvelle boutique</span>
          </Link>
        </div>
      </div>

      {stores.length === 0 ? (
        /* No stores yet */
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-12 text-center">
          <Store className="w-16 h-16 mx-auto text-[var(--text-tertiary)] mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Créez votre boutique en ligne
          </h2>
          <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
            Lancez votre e-commerce et vendez vos produits en ligne. 
            Gérez les commandes, les livraisons et les paiements depuis une interface unique.
          </p>
          <Link to="/ecommerce/stores/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            Créer une boutique
          </Link>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total_orders}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Commandes</p>
                  </div>
                </div>
                {stats.pending_orders > 0 && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {stats.pending_orders} en attente
                  </p>
                )}
              </div>

              <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {stats.today_revenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">Ventes aujourd'hui</p>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.published_products}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Produits publiés</p>
                  </div>
                </div>
                {stats.out_of_stock > 0 && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {stats.out_of_stock} en rupture
                  </p>
                )}
              </div>

              <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total_customers}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Clients</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to={`/ecommerce/products?store=${selectedStoreId}`}
              className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4 hover:border-emerald-300 hover:shadow-sm transition-all group"
            >
              <Package className="w-8 h-8 text-emerald-500 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-[var(--text-primary)]">Produits</h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Gérer le catalogue</p>
            </Link>

            <Link
              to={`/ecommerce/orders?store=${selectedStoreId}`}
              className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4 hover:border-emerald-300 hover:shadow-sm transition-all group"
            >
              <ShoppingCart className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-[var(--text-primary)]">Commandes</h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Suivi des commandes</p>
            </Link>

            <Link
              to={`/ecommerce/delivery?store=${selectedStoreId}`}
              className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4 hover:border-emerald-300 hover:shadow-sm transition-all group"
            >
              <Truck className="w-8 h-8 text-orange-500 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-[var(--text-primary)]">Livraison</h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Zones & tarifs</p>
            </Link>

            <Link
              to={`/ecommerce/coupons?store=${selectedStoreId}`}
              className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4 hover:border-emerald-300 hover:shadow-sm transition-all group"
            >
              <Percent className="w-8 h-8 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-[var(--text-primary)]">Promotions</h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Codes promo</p>
            </Link>
          </div>

          {/* Recent Orders */}
          {stats?.recent_orders && stats.recent_orders.length > 0 && (
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)]">
              <div className="px-4 py-3 border-b border-[var(--border-light)] flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)]">Commandes récentes</h3>
                <Link to={`/ecommerce/orders?store=${selectedStoreId}`} className="text-sm text-emerald-600 hover:text-emerald-700">
                  Voir tout
                </Link>
              </div>
              <div className="divide-y divide-[var(--border-light)]">
                {stats.recent_orders.map(order => (
                  <div key={order.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{order.order_number}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{order.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[var(--text-primary)]">{order.total.toLocaleString()} XOF</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                        order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Store Info Card */}
          {selectedStore && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">{selectedStore.name}</h3>
                  <p className="text-emerald-100 mt-1">
                    {selectedStore.is_active ? 'Boutique active' : 'Boutique inactive'}
                  </p>
                  {selectedStore.custom_domain && (
                    <p className="text-sm text-emerald-100 mt-2">{selectedStore.custom_domain}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/ecommerce/stores/${selectedStore.id}`}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
                  >
                    <Settings size={16} className="inline mr-1" />
                    Paramètres
                  </Link>
                  {selectedStore.slug && (
                    <a
                      href={`/store/${selectedStore.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
                    >
                      <ExternalLink size={16} className="inline mr-1" />
                      Voir la boutique
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
