import { useEffect, useState } from 'react'
import { 
  Plus, Search, Filter, MoreVertical, Edit2, Trash2, 
  Package, AlertTriangle, CheckCircle, ChevronDown, 
  Grid, List, Download, Upload
} from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface Product {
  id: number
  name: string
  sku: string
  barcode?: string
  category?: string
  sell_price: number
  cost_price: number
  stock_quantity: number
  unit: string
  is_active: boolean
  is_low_stock: boolean
  min_stock_level?: number
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({
    name: '', sku: '', category: '', sell_price: 0, cost_price: 0,
    stock_quantity: 0, unit: 'pièce', min_stock_level: 5
  })

  const categories = ['all', 'Alimentation', 'Boissons', 'Hygiène', 'Ménager', 'Autres']

  useEffect(() => {
    setLoading(true)
    api.get('/products', { params: { size: 100, search: search || undefined } })
      .then(r => setProducts(r.data.items || []))
      .catch(() => toast.error('Erreur lors du chargement'))
      .finally(() => setLoading(false))
  }, [search])

  const filteredProducts = products.filter(p => 
    selectedCategory === 'all' || p.category === selectedCategory
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, form)
        toast.success('Produit mis à jour')
      } else {
        await api.post('/products', form)
        toast.success('Produit créé')
      }
      setShowForm(false)
      setEditingProduct(null)
      setForm({ name: '', sku: '', category: '', sell_price: 0, cost_price: 0, stock_quantity: 0, unit: 'pièce', min_stock_level: 5 })
      api.get('/products', { params: { size: 100 } }).then(r => setProducts(r.data.items || []))
    } catch { toast.error('Erreur lors de la sauvegarde') }
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category || '',
      sell_price: product.sell_price,
      cost_price: product.cost_price,
      stock_quantity: product.stock_quantity,
      unit: product.unit,
      min_stock_level: product.min_stock_level || 5
    })
    setShowForm(true)
  }

  const deleteProduct = async (id: number) => {
    if (!confirm('Supprimer ce produit ?')) return
    try {
      await api.delete(`/products/${id}`)
      toast.success('Produit supprimé')
      setProducts(products.filter(p => p.id !== id))
    } catch { toast.error('Erreur lors de la suppression') }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Produits</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {products.length} produits au total
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="btn-ghost btn-sm">
            <Upload size={16} />
            <span className="hidden sm:inline">Importer</span>
          </button>
          <button className="btn-ghost btn-sm">
            <Download size={16} />
            <span className="hidden sm:inline">Exporter</span>
          </button>
          <button 
            onClick={() => { setEditingProduct(null); setShowForm(true) }}
            className="btn-primary btn-sm"
          >
            <Plus size={16} />
            <span>Nouveau produit</span>
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="card">
        <div className="card-body p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl"
              />
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-4 py-2.5 rounded-xl min-w-[140px]"
              >
                <option value="all">Toutes catégories</option>
                {categories.filter(c => c !== 'all').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl border transition-colors ${showFilters ? 'border-[var(--primary-500)] bg-[var(--primary-50)] text-[var(--primary-600)]' : 'border-[var(--border-default)]'}`}
              >
                <Filter size={18} />
              </button>
              
              <div className="flex items-center border border-[var(--border-default)] rounded-xl overflow-hidden">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 ${viewMode === 'grid' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}
                >
                  <Grid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 ${viewMode === 'list' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-[var(--border-light)] grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slideDown">
              <div>
                <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Prix min</label>
                <input type="number" placeholder="0" className="w-full" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Prix max</label>
                <input type="number" placeholder="∞" className="w-full" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Stock</label>
                <select className="w-full">
                  <option>Tous</option>
                  <option>En stock</option>
                  <option>Stock faible</option>
                  <option>Rupture</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Statut</label>
                <select className="w-full">
                  <option>Tous</option>
                  <option>Actif</option>
                  <option>Inactif</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Products grid/list */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="skeleton h-48 rounded-xl" />
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              className="card group cursor-pointer hover:shadow-lg transition-all hover:border-[var(--primary-300)]"
            >
              <div className="p-4">
                {/* Product image placeholder */}
                <div className="h-32 rounded-lg bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] flex items-center justify-center mb-3 group-hover:from-emerald-50 group-hover:to-teal-50 transition-all">
                  <Package size={32} className="text-[var(--text-tertiary)] group-hover:text-emerald-500 transition-colors" />
                </div>
                
                {/* Product info */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-[var(--text-primary)] line-clamp-2">{product.name}</h3>
                    <div className="flex-shrink-0 relative">
                      <button className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={16} />
                      </button>
                      {/* Dropdown would go here */}
                    </div>
                  </div>
                  
                  {product.category && (
                    <span className="badge badge-primary">{product.category}</span>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-lg font-bold text-emerald-600">
                      {fmt(product.sell_price)} GNF
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${product.is_low_stock ? 'text-amber-600' : 'text-[var(--text-secondary)]'}`}>
                      {product.is_low_stock ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                      {product.stock_quantity} {product.unit}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quick actions on hover */}
              <div className="border-t border-[var(--border-light)] p-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openEdit(product)}
                  className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => deleteProduct(product.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-[var(--text-tertiary)] hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th>Prix d'achat</th>
                  <th>Prix de vente</th>
                  <th>Stock</th>
                  <th>Statut</th>
                  <th className="w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-[var(--bg-secondary)]">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                          <Package size={18} className="text-[var(--text-tertiary)]" />
                        </div>
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">{product.name}</div>
                          <div className="text-xs text-[var(--text-tertiary)]">{product.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {product.category && (
                        <span className="badge badge-primary">{product.category}</span>
                      )}
                    </td>
                    <td>{fmt(product.cost_price)} GNF</td>
                    <td className="font-medium text-emerald-600">{fmt(product.sell_price)} GNF</td>
                    <td>
                      <div className={`flex items-center gap-1 ${product.is_low_stock ? 'text-amber-600' : ''}`}>
                        {product.is_low_stock && <AlertTriangle size={14} />}
                        {product.stock_quantity} {product.unit}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${product.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {product.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openEdit(product)}
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => deleteProduct(product.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-tertiary)] hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredProducts.length === 0 && (
        <div className="empty-state">
          <Package size={64} className="empty-state-icon" />
          <div className="empty-state-title">Aucun produit trouvé</div>
          <div className="empty-state-description">
            {search ? 'Essayez une autre recherche' : 'Commencez par ajouter un produit'}
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="btn-primary mt-4"
          >
            <Plus size={16} />
            Ajouter un produit
          </button>
        </div>
      )}

      {/* Product form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn" onClick={() => setShowForm(false)}>
          <div 
            className="w-full max-w-lg bg-[var(--bg-primary)] rounded-2xl shadow-2xl animate-slideUp overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[var(--border-light)] flex items-center justify-between">
              <h2 className="font-semibold text-lg">
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)]">
                <MoreVertical size={18} />
              </button>
            </div>
            
            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Nom du produit *</label>
                  <input 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    required 
                    placeholder="Ex: Riz 5kg Premium"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">SKU</label>
                  <input 
                    value={form.sku} 
                    onChange={e => setForm({...form, sku: e.target.value})} 
                    placeholder="RIZ-5KG"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Catégorie</label>
                  <select 
                    value={form.category} 
                    onChange={e => setForm({...form, category: e.target.value})}
                  >
                    <option value="">Sélectionner</option>
                    {categories.filter(c => c !== 'all').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Prix d'achat (GNF) *</label>
                  <input 
                    type="number" 
                    value={form.cost_price} 
                    onChange={e => setForm({...form, cost_price: +e.target.value})} 
                    required 
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Prix de vente (GNF) *</label>
                  <input 
                    type="number" 
                    value={form.sell_price} 
                    onChange={e => setForm({...form, sell_price: +e.target.value})} 
                    required 
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Stock initial</label>
                  <input 
                    type="number" 
                    value={form.stock_quantity} 
                    onChange={e => setForm({...form, stock_quantity: +e.target.value})} 
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Unité</label>
                  <select 
                    value={form.unit} 
                    onChange={e => setForm({...form, unit: e.target.value})}
                  >
                    <option value="pièce">Pièce</option>
                    <option value="kg">Kilogramme</option>
                    <option value="litre">Litre</option>
                    <option value="carton">Carton</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Mettre à jour' : 'Créer le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
