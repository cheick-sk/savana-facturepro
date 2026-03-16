import { create } from 'zustand'

export interface CartItem {
  product_id: number
  name: string
  barcode: string | null
  unit_price: number
  quantity: number
  tax_rate: number
  line_total: number
}

interface CartState {
  items: CartItem[]
  storeId: number | null
  setStore: (id: number) => void
  addItem: (product: any, qty?: number) => void
  updateQty: (product_id: number, qty: number) => void
  removeItem: (product_id: number) => void
  clear: () => void
  subtotal: () => number
  tax: () => number
  total: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  storeId: null,

  setStore: (id) => set({ storeId: id, items: [] }),

  addItem: (product, qty = 1) => {
    const items = get().items
    const existing = items.find(i => i.product_id === product.id)
    if (existing) {
      set({ items: items.map(i =>
        i.product_id === product.id
          ? { ...i, quantity: i.quantity + qty, line_total: (i.quantity + qty) * i.unit_price }
          : i
      )})
    } else {
      set({ items: [...items, {
        product_id: product.id,
        name: product.name,
        barcode: product.barcode,
        unit_price: product.sell_price,
        quantity: qty,
        tax_rate: product.tax_rate,
        line_total: qty * product.sell_price,
      }]})
    }
  },

  updateQty: (product_id, qty) => {
    if (qty <= 0) { get().removeItem(product_id); return }
    set({ items: get().items.map(i =>
      i.product_id === product_id ? { ...i, quantity: qty, line_total: qty * i.unit_price } : i
    )})
  },

  removeItem: (product_id) => set({ items: get().items.filter(i => i.product_id !== product_id) }),

  clear: () => set({ items: [] }),

  subtotal: () => get().items.reduce((s, i) => s + i.quantity * i.unit_price, 0),
  tax: () => get().items.reduce((s, i) => s + i.quantity * i.unit_price * i.tax_rate / 100, 0),
  total: () => {
    const s = get().subtotal()
    const t = get().tax()
    return Math.round((s + t) * 100) / 100
  },
}))
