import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, ScanBarcode, RefreshCw, Printer, QrCode } from 'lucide-react'
import api from '../../lib/api'
import { useCurrencyStore } from '../../store/currency'
import { formatCurrency } from '../../lib/currency'
import toast from 'react-hot-toast'

const EMPTY = { store_id: '', name: '', barcode: '', sku: '', category: '', unit: 'unit', sell_price: '', cost_price: '0', tax_rate: '0', stock_quantity: '0', low_stock_threshold: '10' }

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [stores, setStores] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY)
  const [generatingBarcode, setGeneratingBarcode] = useState(false)
  
  const currencyStore = useCurrencyStore()
  const activeCurrency = currencyStore.activeCurrency

  const fmt = (n: number) => formatCurrency(n, activeCurrency.code)

  const load = () => {
    api.get('/products', { params: { page, size: 20, search: search || undefined } })
      .then(r => { setProducts(r.data.items); setTotal(r.data.total) })
  }
  useEffect(() => { api.get('/stores').then(r => setStores(r.data)) }, [])
  useEffect(() => { load() }, [page, search])

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p: any) => ({ ...p, [k]: e.target.value }))

  // Générer un code-barres automatiquement
  const generateBarcode = async () => {
    setGeneratingBarcode(true)
    try {
      const { data } = await api.get('/products/barcode/generate')
      setForm((p: any) => ({ ...p, barcode: data.barcode, sku: data.sku }))
      toast.success(`Code-barres généré: ${data.barcode}`)
    } catch {
      toast.error('Erreur lors de la génération du code-barres')
    } finally {
      setGeneratingBarcode(false)
    }
  }

  // Imprimer l'étiquette du produit
  const printLabel = (product: any) => {
    const labelHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Étiquette - ${product.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 10mm; }
          .label { width: 50mm; padding: 3mm; border: 1px solid #000; }
          .name { font-size: 12pt; font-weight: bold; margin-bottom: 2mm; }
          .barcode { font-family: 'Libre Barcode 39', cursive; font-size: 24pt; text-align: center; margin: 2mm 0; }
          .barcode-text { font-size: 8pt; text-align: center; letter-spacing: 2px; }
          .price { font-size: 14pt; font-weight: bold; text-align: right; }
          .sku { font-size: 8pt; color: #666; }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="name">${product.name}</div>
          <div class="barcode">*${product.barcode || 'N/A'}*</div>
          <div class="barcode-text">${product.barcode || 'N/A'}</div>
          <div class="price">${fmt(product.sell_price)}</div>
          ${product.sku ? `<div class="sku">SKU: ${product.sku}</div>` : ''}
        </div>
      </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(labelHTML)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, store_id: +form.store_id, sell_price: +form.sell_price, cost_price: +form.cost_price, tax_rate: +form.tax_rate, stock_quantity: +form.stock_quantity, low_stock_threshold: +form.low_stock_threshold }
    try {
      if (editing) { await api.put(`/products/${editing.id}`, payload); toast.success('Produit mis à jour') }
      else { await api.post('/products', payload); toast.success('Produit créé') }
      setShowForm(false); setEditing(null); setForm(EMPTY); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Erreur') }
  }

  const openEdit = (p: any) => {
    setEditing(p)
    setForm({ ...p, store_id: String(p.store_id), sell_price: String(p.sell_price), cost_price: String(p.cost_price), tax_rate: String(p.tax_rate), stock_quantity: String(p.stock_quantity), low_stock_threshold: String(p.low_stock_threshold) })
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-medium m-0">Produits</h1>
          <p className="text-sm text-gray-500 mt-1 mb-0">{total} produit(s)</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => currencyStore.setActiveCurrency(currencyStore.activeCurrency.code === 'GNF' ? 'XOF' : 'GNF')}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            {currencyStore.activeCurrency.flag} {currencyStore.activeCurrency.code}
          </button>
          <button 
            onClick={() => { setEditing(null); setForm({ ...EMPTY, store_id: stores[0]?.id || '' }); setShowForm(true) }} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={16} /> Nouveau produit
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          placeholder="Rechercher nom, code-barres, SKU..." 
          className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          onChange={e => { setSearch(e.target.value); setPage(1) }} 
        />
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-4 shadow-sm">
          <h3 className="m-0 mb-4 text-base font-medium">{editing ? 'Modifier' : 'Nouveau'} produit</h3>
          <form onSubmit={submit}>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
              {!editing && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Magasin *</label>
                  <select value={form.store_id} onChange={f('store_id')} required className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">-- Choisir --</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              
              {/* Nom */}
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Nom *</label>
                <input type="text" value={form.name} onChange={f('name')} required className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              
              {/* Code-barres avec génération */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Code-barres</label>
                <div className="flex gap-1">
                  <input type="text" value={form.barcode} onChange={f('barcode')} className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono" placeholder="EAN-13" />
                  <button 
                    type="button" 
                    onClick={generateBarcode} 
                    disabled={generatingBarcode}
                    className="px-2 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    title="Générer un code-barres"
                  >
                    <RefreshCw size={16} className={generatingBarcode ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
              
              {/* SKU */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">SKU</label>
                <input type="text" value={form.sku} onChange={f('sku')} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
              </div>
              
              {/* Autres champs */}
              {[
                { k: 'category', label: 'Catégorie' },
                { k: 'unit', label: 'Unité' },
                { k: 'sell_price', label: `Prix vente (${activeCurrency.symbol}) *`, type: 'number', req: true },
                { k: 'cost_price', label: `Prix coût (${activeCurrency.symbol})`, type: 'number' },
                { k: 'tax_rate', label: 'TVA %', type: 'number' },
                { k: 'stock_quantity', label: 'Stock initial', type: 'number' },
                { k: 'low_stock_threshold', label: 'Seuil alerte', type: 'number' },
              ].map(({ k, label, type = 'text', req }) => (
                <div key={k}>
                  <label className="text-xs text-gray-500 block mb-1">{label}</label>
                  <input 
                    type={type as any} 
                    value={form[k]} 
                    onChange={f(k)} 
                    required={req as any} 
                    step={(type === 'number') ? '0.01' : undefined}
                    className="w-full px-3 py-2 border rounded-lg text-sm" 
                  />
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                {editing ? 'Mettre à jour' : 'Créer'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Produit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Catégorie</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Code-barres</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Prix</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Stock</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Statut</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.name}</div>
                  {p.sku && <div className="text-xs text-gray-400">{p.sku}</div>}
                </td>
                <td className="px-4 py-3 text-gray-500">{p.category || '—'}</td>
                <td className="px-4 py-3">
                  {p.barcode ? (
                    <div className="flex items-center gap-2">
                      <QrCode size={14} className="text-gray-400" />
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.barcode}</code>
                    </div>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium">{fmt(p.sell_price)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={p.is_low_stock ? 'text-orange-500 font-medium' : ''}>
                    {p.stock_quantity} {p.unit}
                    {p.is_low_stock && <span className="ml-1 text-xs">⚠️</span>}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {p.barcode && (
                      <button 
                        onClick={() => printLabel(p)} 
                        className="p-1.5 hover:bg-gray-100 rounded-lg" 
                        title="Imprimer étiquette"
                      >
                        <Printer size={14} className="text-gray-500" />
                      </button>
                    )}
                    <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Modifier">
                      <Edit2 size={14} className="text-gray-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <ScanBarcode size={32} className="mx-auto mb-2 opacity-30" />
            <p>Aucun produit trouvé</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
        <span>{total} produit(s)</span>
        <div className="flex gap-2">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Précédent
          </button>
          <span className="px-3 py-1.5">Page {page}</span>
          <button 
            disabled={products.length < 20} 
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  )
}
