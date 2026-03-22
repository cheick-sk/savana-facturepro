'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, ShoppingCart, Package, BarChart3, Warehouse, Clock, Users,
  Plus, Minus, X, Search, CheckCircle, CreditCard, Smartphone, Banknote
} from 'lucide-react'

// Demo Products Data
const products = [
  { id: 1, name: 'Riz Golden 5kg', price: 5500, stock: 100, barcode: '123456', category: 'Alimentation', emoji: '🍚' },
  { id: 2, name: 'Huile Végétale 1L', price: 2500, stock: 50, barcode: '234567', category: 'Alimentation', emoji: '🫒' },
  { id: 3, name: 'Sucre Blanc 1kg', price: 1500, stock: 75, barcode: '345678', category: 'Alimentation', emoji: '🧂' },
  { id: 4, name: 'Farine de Blé 2kg', price: 2000, stock: 60, category: 'Alimentation', emoji: '🌾' },
  { id: 5, name: 'Pâtes Spaghetti 500g', price: 1200, stock: 120, category: 'Alimentation', emoji: '🍝' },
  { id: 6, name: 'Tomate Concentrée', price: 800, stock: 90, category: 'Alimentation', emoji: '🍅' },
  { id: 7, name: 'Savon Liquide 500ml', price: 1800, stock: 60, category: 'Hygiène', emoji: '🧴' },
  { id: 8, name: 'Dentifrice Menthe', price: 1200, stock: 40, category: 'Hygiène', emoji: '🦷' },
  { id: 9, name: 'Shampooing 250ml', price: 3500, stock: 35, category: 'Hygiène', emoji: '🧴' },
  { id: 10, name: 'Gel Douche 400ml', price: 2800, stock: 45, category: 'Hygiène', emoji: '🚿' },
  { id: 11, name: 'Cahier 100 pages', price: 500, stock: 200, category: 'Papeterie', emoji: '📓' },
  { id: 12, name: 'Stylo Bic (lot de 5)', price: 1000, stock: 150, category: 'Papeterie', emoji: '🖊️' },
  { id: 13, name: 'Crayons Couleurs', price: 2500, stock: 80, category: 'Papeterie', emoji: '🖍️' },
  { id: 14, name: 'Cahier Dessin A4', price: 1500, stock: 60, category: 'Papeterie', emoji: '🎨' },
  { id: 15, name: 'Eau Minérale 1.5L', price: 1000, stock: 150, category: 'Boissons', emoji: '💧' },
  { id: 16, name: 'Jus d\'Orange 1L', price: 2500, stock: 70, category: 'Boissons', emoji: '🍊' },
  { id: 17, name: 'Coca-Cola 33cl', price: 800, stock: 200, category: 'Boissons', emoji: '🥤' },
  { id: 18, name: 'Café Instantané 200g', price: 4000, stock: 50, category: 'Boissons', emoji: '☕' },
]

const categories = ['Tous', 'Alimentation', 'Hygiène', 'Papeterie', 'Boissons']

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  emoji: string
}

