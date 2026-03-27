import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCartStore } from '../store/cart'

describe('Cart Store - SavanaFlow POS', () => {
  beforeEach(() => {
    // Reset cart before each test
    useCartStore.setState({
      items: [],
      customer: null,
      discount: 0,
      paymentMethod: 'cash',
    })
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have empty cart initially', () => {
      const state = useCartStore.getState()

      expect(state.items).toEqual([])
      expect(state.customer).toBeNull()
      expect(state.discount).toBe(0)
      expect(state.paymentMethod).toBe('cash')
    })
  })

  describe('Add to Cart', () => {
    it('should add item to cart', () => {
      const { result } = renderHook(() => useCartStore())
      const product = {
        id: 1,
        name: 'Product 1',
        price: 5000,
        quantity: 1,
        barcode: '123456789',
      }

      act(() => {
        result.current.addItem(product)
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].name).toBe('Product 1')
    })

    it('should increase quantity when adding existing product', () => {
      const { result } = renderHook(() => useCartStore())
      const product = {
        id: 1,
        name: 'Product 1',
        price: 5000,
        quantity: 1,
        barcode: '123456789',
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
        result.current.addItem({ id: 1, name: 'Product 1', price: 5000, quantity: 1 })
        result.current.addItem({ id: 2, name: 'Product 2', price: 10000, quantity: 1 })
      })

      expect(result.current.items).toHaveLength(2)
    })
  })

  describe('Remove from Cart', () => {
    it('should remove item from cart', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', price: 5000, quantity: 1 })
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
        result.current.addItem({ id: 1, name: 'Product 1', price: 5000, quantity: 1 })
        result.current.removeItem(999)
      })

      expect(result.current.items).toHaveLength(1)
    })
  })

  describe('Update Quantity', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', price: 5000, quantity: 1 })
      })

      act(() => {
        result.current.updateQuantity(1, 5)
      })

      expect(result.current.items[0].quantity).toBe(5)
    })

    it('should remove item when quantity is 0', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', price: 5000, quantity: 1 })
      })

      act(() => {
        result.current.updateQuantity(1, 0)
      })

      expect(result.current.items).toHaveLength(0)
    })
  })

  describe('Cart Totals', () => {
    it('should calculate subtotal correctly', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', price: 5000, quantity: 2 })
        result.current.addItem({ id: 2, name: 'Product 2', price: 10000, quantity: 1 })
      })

      const subtotal = result.current.getSubtotal()
      expect(subtotal).toBe(20000) // (5000 * 2) + (10000 * 1)
    })

    it('should calculate total with discount', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', price: 10000, quantity: 1 })
        result.current.setDiscount(10) // 10% discount
      })

      const total = result.current.getTotal()
      expect(total).toBe(9000) // 10000 - 10%
    })
  })

  describe('Customer', () => {
    it('should set customer', () => {
      const { result } = renderHook(() => useCartStore())
      const customer = {
        id: 1,
        name: 'Customer Name',
        phone: '+224 123 456 789',
        loyalty_points: 100,
      }

      act(() => {
        result.current.setCustomer(customer)
      })

      expect(result.current.customer).toEqual(customer)
    })

    it('should clear customer', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.setCustomer({ id: 1, name: 'Customer', phone: '+224', loyalty_points: 0 })
      })

      act(() => {
        result.current.clearCustomer()
      })

      expect(result.current.customer).toBeNull()
    })
  })

  describe('Payment Method', () => {
    it('should set payment method', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.setPaymentMethod('orange_money')
      })

      expect(result.current.paymentMethod).toBe('orange_money')
    })

    it('should support all payment methods', () => {
      const paymentMethods = ['cash', 'orange_money', 'mtn_momo', 'wave', 'celtis_cash']

      paymentMethods.forEach(method => {
        const { result } = renderHook(() => useCartStore())

        act(() => {
          result.current.setPaymentMethod(method)
        })

        expect(result.current.paymentMethod).toBe(method)
      })
    })
  })

  describe('Clear Cart', () => {
    it('should clear entire cart', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', price: 5000, quantity: 1 })
        result.current.setCustomer({ id: 1, name: 'Customer', phone: '+224', loyalty_points: 0 })
        result.current.setDiscount(5)
      })

      act(() => {
        result.current.clearCart()
      })

      expect(result.current.items).toHaveLength(0)
      expect(result.current.customer).toBeNull()
      expect(result.current.discount).toBe(0)
    })
  })
})
