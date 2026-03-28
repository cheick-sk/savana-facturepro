import { useState } from 'react'
import { X, Upload, Image, DollarSign, Tag, Eye, EyeOff } from 'lucide-react'
import { useEcommerceStore, OnlineCategory } from '../../store/ecommerce'
import toast from 'react-hot-toast'

interface ProductPublishFormProps {
  storeId: number
  categories: OnlineCategory[]
  product?: {
    id: number
    name: string
    description?: string
    price: number
    stock_quantity: number
    barcode?: string
  }
  onClose: () => void
  onSuccess: () => void
}

export default function ProductPublishForm({
  storeId,
  categories,
  product,
  onClose,
  onSuccess,
}: ProductPublishFormProps) {
  const { publishProduct, loading } = useEcommerceStore()
  
  const [formData, setFormData] = useState({
    product_id: product?.id || 0,
    online_store_id: storeId,
    online_name: product?.name || '',
    online_description: product?.description || '',
    online_price: product?.price || 0,
    images: [] as string[],
    main_image_url: '',
    online_category_id: null as number | null,
    tags: [] as string[],
    slug: product?.name?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') || '',
    sync_stock: true,
    stock_quantity: product?.stock_quantity || 0,
    is_published: true,
    is_featured: false,
    is_new: true,
    is_on_sale: false,
    sale_price: null as number | null,
  })

  const [tagInput, setTagInput] = useState('')
  const [imageUrlInput, setImageUrlInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.product_id) {
      toast.error('Veuillez sélectionner un produit')
      return
    }

    try {
      await publishProduct({
        ...formData,
        online_category_id: formData.online_category_id || undefined,
        sale_price: formData.is_on_sale ? formData.sale_price : undefined,
      })
      toast.success('Produit publié avec succès')
      onSuccess()
    } catch (err) {
      toast.error('Erreur lors de la publication')
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const handleAddImage = () => {
    if (imageUrlInput.trim() && !formData.images.includes(imageUrlInput.trim())) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageUrlInput.trim()],
        main_image_url: prev.main_image_url || imageUrlInput.trim()
      }))
      setImageUrlInput('')
    }
  }

  const handleRemoveImage = (url: string) => {
    setFormData(prev => ({
      ...prev,
        images: prev.images.filter(i => i !== url),
      main_image_url: prev.main_image_url === url ? prev.images[0] || '' : prev.main_image_url
    }))
  }

  const handleSetMainImage = (url: string) => {
    setFormData(prev => ({
      ...prev,
      main_image_url: url
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-primary)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-light)] flex items-center justify-between sticky top-0 bg-[var(--bg-primary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {product ? `Publier: ${product.name}` : 'Publier un produit'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Selection (if not provided) */}
          {!product && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                ID Produit *
              </label>
              <input
                type="number"
                value={formData.product_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, product_id: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                required
              />
            </div>
          )}

          {/* Online Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Nom en ligne
            </label>
            <input
              type="text"
              value={formData.online_name}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                online_name: e.target.value,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
              }))}
              className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
              placeholder="Laisser vide pour utiliser le nom du produit"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Description en ligne
            </label>
            <textarea
              value={formData.online_description}
              onChange={(e) => setFormData(prev => ({ ...prev, online_description: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
              rows={3}
              placeholder="Description pour la boutique en ligne"
            />
          </div>

          {/* Price & Sale */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Prix en ligne
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <input
                  type="number"
                  value={formData.online_price || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, online_price: Number(e.target.value) }))}
                  className="w-full pl-9 pr-3 py-2 border border-[var(--border-light)] rounded-lg"
                  placeholder="Prix par défaut"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Slug URL
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
              />
            </div>
          </div>

          {/* Sale Price */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_on_sale}
                onChange={(e) => setFormData(prev => ({ ...prev, is_on_sale: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-[var(--text-primary)]">En promotion</span>
            </label>
            {formData.is_on_sale && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Prix promotionnel
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    type="number"
                    value={formData.sale_price || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, sale_price: Number(e.target.value) }))}
                    className="w-full pl-9 pr-3 py-2 border border-[var(--border-light)] rounded-lg"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Catégorie
            </label>
            <select
              value={formData.online_category_id || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                online_category_id: e.target.value ? Number(e.target.value) : null 
              }))}
              className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
            >
              <option value="">Sans catégorie</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Images
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-[var(--border-light)] rounded-lg"
                placeholder="URL de l'image"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg hover:bg-[var(--bg-tertiary)]"
              >
                <Upload size={16} />
              </button>
            </div>
            {formData.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {formData.images.map((url, idx) => (
                  <div
                    key={idx}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                      formData.main_image_url === url ? 'border-emerald-500' : 'border-transparent'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(url)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                    >
                      <X size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetMainImage(url)}
                      className="absolute bottom-1 left-1 right-1 px-1 py-0.5 bg-black/50 text-white text-xs rounded text-center"
                    >
                      {formData.main_image_url === url ? 'Principale' : 'Définir principale'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-3 py-2 border border-[var(--border-light)] rounded-lg"
                placeholder="Ajouter un tag"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg hover:bg-[var(--bg-tertiary)]"
              >
                <Tag size={16} />
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--bg-secondary)] rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-[var(--text-tertiary)] hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stock Sync */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.sync_stock}
                onChange={(e) => setFormData(prev => ({ ...prev, sync_stock: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-[var(--text-primary)]">Synchroniser le stock avec le POS</span>
            </label>
            
            {!formData.sync_stock && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Quantité en stock
                </label>
                <input
                  type="number"
                  value={formData.stock_quantity || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: Number(e.target.value) }))}
                  className="w-32 px-3 py-2 border border-[var(--border-light)] rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Featured / New */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-[var(--text-primary)]">⭐ Produit vedette</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_new}
                onChange={(e) => setFormData(prev => ({ ...prev, is_new: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-[var(--text-primary)]">✨ Nouveau</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[var(--border-light)]">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, is_published: false }))}
              className="flex-1 px-4 py-2 border border-[var(--border-light)] rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center gap-2"
            >
              <EyeOff size={16} />
              Enregistrer brouillon
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <Eye size={16} />
              Publier
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
