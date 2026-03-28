import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useOfflineStore } from '../../store/offlineStore';
import { apiClient } from '../../lib/api';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  Camera,
  X,
  Check,
  Printer,
} from 'lucide-react-native';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  barcode?: string;
  category?: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function POSPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, selectedApp } = useAuthStore();
  const { isOnline, addPendingAction } = useOfflineStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.barcode?.includes(search)
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [search, products]);

  const loadProducts = async () => {
    try {
      const response = await apiClient('savanaflow').get('/products', {
        params: { limit: 100 },
      });
      setProducts(response.data.items || response.data);
      setFilteredProducts(response.data.items || response.data);
    } catch (error) {
      // Load from offline cache if available
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          Alert.alert('Stock insuffisant', 'Quantité maximale atteinte');
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return item;
          if (newQty > item.stock) {
            Alert.alert('Stock insuffisant');
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.18; // 18% TVA
  const total = subtotal + tax;

  const handlePayment = async () => {
    if (!selectedPayment) {
      Alert.alert('Erreur', 'Sélectionnez un mode de paiement');
      return;
    }

    const saleData = {
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
      })),
      subtotal,
      tax_amount: tax,
      total,
      payment_method: selectedPayment,
    };

    try {
      if (isOnline) {
        await apiClient('savanaflow').post('/sales', saleData);
        Alert.alert('Succès', 'Vente enregistrée', [
          { text: 'OK', onPress: () => {
            setCart([]);
            setShowPayment(false);
            setSelectedPayment(null);
          }},
        ]);
      } else {
        // Save for offline sync
        await addPendingAction({
          type: 'create',
          entity: 'sale',
          endpoint: '/sales',
          method: 'POST',
          data: saleData,
        });
        Alert.alert('Hors ligne', 'Vente enregistrée localement. Sera synchronisée ultérieurement.');
        setCart([]);
        setShowPayment(false);
        setSelectedPayment(null);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Échec de l\'enregistrement de la vente');
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => addToCart(item)}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>
          {item.price.toLocaleString()} XOF
        </Text>
      </View>
      <View style={styles.stockBadge}>
        <Text style={styles.stockText}>{item.stock}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cartItemPrice}>
          {(item.price * item.quantity).toLocaleString()} XOF
        </Text>
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateQuantity(item.id, -1)}
        >
          <Minus size={16} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateQuantity(item.id, 1)}
        >
          <Plus size={16} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Trash2 size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#059669" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('savanaflow.pos')}</Text>
        <TouchableOpacity style={styles.scanButton}>
          <Camera size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('savanaflow.searchProduct')}
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.mainContent}>
        <View style={styles.productsSection}>
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            contentContainerStyle={styles.productList}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View style={styles.cartSection}>
          <View style={styles.cartHeader}>
            <ShoppingCart size={20} color="#059669" />
            <Text style={styles.cartTitle}>{t('savanaflow.cart')}</Text>
            <Text style={styles.cartCount}>({cart.length})</Text>
          </View>

          <FlatList
            data={cart}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.cartList}
            ListEmptyComponent={
              <Text style={styles.emptyCart}>Panier vide</Text>
            }
          />

          <View style={styles.cartTotals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('savanaflow.subtotal')}</Text>
              <Text style={styles.totalValue}>{subtotal.toLocaleString()} XOF</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('savanaflow.tax')} (18%)</Text>
              <Text style={styles.totalValue}>{tax.toLocaleString()} XOF</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalLabel}>{t('savanaflow.total')}</Text>
              <Text style={styles.grandTotalValue}>{total.toLocaleString()} XOF</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.payButton, cart.length === 0 && styles.payButtonDisabled]}
            onPress={() => setShowPayment(true)}
            disabled={cart.length === 0}
          >
            <CreditCard size={20} color="#FFFFFF" />
            <Text style={styles.payButtonText}>{t('savanaflow.payment')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Payment Modal */}
      {showPayment && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mode de paiement</Text>
              <TouchableOpacity onPress={() => setShowPayment(false)}>
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTotal}>
              Total: {total.toLocaleString()} XOF
            </Text>

            <View style={styles.paymentOptions}>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPayment === 'cash' && styles.paymentOptionSelected,
                ]}
                onPress={() => setSelectedPayment('cash')}
              >
                <Banknote size={24} color={selectedPayment === 'cash' ? '#059669' : '#6B7280'} />
                <Text style={styles.paymentOptionText}>{t('savanaflow.cash')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPayment === 'mobile_money' && styles.paymentOptionSelected,
                ]}
                onPress={() => setSelectedPayment('mobile_money')}
              >
                <Smartphone size={24} color={selectedPayment === 'mobile_money' ? '#059669' : '#6B7280'} />
                <Text style={styles.paymentOptionText}>{t('savanaflow.mobileMoney')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPayment === 'card' && styles.paymentOptionSelected,
                ]}
                onPress={() => setSelectedPayment('card')}
              >
                <CreditCard size={24} color={selectedPayment === 'card' ? '#059669' : '#6B7280'} />
                <Text style={styles.paymentOptionText}>{t('savanaflow.card')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.confirmButton} onPress={handlePayment}>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#059669',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scanButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  productsSection: {
    flex: 2,
    padding: 8,
  },
  productList: {
    padding: 4,
  },
  productCard: {
    flex: 1,
    margin: 4,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 10,
    color: '#6B7280',
  },
  cartSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    padding: 12,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  cartCount: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    color: '#111827',
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#6B7280',
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    marginHorizontal: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  removeButton: {
    marginLeft: 8,
    padding: 4,
  },
  emptyCart: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
  },
  cartTotals: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 14,
    color: '#111827',
  },
  grandTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
  },
  payButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 24,
  },
  paymentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  paymentOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  paymentOptionSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  paymentOptionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 14,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
