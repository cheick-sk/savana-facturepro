import { create } from 'zustand';

interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
  };
  quantity: number;
}

interface CartState {
  items: CartItem[];
  customer: { id: string; name: string } | null;
  discount: number;
  
  // Actions
  addItem: (product: CartItem['product']) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setCustomer: (customer: CartState['customer']) => void;
  setDiscount: (discount: number) => void;
  
  // Computed values (as functions)
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  discount: 0,

  addItem: (product) => {
    set((state) => {
      const existingItem = state.items.find(item => item.product.id === product.id);
      
      if (existingItem) {
        return {
          items: state.items.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      
      return {
        items: [...state.items, { product, quantity: 1 }],
      };
    });
  },

  updateQuantity: (productId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return {
          items: state.items.filter(item => item.product.id !== productId),
        };
      }
      
      return {
        items: state.items.map(item =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        ),
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter(item => item.product.id !== productId),
    }));
  },

  clearCart: () => {
    set({ items: [], customer: null, discount: 0 });
  },

  setCustomer: (customer) => {
    set({ customer });
  },

  setDiscount: (discount) => {
    set({ discount });
  },

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.product.price * item.quantity, 0);
  },

  getTotal: () => {
    const { discount } = get();
    const subtotal = get().getSubtotal();
    return subtotal - discount;
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((count, item) => count + item.quantity, 0);
  },
}));
