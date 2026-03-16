import { useEffect, useState, useRef } from 'react'
import { Search, Trash2, Plus, Minus, CreditCard, Smartphone, Banknote, Check } from 'lucide-react'
import api from '../../lib/api'
import { useCartStore } from '../../store/cart'
import toast from 'react-hot-toast'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n * 100) / 100)

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
      if (r.data.length > 0) { setSelectedStore(r.data[0].id); cart.setStore(r.data[0].id) }
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
    } catch { toast.error(`Produit introuvable: ${code}`) }
  }

  const processSale = async () => {
    if (cart.items.length === 0) { toast.error('Panier vide'); return }
    if (!selectedStore) { toast.error('Sélectionnez un magasin'); return }
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
    } finally { setProcessing(false) }
  }

  const totalWithDiscount = Math.max(0, cart.total() - discount)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, height: 'calc(100vh - 96px)' }}>
      {/* LEFT: Product catalog */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Store selector */}
          <select value={selectedStore || ''} onChange={e => { const v = +e.target.value; setSelectedStore(v); cart.setStore(v) }} style={{ minWidth: 160 }}>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {/* Search / Barcode */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
            <input
              ref={barcodeRef}
              placeholder="Rechercher ou scanner code-barres..."
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') lookupBarcode((e.target as HTMLInputElement).value) }}
              style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Products grid */}
        <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, alignContent: 'start' }}>
          {products.map(p => (
            <button key={p.id} onClick={() => cart.addItem(p)} style={{
              background: 'var(--color-background-primary)',
              border: `0.5px solid ${p.is_low_stock ? 'var(--color-border-warning)' : 'var(--color-border-tertiary)'}`,
              borderRadius: 'var(--border-radius-md)',
              padding: '12px', textAlign: 'left', cursor: 'pointer',
              transition: 'background .15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-background-primary)')}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              {p.category && <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{p.category}</div>}
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{fmt(p.sell_price)} XOF</div>
              <div style={{ fontSize: 10, color: p.is_low_stock ? 'var(--color-text-warning)' : 'var(--color-text-secondary)', marginTop: 2 }}>
                Stock: {fmt(p.stock_quantity)} {p.unit}
              </div>
            </button>
          ))}
          {products.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              Aucun produit trouvé
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart + Checkout */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontWeight: 500, fontSize: 14 }}>
          Panier ({cart.items.length} article{cart.items.length !== 1 ? 's' : ''})
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {cart.items.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              Scannez ou cliquez sur un produit
            </div>
          ) : cart.items.map(item => (
            <div key={item.product_id} style={{ padding: '8px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500, flex: 1, paddingRight: 8 }}>{item.name}</span>
                <button onClick={() => cart.removeItem(item.product_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 2 }}>
                  <Trash2 size={12} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => cart.updateQty(item.product_id, item.quantity - 1)} style={{ border: '0.5px solid var(--color-border-secondary)', background: 'none', cursor: 'pointer', borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Minus size={10} />
                  </button>
                  <span style={{ fontSize: 13, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => cart.updateQty(item.product_id, item.quantity + 1)} style={{ border: '0.5px solid var(--color-border-secondary)', background: 'none', cursor: 'pointer', borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={10} />
                  </button>
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{fmt(item.line_total)} XOF</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            <span>Sous-total</span><span>{fmt(cart.subtotal())} XOF</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            <span>TVA</span><span>{fmt(cart.tax())} XOF</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Remise</label>
            <input type="number" min="0" value={discount} onChange={e => setDiscount(+e.target.value)} style={{ width: 80 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 500, paddingTop: 8, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
            <span>Total</span><span>{fmt(totalWithDiscount)} XOF</span>
          </div>
        </div>

        {/* Payment method */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Mode de paiement</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'CASH', icon: Banknote, label: 'Espèces' },
              { key: 'MOBILE_MONEY', icon: Smartphone, label: 'Mobile' },
              { key: 'CARD', icon: CreditCard, label: 'Carte' },
            ].map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setPaymentMethod(key as any)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '8px 4px', borderRadius: 'var(--border-radius-md)',
                border: paymentMethod === key ? '1.5px solid var(--color-border-info)' : '0.5px solid var(--color-border-secondary)',
                background: paymentMethod === key ? 'var(--color-background-info)' : 'none',
                cursor: 'pointer', fontSize: 10, color: paymentMethod === key ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
              }}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div style={{ padding: '0 16px 16px' }}>
          <button onClick={processSale} disabled={processing || cart.items.length === 0} style={{
            width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
            background: cart.items.length === 0 ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
          }}>
            <Check size={16} />
            {processing ? 'Traitement...' : `Encaisser ${fmt(totalWithDiscount)} XOF`}
          </button>
          {cart.items.length > 0 && (
            <button onClick={() => { cart.clear(); setDiscount(0) }} style={{ width: '100%', marginTop: 6, padding: '8px', fontSize: 12, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Vider le panier
            </button>
          )}
        </div>

        {/* Last sale confirmation */}
        {lastSale && (
          <div style={{ margin: '0 16px 16px', padding: '10px 12px', background: 'var(--color-background-success)', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-success)' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-success)' }}>Vente enregistrée</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-success)' }}>{lastSale.sale_number} — {fmt(lastSale.total_amount)} XOF</div>
          </div>
        )}
      </div>
    </div>
  )
}
