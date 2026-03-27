import { useEffect, useState, useRef } from 'react'
import { Search, Trash2, Plus, Minus, CreditCard, Smartphone, Banknote, Check, Package, Barcode, Store } from 'lucide-react'
import api from '../../lib/api'
import { useCartStore } from '../../store/cart'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

const formatNumber = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n * 100) / 100)

export default function POSPage() {
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [stores, setStores] = useState<any[]>([])
  const [selectedStore, setSelectedStore] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'CARD'>('CASH')
  const [discount, setDiscount] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [lastSale, setLastSale] = useState<any>(null)
  const cart = useCartStore()
  const barcodeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get('/stores').then(r => {
      setStores(r.data)
      if (r.data.length > 0) {
        setSelectedStore(r.data[0].id)
        cart.setStore(r.data[0].id)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedStore) return
    api.get('/products', { params: { store_id: selectedStore, size: 50, search: search || undefined } })
      .then(r => setProducts(r.data.items || []))
  }, [selectedStore, search])

  const lookupBarcode = async (code: string) => {
    if (!code.trim()) return
    try {
      const { data } = await api.get(`/products/barcode/${code.trim()}`)
      cart.addItem(data)
      setSearch('')
      if (barcodeRef.current) barcodeRef.current.value = ''
      toast.success(`${data.name} ajouté au panier`)
    } catch {
      toast.error(`Produit introuable: ${code}`)
    }
  }

  const processSale = async () => {
    if (cart.items.length === 0) {
      toast.error('Panier vide')
      return
    }
    if (!selectedStore) {
      toast.error('Sélectionnez un magasin')
      return
    }
    setProcessing(true)
    try {
      const { data } = await api.post('/sales', {
        store_id: selectedStore,
        items: cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        payment_method: paymentMethod,
        discount_amount: discount,
        currency: 'XOF',
      })
      setLastSale(data)
      cart.clear()
      setDiscount(0)
      toast.success(`Vente ${data.sale_number} enregistrée !`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur lors de la vente')
    } finally {
      setProcessing(false)
    }
  }

  const totalWithDiscount = Math.max(0, cart.total() - discount)

  const paymentMethods = [
    { key: 'CASH', icon: Banknote, label: 'Espèces', color: 'from-green-500 to-green-600' },
    { key: 'MOBILE_MONEY', icon: Smartphone, label: 'Mobile', color: 'from-blue-500 to-blue-600' },
    { key: 'CARD', icon: CreditCard, label: 'Carte', color: 'from-purple-500 to-purple-600' },
  ] as const

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-4">
      {/* LEFT: Product catalog */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Store selector */}
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedStore || ''}
              onChange={e => {
                const v = +e.target.value
                setSelectedStore(v)
                cart.setStore(v)
              }}
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary-500/50 min-w-[180px]"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Search / Barcode */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={barcodeRef}
              placeholder="Rechercher un produit ou scanner un code-barres..."
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') lookupBarcode((e.target as HTMLInputElement).value)
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary-500/50"
            />
          </div>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <AnimatePresence mode="popLayout">
              {products.map((p, index) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => cart.addItem(p)}
                  className={`relative bg-white dark:bg-gray-800 rounded-xl p-3 text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border ${
                    p.is_low_stock
                      ? 'border-amber-300 dark:border-amber-700'
                      : 'border-gray-100 dark:border-gray-700'
                  }`}
                >
                  {p.is_low_stock && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="warning" size="sm">Stock bas</Badge>
                    </div>
                  )}
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-3">
                    <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {p.name}
                    </p>
                    {p.category && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{p.category}</p>
                    )}
                    <p className="text-base font-bold text-secondary-600 dark:text-secondary-400">
                      {formatCurrency(p.sell_price)}
                    </p>
                    <p className={`text-xs ${p.is_low_stock ? 'text-amber-600' : 'text-gray-400'}`}>
                      Stock: {formatNumber(p.stock_quantity)} {p.unit}
                    </p>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>

          {products.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Barcode className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Aucun produit trouvé</p>
              <p className="text-sm">Essayez de modifier votre recherche</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart + Checkout */}
      <Card className="w-full lg:w-[380px] flex flex-col overflow-hidden shadow-xl">
        {/* Cart Header */}
        <CardHeader className="bg-gradient-to-r from-secondary-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Panier
            </h2>
            <Badge variant="default" className="bg-white/20 text-white">
              {cart.items.length} article{cart.items.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <Package className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Scannez ou cliquez sur un produit</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              <AnimatePresence mode="popLayout">
                {cart.items.map(item => (
                  <motion.div
                    key={item.product_id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white flex-1 pr-2">
                        {item.name}
                      </span>
                      <button
                        onClick={() => cart.removeItem(item.product_id)}
                        className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => cart.updateQty(item.product_id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => cart.updateQty(item.product_id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.line_total)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-2 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Sous-total</span>
            <span>{formatCurrency(cart.subtotal())}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>TVA (18%)</span>
            <span>{formatCurrency(cart.tax())}</span>
          </div>
          <div className="flex items-center gap-3 py-2">
            <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Remise</label>
            <input
              type="number"
              min="0"
              value={discount}
              onChange={e => setDiscount(+e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500/50"
            />
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
            <span>Total</span>
            <span className="text-secondary-600 dark:text-secondary-400">{formatCurrency(totalWithDiscount)}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Mode de paiement</p>
          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map(({ key, icon: Icon, label, color }) => (
              <button
                key={key}
                onClick={() => setPaymentMethod(key)}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${
                  paymentMethod === key
                    ? `border-transparent bg-gradient-to-br ${color} text-white`
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-secondary-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="p-4 space-y-2">
          <Button
            onClick={processSale}
            disabled={processing || cart.items.length === 0}
            className="w-full"
            size="lg"
            variant={cart.items.length === 0 ? 'ghost' : 'secondary'}
          >
            <Check className="w-5 h-5" />
            {processing ? 'Traitement...' : `Encaisser ${formatCurrency(totalWithDiscount)}`}
          </Button>
          {cart.items.length > 0 && (
            <button
              onClick={() => {
                cart.clear()
                setDiscount(0)
              }}
              className="w-full py-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              Vider le panier
            </button>
          )}
        </div>

        {/* Last sale confirmation */}
        <AnimatePresence>
          {lastSale && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mx-4 mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800"
            >
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Vente enregistrée</span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {lastSale.sale_number} — {formatCurrency(lastSale.total_amount)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}
