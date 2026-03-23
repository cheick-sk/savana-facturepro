import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
  tax_rate: number;
  cost_price: number;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  loyalty_points?: number;
}

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  discount_percent: number;
  discount_amount: number;
  notes: string;
  
  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (percent: number, amount: number) => void;
  setNotes: (notes: string) => void;
  
  // Computed
  getSubtotal: () => number;
  getTaxAmount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customer: null,
      discount_percent: 0,
      discount_amount: 0,
      notes: '',

      addItem: (item: CartItem) => {
        set((state) => {
          const existingIndex = state.items.findIndex(i => i.id === item.id);
          
          if (existingIndex >= 0) {
            // Update quantity
            const newItems = [...state.items];
            newItems[existingIndex].quantity += item.quantity;
            return { items: newItems };
          }
          
          // Add new item
          return { items: [...state.items, item] };
        });
      },

      removeItem: (productId: number) => {
        set((state) => ({
          items: state.items.filter(i => i.id !== productId),
        }));
      },

      updateQuantity: (productId: number, quantity: number) => {
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter(i => i.id !== productId) };
          }
          
          return {
            items: state.items.map(i => 
              i.id === productId ? { ...i, quantity } : i
            ),
          };
        });
      },

      clearCart: () => set({ 
        items: [], 
        customer: null, 
        discount_percent: 0,
        discount_amount: 0,
        notes: '' 
      }),

      setCustomer: (customer: Customer | null) => set({ customer }),

      setDiscount: (percent: number, amount: number) => set({ 
        discount_percent: percent,
        discount_amount: amount,
      }),

      setNotes: (notes: string) => set({ notes }),

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      },

      getTaxAmount: () => {
        const { items, getSubtotal } = get();
        const subtotal = getSubtotal();
        // Calculate weighted average tax rate
        const totalTax = items.reduce((sum, item) => {
          const itemTotal = item.price * item.quantity;
          const itemTax = itemTotal * (item.tax_rate / 100);
          return sum + itemTax;
        }, 0);
        return totalTax;
      },

      getTotal: () => {
        const { getSubtotal, getTaxAmount, discount_amount } = get();
        return getSubtotal() + getTaxAmount() - discount_amount;
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'savanaflow-cart',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
