import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCartStore } from '../store/cart'

describe('Cart Store - SavanaFlow POS', () => {
  beforeEach(() => {
    // Reset cart before each test
    useCartStore.setState({
      items: [],
      storeId: null,
    })
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have empty cart initially', () => {
      const state = useCartStore.getState()

      expect(state.items).toEqual([])
      expect(state.storeId).toBeNull()
    })
  })

  describe('Store Management', () => {
    it('should set store ID', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.setStore(1)
      })

      expect(result.current.storeId).toBe(1)
    })

    it('should clear items when store changes', () => {
      const { result } = renderHook(() => useCartStore())

      // Add an item first
      act(() => {
        result.current.addItem({
          id: 1,
          name: 'Product 1',
          sell_price: 5000,
          tax_rate: 0,
        })
      })
      expect(result.current.items).toHaveLength(1)

      // Change store - should clear items
      act(() => {
        result.current.setStore(2)
      })

      expect(result.current.items).toHaveLength(0)
      expect(result.current.storeId).toBe(2)
    })
  })

  describe('Add to Cart', () => {
    it('should add item to cart', () => {
      const { result } = renderHook(() => useCartStore())
      const product = {
        id: 1,
        name: 'Product 1',
        sell_price: 5000,
        barcode: '123456789',
        tax_rate: 0,
      }

      act(() => {
        result.current.addItem(product)
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].name).toBe('Product 1')
      expect(result.current.items[0].unit_price).toBe(5000)
    })

    it('should increase quantity when adding existing product', () => {
      const { result } = renderHook(() => useCartStore())
      const product = {
        id: 1,
        name: 'Product 1',
        sell_price: 5000,
        barcode: '123456789',
        tax_rate: 0,
      }

      act(() => {
        result.current.addItem(product)
        result.current.addItem(product)
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].quantity).toBe(2)
    })

    it('should add multiple different products', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', sell_price: 5000, tax_rate: 0 })
        result.current.addItem({ id: 2, name: 'Product 2', sell_price: 10000, tax_rate: 0 })
      })

      expect(result.current.items).toHaveLength(2)
    })

    it('should calculate line total correctly', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', sell_price: 5000, tax_rate: 0 }, 2)
      })

      expect(result.current.items[0].line_total).toBe(10000)
    })
  })

  describe('Remove from Cart', () => {
    it('should remove item from cart', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', sell_price: 5000, tax_rate: 0 })
      })
      expect(result.current.items).toHaveLength(1)

      act(() => {
        result.current.removeItem(1)
      })
      expect(result.current.items).toHaveLength(0)
    })

    it('should handle removing non-existent item', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', sell_price: 5000, tax_rate: 0 })
        result.current.removeItem(999)
      })

      expect(result.current.items).toHaveLength(1)
    })
  })

  describe('Update Quantity', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', sell_price: 5000, tax_rate: 0 })
      })

      act(() => {
        result.current.updateQty(1, 5)
      })

      expect(result.current.items[0].quantity).toBe(5)
    })

    it('should remove item when quantity is 0', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', sell_price: 5000, tax_rate: 0 })
      })

      act(() => {
        result.current.updateQty(1, 0)
      })

      expect(result.current.items).toHaveLength(0)
    })

    it('should remove item when quantity is negative', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', sell_price: 5000, tax_rate: 0 })
      })

      act(() => {
        result.current.updateQty(1, -1)
      })

      expect(result.current.items).toHaveLength(0)
    })
  })

  describe('Cart Totals', () => {
    it('should calculate subtotal correctly', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', sell_price: 5000, tax_rate: 0 }, 2)
        result.current.addItem({ id: 2, name: 'Product 2', sell_price: 10000, tax_rate: 0 }, 1)
      })

      const subtotal = result.current.subtotal()
      expect(subtotal).toBe(20000) // (5000 * 2) + (10000 * 1)
    })

    it('should calculate tax correctly', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', sell_price: 10000, tax_rate: 18 })
      })

      const tax = result.current.tax()
      expect(tax).toBe(1800) // 10000 * 18%
    })

    it('should calculate total correctly', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', sell_price: 10000, tax_rate: 18 })
      })

      const total = result.current.total()
      expect(total).toBe(11800) // 10000 + 1800
    })
  })

  describe('Clear Cart', () => {
    it('should clear entire cart', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', sell_price: 5000, tax_rate: 0 })
        result.current.addItem({ id: 2, name: 'Product 2', sell_price: 10000, tax_rate: 0 })
      })
      expect(result.current.items).toHaveLength(2)

      act(() => {
        result.current.clear()
      })

      expect(result.current.items).toHaveLength(0)
    })
  })
})
