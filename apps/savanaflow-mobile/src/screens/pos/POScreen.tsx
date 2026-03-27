import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Text,
  Surface,
  TextInput,
  Button,
  Card,
  Divider,
  FAB,
  Badge,
  IconButton,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useCartStore, CartItem } from '../../store/cart';
import { useNetworkStore } from '../../store/network';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 3;

// Mock products for demo
const DEMO_PRODUCTS = [
  { id: 1, name: 'Eau minérale 1.5L', price: 500, stock: 100, barcode: '3401234567890', tax_rate: 18, cost_price: 300 },
  { id: 2, name: 'Coca-Cola 33cl', price: 500, stock: 200, barcode: '3401234567891', tax_rate: 18, cost_price: 350 },
  { id: 3, name: 'Coca-Cola 50cl', price: 700, stock: 150, barcode: '3401234567892', tax_rate: 18, cost_price: 500 },
  { id: 4, name: 'Fanta Orange 33cl', price: 500, stock: 120, barcode: '3401234567893', tax_rate: 18, cost_price: 350 },
  { id: 5, name: 'Sprite 33cl', price: 500, stock: 100, barcode: '3401234567894', tax_rate: 18, cost_price: 350 },
  { id: 6, name: 'Jus Top 1L', price: 1500, stock: 50, barcode: '3401234567895', tax_rate: 18, cost_price: 1000 },
  { id: 7, name: 'Riz 5kg Premium', price: 4500, stock: 80, barcode: '3402234567890', tax_rate: 18, cost_price: 3500 },
  { id: 8, name: 'Huile 5L', price: 6000, stock: 40, barcode: '3402234567891', tax_rate: 18, cost_price: 4800 },
  { id: 9, name: 'Sucre 1kg', price: 1000, stock: 100, barcode: '3402234567892', tax_rate: 18, cost_price: 700 },
];

export default function POScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { isConnected } = useNetworkStore();
  
  const {
    items,
    customer,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getTaxAmount,
    getTotal,
    getItemCount,
  } = useCartStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(DEMO_PRODUCTS);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(DEMO_PRODUCTS);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredProducts(
        DEMO_PRODUCTS.filter(
          p => p.name.toLowerCase().includes(query) || p.barcode?.includes(query)
        )
      );
    }
  }, [searchQuery]);

  const handleAddProduct = (product: typeof DEMO_PRODUCTS[0]) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      barcode: product.barcode,
      tax_rate: product.tax_rate,
      cost_price: product.cost_price,
    });
  };

  const handlePayment = () => {
    if (items.length === 0) {
      Alert.alert(t('common.error'), t('pos.emptyCart'));
      return;
    }
    navigation.navigate('Payment', {
      subtotal: getSubtotal(),
      tax: getTaxAmount(),
      total: getTotal(),
      items: items,
      customer: customer,
    });
  };

  const renderProduct = ({ item }: { item: typeof DEMO_PRODUCTS[0] }) => (
    <TouchableOpacity onPress={() => handleAddProduct(item)}>
      <Card style={[styles.productCard, item.stock <= 0 && styles.outOfStockCard]}>
        <Card.Content style={styles.productContent}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>
            {item.price.toLocaleString()} XOF
          </Text>
          <Text style={[
            styles.stockText,
            item.stock <= 0 && styles.outOfStockText,
            item.stock <= 10 && item.stock > 0 && styles.lowStockText,
          ]}>
            {item.stock <= 0 ? t('product.outOfStock') : `${item.stock}`}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>{item.price.toLocaleString()} XOF</Text>
      </View>
      <View style={styles.cartItemControls}>
        <IconButton
          icon="minus"
          size={20}
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
        />
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <IconButton
          icon="plus"
          size={20}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
        />
        <IconButton
          icon="delete"
          size={20}
          iconColor="#ef4444"
          onPress={() => removeItem(item.id)}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Offline Banner */}
      {!isConnected && (
        <Surface style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠️ {t('offline.message')}</Text>
        </Surface>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder={t('pos.searchProduct')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          style={styles.searchInput}
          left={<TextInput.Icon icon="magnify" />}
          right={searchQuery ? <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} /> : null}
        />
        <IconButton
          icon="barcode-scan"
          mode="contained"
          size={24}
          onPress={() => Alert.alert('Scanner', 'Barcode scanner coming soon')}
        />
      </View>

      <View style={styles.mainContent}>
        {/* Products Grid */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>{t('product.title')}</Text>
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={item => item.id.toString()}
            numColumns={3}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.productGrid}
          />
        </View>

        {/* Cart */}
        <Surface style={styles.cartSection}>
          <View style={styles.cartHeader}>
            <Text style={styles.sectionTitle}>
              {t('pos.cart')} ({getItemCount()})
            </Text>
            {items.length > 0 && (
              <Button onPress={clearCart} compact textColor="#ef4444">
                {t('pos.clearCart')}
              </Button>
            )}
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartText}>{t('pos.emptyCart')}</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={items}
                renderItem={renderCartItem}
                keyExtractor={item => item.id.toString()}
                style={styles.cartList}
              />

              <Divider />

              <View style={styles.cartSummary}>
                <View style={styles.summaryRow}>
                  <Text>{t('common.subtotal')}</Text>
                  <Text>{getSubtotal().toLocaleString()} XOF</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text>TVA (18%)</Text>
                  <Text>{getTaxAmount().toLocaleString()} XOF</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalText}>{t('common.total')}</Text>
                  <Text style={styles.totalAmount}>
                    {getTotal().toLocaleString()} XOF
                  </Text>
                </View>
              </View>

              <Button
                mode="contained"
                onPress={handlePayment}
                style={styles.payButton}
                contentStyle={styles.payButtonContent}
              >
                {t('pos.completeSale')}
              </Button>
            </>
          )}
        </Surface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#92400E',
    fontSize: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    height: 40,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  productsSection: {
    flex: 2,
    paddingLeft: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  productGrid: {
    paddingBottom: 100,
  },
  productCard: {
    width: ITEM_WIDTH - 8,
    margin: 4,
    backgroundColor: '#fff',
  },
  outOfStockCard: {
    opacity: 0.5,
  },
  productContent: {
    alignItems: 'center',
    padding: 8,
    minHeight: 90,
  },
  productName: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F4E79',
  },
  stockText: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 2,
  },
  outOfStockText: {
    color: '#EF4444',
  },
  lowStockText: {
    color: '#F59E0B',
  },
  cartSection: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    maxHeight: '95%',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCartText: {
    color: '#9CA3AF',
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 12,
    fontWeight: '500',
  },
  cartItemPrice: {
    fontSize: 11,
    color: '#6B7280',
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 4,
    minWidth: 24,
    textAlign: 'center',
  },
  cartSummary: {
    paddingVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalText: {
    fontWeight: '600',
    fontSize: 16,
  },
  totalAmount: {
    fontWeight: '700',
    fontSize: 18,
    color: '#1F4E79',
  },
  payButton: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#1F4E79',
  },
  payButtonContent: {
    paddingVertical: 12,
  },
});
