import { useEffect, useState } from 'react'
import { Plus, ArrowUp, ArrowDown, RotateCcw, Package, AlertTriangle, Filter } from 'lucide-react'
import api from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal, ModalFooter } from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const formatNumber = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n * 100) / 100)

export default function StockPage() {
  const [movements, setMovements] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [form, setForm] = useState({
    product_id: '',
    movement_type: 'IN',
    quantity: '1',
    reason: '',
    reference: ''
  })

  const loadMovements = () =>
    api.get('/stock/movements', { params: { size: 50 } }).then(r => setMovements(r.data.items || []))

  const loadProducts = () =>
    api.get('/products', { params: { size: 100, low_stock: lowStockOnly } }).then(r => setProducts(r.data.items || []))

  useEffect(() => {
    loadMovements()
    loadProducts()
  }, [lowStockOnly])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/stock/adjust', {
        ...form,
        product_id: +form.product_id,
        quantity: +form.quantity
      })
      toast.success('Mouvement enregistré')
      setShowForm(false)
      setForm({ product_id: '', movement_type: 'IN', quantity: '1', reason: '', reference: '' })
      loadMovements()
      loadProducts()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur')
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <ArrowUp className="w-4 h-4 text-green-500" />
      case 'OUT':
        return <ArrowDown className="w-4 h-4 text-red-500" />
      default:
        return <RotateCcw className="w-4 h-4 text-gray-400" />
    }
  }

  const lowStockProducts = products.filter(p => p.is_low_stock)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            Gestion du stock
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Mouvements et niveaux de stock
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} icon={<Plus className="w-4 h-4" />}>
          Nouveau mouvement
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Levels */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Niveaux de stock</h2>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={e => setLowStockOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-secondary-500 focus:ring-secondary-500"
                />
                Stocks faibles
              </label>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              <AnimatePresence mode="popLayout">
                {products.slice(0, 15).map((p, index) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{p.category || 'Sans catégorie'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${p.is_low_stock ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                        {formatNumber(p.stock_quantity)} {p.unit}
                      </p>
                      {p.is_low_stock && (
                        <Badge variant="warning" size="sm">Stock faible</Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {products.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun produit</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Derniers mouvements</h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              <AnimatePresence mode="popLayout">
                {movements.map((m, index) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        m.movement_type === 'IN' ? 'bg-green-50 dark:bg-green-900/20' :
                        m.movement_type === 'OUT' ? 'bg-red-50 dark:bg-red-900/20' :
                        'bg-gray-50 dark:bg-gray-800'
                      }`}>
                        {getMovementIcon(m.movement_type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {m.product?.name || `Produit #${m.product_id}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {m.reason || m.reference || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        m.movement_type === 'IN' ? 'text-green-600 dark:text-green-400' :
                        m.movement_type === 'OUT' ? 'text-red-600 dark:text-red-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {m.movement_type === 'IN' ? '+' : m.movement_type === 'OUT' ? '-' : '='}
                        {formatNumber(m.quantity)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatNumber(m.quantity_before)} → {formatNumber(m.quantity_after)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {movements.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun mouvement</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} size="lg">
        <form onSubmit={submit}>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Nouveau mouvement de stock
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Produit *
                </label>
                <select
                  value={form.product_id}
                  onChange={e => setForm({ ...form, product_id: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary-500/50"
                >
                  <option value="">-- Choisir un produit --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (stock: {formatNumber(p.stock_quantity)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Type de mouvement *
                </label>
                <select
                  value={form.movement_type}
                  onChange={e => setForm({ ...form, movement_type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary-500/50"
                >
                  <option value="IN">Entrée</option>
                  <option value="OUT">Sortie</option>
                  <option value="ADJUST">Ajustement</option>
                </select>
              </div>

              <Input
                label="Quantité *"
                type="number"
                min="0.01"
                step="0.01"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                required
              />

              <Input
                label="Référence"
                value={form.reference}
                onChange={e => setForm({ ...form, reference: e.target.value })}
                placeholder="BL-001"
              />

              <Input
                label="Motif"
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="Réapprovisionnement..."
              />
            </div>
          </CardContent>
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Enregistrer
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
