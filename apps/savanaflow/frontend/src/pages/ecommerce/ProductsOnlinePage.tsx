import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Package, Plus, Search, Filter, MoreVertical, 
  Edit, Trash2, Eye, EyeOff, RefreshCw, Upload
} from 'lucide-react'
import { useEcommerceStore, OnlineProduct } from '../../store/ecommerce'
import toast from 'react-hot-toast'

export default function ProductsOnlinePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const storeId = Number(searchParams.get('store'))

  const { 
    products, categories, fetchProducts, fetchCategories, 
    updateProduct, unpublishProduct, syncStock, loading 
  } = useEcommerceStore()

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [showPublished, setShowPublished] = useState<boolean | null>(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])

  useEffect(() => {
    if (storeId) {
      fetchCategories(storeId)
      loadProducts()
    }
  }, [storeId, page, selectedCategory, showPublished])

  const loadProducts = async () => {
    if (!storeId) return
    const result = await fetchProducts({
      online_store_id: storeId,
      is_published: showPublished ?? undefined,
      category_id: selectedCategory ?? undefined,
      search: search || undefined,
      page,
      per_page: 20,
    })
    setTotal(result.total)
  }

  const handleSearch = () => {
    setPage(1)
    loadProducts()
  }

  const handleTogglePublish = async (product: OnlineProduct) => {
    try {
      await updateProduct(product.id, { is_published: !product.is_published })
      toast.success(product.is_published ? 'Produit dépublié' : 'Produit publié')
      loadProducts()
    } catch (err) {
      toast.error('Erreur lors de la modification')
    }
  }

  const handleDelete = async (product: OnlineProduct) => {
    if (!confirm('Dépublier ce produit ?')) return
    try {
      await unpublishProduct(product.id)
      toast.success('Produit dépublié')
      loadProducts()
    } catch (err) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleSyncStock = async () => {
    try {
      const result = await syncStock(storeId)
      toast.success(`${result.updated} produits synchronisés`)
      loadProducts()
    } catch (err) {
      toast.error('Erreur lors de la synchronisation')
    }
  }

  const toggleSelect = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map(p => p.id))
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Produits en ligne</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {total} produit{total > 1 ? 's' : ''} publié{total > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncStock}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Sync. stock</span>
          </button>
          <button
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Publier un produit</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-3 py-2 border border-[var(--border-light)] rounded-lg"
            />
          </div>

          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-[var(--border-light)] rounded-lg"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={showPublished === null ? '' : showPublished ? 'published' : 'unpublished'}
            onChange={(e) => {
              if (e.target.value === '') setShowPublished(null)
              else setShowPublished(e.target.value === 'published')
            }}
            className="px-3 py-2 border border-[var(--border-light)] rounded-lg"
          >
            <option value="">Tous</option>
            <option value="published">Publiés</option>
            <option value="unpublished">Non publiés</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-secondary)]">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === products.length && products.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                  Produit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                  Prix
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                  Catégorie
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                    Aucun produit trouvé
                  </td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id} className="hover:bg-[var(--bg-secondary)]">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="w-4 h-4 rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] overflow-hidden">
                          {product.main_image_url ? (
                            <img src={product.main_image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 m-auto text-[var(--text-tertiary)]" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {product.online_name || `Produit #${product.product_id}`}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {product.is_featured && <span className="text-amber-600 mr-1">★ Vedette</span>}
                            {product.is_new && <span className="text-blue-600 mr-1">Nouveau</span>}
                            {product.is_on_sale && <span className="text-red-600">Promo</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {product.is_on_sale && product.sale_price ? (
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {Number(product.sale_price).toLocaleString()} XOF
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)] line-through">
                            {Number(product.online_price).toLocaleString()} XOF
                          </p>
                        </div>
                      ) : (
                        <p className="font-medium text-[var(--text-primary)]">
                          {Number(product.online_price || 0).toLocaleString()} XOF
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 ${
                        product.stock_quantity <= 0 ? 'text-red-600' :
                        product.stock_quantity <= product.low_stock_threshold ? 'text-amber-600' :
                        'text-[var(--text-primary)]'
                      }`}>
                        {product.stock_quantity <= 0 && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {categories.find(c => c.id === product.online_category_id)?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        product.is_published 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {product.is_published ? 'Publié' : 'Brouillon'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleTogglePublish(product)}
                          className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg"
                          title={product.is_published ? 'Dépublier' : 'Publier'}
                        >
                          {product.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"
                          title="Dépublier"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-4 py-3 border-t border-[var(--border-light)] flex items-center justify-between">
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
      </div>
    </div>
  )
}
