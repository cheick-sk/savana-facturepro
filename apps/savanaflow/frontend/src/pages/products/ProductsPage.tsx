import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Package, Filter, MoreVertical, Trash2 } from 'lucide-react'
import api from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal, ModalFooter } from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const formatNumber = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
const formatCurrency = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

const EMPTY = {
  store_id: '',
  name: '',
  barcode: '',
  sku: '',
  category: '',
  unit: 'unit',
  sell_price: '',
  cost_price: '0',
  tax_rate: '0',
  stock_quantity: '0',
  low_stock_threshold: '10'
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [stores, setStores] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY)
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/products', { params: { page, size: 20, search: search || undefined } })
      .then(r => {
        setProducts(r.data.items || [])
        setTotal(r.data.total || 0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    api.get('/stores').then(r => setStores(r.data))
  }, [])

  useEffect(() => {
    load()
  }, [page, search])

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p: any) => ({ ...p, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      store_id: +form.store_id,
      sell_price: +form.sell_price,
      cost_price: +form.cost_price,
      tax_rate: +form.tax_rate,
      stock_quantity: +form.stock_quantity,
      low_stock_threshold: +form.low_stock_threshold
    }

    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload)
        toast.success('Produit mis à jour')
      } else {
        await api.post('/products', payload)
        toast.success('Produit créé')
      }
      setShowForm(false)
      setEditing(null)
      setForm(EMPTY)
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur')
    }
  }

  const openEdit = (p: any) => {
    setEditing(p)
    setForm({
      ...p,
      store_id: String(p.store_id),
      sell_price: String(p.sell_price),
      cost_price: String(p.cost_price),
      tax_rate: String(p.tax_rate),
      stock_quantity: String(p.stock_quantity),
      low_stock_threshold: String(p.low_stock_threshold)
    })
    setShowForm(true)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY, store_id: stores[0]?.id || '' })
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            Produits
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gérez votre catalogue de produits
          </p>
        </div>
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
          Nouveau produit
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                placeholder="Rechercher par nom, code-barres ou SKU..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary-500/50"
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4" />
              Filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Produit</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Catégorie</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Code-barres</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Prix</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Stock</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : products.map((p, index) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                          {p.sku && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {p.sku}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {p.category || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-gray-400">
                      {p.barcode || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(p.sell_price)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-medium ${p.is_low_stock ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {formatNumber(p.stock_quantity)} {p.unit}
                      </span>
                      {p.is_low_stock && (
                        <Badge variant="warning" size="sm" className="ml-2">Bas</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={p.is_active ? 'success' : 'default'} dot>
                        {p.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {!loading && products.length === 0 && (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">Aucun produit trouvé</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} produit{total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Précédent
            </Button>
            <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
              Page {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={products.length < 20}
              onClick={() => setPage(p => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      </Card>

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={submit}>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editing ? 'Modifier le produit' : 'Nouveau produit'}
            </h3>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Magasin *
                  </label>
                  <select
                    value={form.store_id}
                    onChange={f('store_id')}
                    required
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary-500/50"
                  >
                    <option value="">-- Choisir --</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <Input label="Nom *" value={form.name} onChange={f('name')} required />
              <Input label="Code-barres" value={form.barcode} onChange={f('barcode')} />
              <Input label="SKU" value={form.sku} onChange={f('sku')} />
              <Input label="Catégorie" value={form.category} onChange={f('category')} />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Unité</label>
                <select
                  value={form.unit}
                  onChange={f('unit')}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary-500/50"
                >
                  <option value="unit">Unité</option>
                  <option value="kg">Kilogramme</option>
                  <option value="g">Gramme</option>
                  <option value="l">Litre</option>
                  <option value="ml">Millilitre</option>
                </select>
              </div>

              <Input label="Prix de vente *" type="number" value={form.sell_price} onChange={f('sell_price')} required />
              <Input label="Prix de coût" type="number" value={form.cost_price} onChange={f('cost_price')} />
              <Input label="TVA (%)" type="number" value={form.tax_rate} onChange={f('tax_rate')} />
              <Input label="Stock initial" type="number" value={form.stock_quantity} onChange={f('stock_quantity')} />
              <Input label="Seuil d'alerte stock" type="number" value={form.low_stock_threshold} onChange={f('low_stock_threshold')} />
            </div>
          </CardContent>
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {editing ? 'Mettre à jour' : 'Créer'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