export default function POSDemo() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tous')
  const [showPayment, setShowPayment] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search)
    const matchesCategory = selectedCategory === 'Tous' || p.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addToCart = (product: typeof products[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, emoji: product.emoji }]
    })
  }

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta
          if (newQty <= 0) return null as unknown as CartItem
          return { ...item, quantity: newQty }
        }
        return item
      }).filter(Boolean)
    })
  }

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const clearCart = () => setCart([])

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = Math.round(subtotal * 0.18)
  const total = subtotal + tax
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' XOF'
  }

  const handlePayment = () => {
    if (!selectedPayment) return
    setPaymentSuccess(true)
    setTimeout(() => {
      setPaymentSuccess(false)
      setShowPayment(false)
      clearCart()
      setSelectedPayment(null)
    }, 2000)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-br from-green-600 via-green-700 to-emerald-700 text-white flex flex-col relative">
        <div className="absolute inset-0 backdrop-blur-xl bg-white/5 rounded-r-3xl" />
        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <div className="font-semibold text-white text-lg">SavanaFlow</div>
                <div className="text-xs text-white/60">POS Africa</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {[
              { icon: Home, label: 'Tableau de bord', active: false },
              { icon: ShoppingCart, label: 'Caisse', active: true },
              { icon: Package, label: 'Produits', active: false },
              { icon: Warehouse, label: 'Stock', active: false },
              { icon: Clock, label: 'Shifts', active: false },
              { icon: Users, label: 'Loyauté', active: false },
              { icon: BarChart3, label: 'Rapports', active: false },
            ].map(({ icon: Icon, label, active }) => (
              <button
                key={label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-colors ${
                  active
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </nav>

          {/* User */}
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-medium">AD</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Admin User</div>
                <div className="text-xs text-white/60">admin@savanaflow.africa</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Point de Vente</h1>
              <p className="text-sm text-gray-500">Gérez vos ventes en temps réel</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                En ligne
              </span>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-medium">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* POS Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Products Section */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Search & Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un produit ou scanner un code-barres..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/50 text-gray-900"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat === 'Tous' ? '📦' : cat === 'Alimentation' ? '🍚' : cat === 'Hygiène' ? '🧴' : cat === 'Papeterie' ? '📝' : '🥤'} {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              {filteredProducts.map((product, index) => (
                <motion.button
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => addToCart(product)}
                  className="bg-white rounded-xl p-4 border border-gray-100 hover:border-green-300 hover:shadow-lg transition-all text-left group"
                >
                  <div className="text-4xl mb-3 text-center">{product.emoji}</div>
                  <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1 min-h-[40px]">{product.name}</h3>
                  <p className="text-green-600 text-lg font-bold">{formatPrice(product.price)}</p>
                  {product.stock < 10 && (
                    <span className="text-xs text-red-500 font-medium">Stock: {product.stock}</span>
                  )}
                  <div className="mt-2 text-xs text-green-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <Plus className="w-3 h-3" />
                    Ajouter au panier
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </div>

          {/* Cart Sidebar */}
          <div className="w-96 bg-white border-l border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-green-500" />
                  Panier
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{itemCount}</span>
                </h2>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-xs text-gray-500 hover:text-red-500 transition-colors">
                    Vider
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <ShoppingCart className="w-16 h-16 mb-3 opacity-50" />
                  <p className="text-sm">Panier vide</p>
                  <p className="text-xs text-gray-300 mt-1">Cliquez sur un produit pour l&apos;ajouter</p>
                </div>
              ) : (
                <AnimatePresence>
                  {cart.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="bg-gray-50 rounded-xl p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-2xl">{item.emoji}</span>
                        <button onClick={() => removeFromCart(item.id)} className="p-1 hover:bg-red-100 rounded-lg transition-colors text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-gray-500 mb-2">{formatPrice(item.price)}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 transition-colors text-sm">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 transition-colors text-sm">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-semibold text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Cart Footer */}
            <div className="p-4 border-t border-gray-100 space-y-4 bg-gray-50/50">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sous-total</span>
                  <span className="text-gray-700">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">TVA (18%)</span>
                  <span className="text-gray-700">{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="text-green-600">{formatPrice(total)}</span>
                </div>
              </div>
              <button
                onClick={() => setShowPayment(true)}
                disabled={cart.length === 0}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-5 h-5" />
                Paiement
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setShowPayment(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                {paymentSuccess ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Paiement confirmé !</h3>
                    <p className="text-gray-500">Merci pour votre achat</p>
                  </motion.div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-gray-900">Paiement</h3>
                      <button onClick={() => setShowPayment(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>

                    <p className="text-sm text-gray-500 mb-4">Sélectionnez le mode de paiement</p>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {[
                        { id: 'cash', icon: Banknote, emoji: '💵', label: 'Espèces', color: 'green' },
                        { id: 'mobile', icon: Smartphone, emoji: '📱', label: 'Mobile', color: 'purple' },
                        { id: 'card', icon: CreditCard, emoji: '💳', label: 'Carte', color: 'blue' },
                      ].map(({ id, emoji, label, color }) => (
                        <button
                          key={id}
                          onClick={() => setSelectedPayment(id)}
                          className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            selectedPayment === id
                              ? `border-${color}-500 bg-${color}-50`
                              : 'border-transparent bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          <span className="text-2xl">{emoji}</span>
                          <span className="text-sm font-medium text-gray-700">{label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Montant à payer</span>
                        <span className="text-2xl font-bold text-gray-900">{formatPrice(total)}</span>
                      </div>
                    </div>

                    <button
                      onClick={handlePayment}
                      disabled={!selectedPayment}
                      className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Confirmer le paiement
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
