import { useState } from 'react'
import { ExternalLink, Smartphone, Monitor, Tablet } from 'lucide-react'
import { OnlineStore } from '../../store/ecommerce'

interface StorePreviewProps {
  store: OnlineStore
  products?: Array<{
    id: number
    name: string
    price: number
    image?: string
  }>
}

export default function StorePreview({ store, products = [] }: StorePreviewProps) {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  const deviceWidths = {
    mobile: 'w-[320px]',
    tablet: 'w-[768px]',
    desktop: 'w-full',
  }

  const storeUrl = store.custom_domain || `/store/${store.slug}`

  return (
    <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-light)] flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">Aperçu de la boutique</h3>
        <div className="flex items-center gap-2">
          {/* Device Toggle */}
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-lg p-1">
            <button
              onClick={() => setDevice('mobile')}
              className={`p-1.5 rounded ${
                device === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-[var(--bg-tertiary)]'
              }`}
              title="Mobile"
            >
              <Smartphone size={14} />
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={`p-1.5 rounded ${
                device === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-[var(--bg-tertiary)]'
              }`}
              title="Tablet"
            >
              <Tablet size={14} />
            </button>
            <button
              onClick={() => setDevice('desktop')}
              className={`p-1.5 rounded ${
                device === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-[var(--bg-tertiary)]'
              }`}
              title="Desktop"
            >
              <Monitor size={14} />
            </button>
          </div>
          
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm flex items-center gap-1"
          >
            <ExternalLink size={14} />
            Ouvrir
          </a>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="p-4 bg-[var(--bg-tertiary)] overflow-x-auto">
        <div className={`mx-auto transition-all duration-300 ${deviceWidths[device]}`}>
          <div
            className="bg-white rounded-lg shadow-lg overflow-hidden"
            style={{ minHeight: '400px' }}
          >
            {/* Store Header */}
            <div
              className="relative"
              style={{
                background: `linear-gradient(135deg, ${store.primary_color}, ${store.secondary_color})`,
              }}
            >
              {/* Banner */}
              {store.banner_url ? (
                <img
                  src={store.banner_url}
                  alt=""
                  className="w-full h-32 object-cover opacity-30"
                />
              ) : (
                <div className="w-full h-32" />
              )}

              {/* Logo and Name */}
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-4">
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.name}
                    className="w-16 h-16 rounded-lg border-2 border-white object-cover bg-white"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg border-2 border-white bg-white/50 flex items-center justify-center text-2xl font-bold text-white">
                    {store.name.charAt(0)}
                  </div>
                )}
                <div className="pb-1">
                  <h2 className="text-xl font-bold text-white drop-shadow">{store.name}</h2>
                  {store.address && (
                    <p className="text-sm text-white/80">{store.address}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Store Content */}
            <div className="p-4">
              {/* Category Pills */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <button className="px-4 py-1.5 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: store.primary_color }}>
                  Tous
                </button>
                <button className="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 hover:bg-gray-50">
                  Catégorie 1
                </button>
                <button className="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 hover:bg-gray-50">
                  Catégorie 2
                </button>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {products.length > 0 ? (
                  products.map((product) => (
                    <div key={product.id} className="group cursor-pointer">
                      <div className="aspect-square rounded-lg bg-gray-100 overflow-hidden mb-2">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-3xl">📦</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-sm font-bold" style={{ color: store.primary_color }}>
                        {product.price.toLocaleString()} {store.currency}
                      </p>
                    </div>
                  ))
                ) : (
                  // Demo products
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="group cursor-pointer">
                      <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                        <span className="text-3xl opacity-50">
                          {['📦', '🛍️', '👕', '👟'][i]}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-2">Produit {i + 1}</p>
                      <p className="text-sm font-bold" style={{ color: store.primary_color }}>
                        {((i + 1) * 5000).toLocaleString()} {store.currency}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Store Footer */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    {store.contact_phone && (
                      <span>{store.contact_phone}</span>
                    )}
                    {store.contact_email && (
                      <span>{store.contact_email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {store.whatsapp_number && (
                      <span className="text-green-600">WhatsApp</span>
                    )}
                    {store.facebook_url && (
                      <span className="text-blue-600">Facebook</span>
                    )}
                    {store.instagram_url && (
                      <span className="text-pink-600">Instagram</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Store Info */}
      <div className="px-4 py-3 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-[var(--text-secondary)]">
            <span className={store.is_active ? 'text-green-600' : 'text-red-600'}>
              {store.is_active ? '● Active' : '○ Inactive'}
            </span>
            <span>Devise: {store.currency}</span>
            <span>Langue: {store.language}</span>
          </div>
          <div className="flex items-center gap-2">
            {store.delivery_enabled && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                Livraison
              </span>
            )}
            {store.pickup_enabled && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                Retrait
              </span>
            )}
            {store.cinetpay_enabled && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                CinetPay
              </span>
            )}
            {store.paystack_enabled && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                Paystack
              </span>
            )}
            {store.mpesa_enabled && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                M-Pesa
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
