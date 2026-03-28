import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Header } from '../../components/layout/Header';
import { useCartStore } from '../../stores/cartStore';
import { useOffline } from '../../hooks/useOffline';

// Mock products
const PRODUCTS = [
  { id: '1', name: 'Riz Premium 5kg', price: 15000, category: 'Alimentation' },
  { id: '2', name: 'Huile Végétale 1L', price: 3500, category: 'Alimentation' },
  { id: '3', name: 'Savon Liquide 500ml', price: 2500, category: 'Hygiène' },
  { id: '4', name: 'Eau Minérale 1.5L', price: 1000, category: 'Boissons' },
  { id: '5', name: 'Café Instantané', price: 4500, category: 'Alimentation' },
  { id: '6', name: 'Sucre Blanc 1kg', price: 2000, category: 'Alimentation' },
  { id: '7', name: 'Lait en Poudre', price: 5500, category: 'Alimentation' },
  { id: '8', name: 'Biscuits Assortis', price: 3000, category: 'Snacks' },
  { id: '9', name: 'Jus d\'Orange 1L', price: 2500, category: 'Boissons' },
  { id: '10', name: 'Thé Vert 100g', price: 1800, category: 'Boissons' },
];

const CATEGORIES = ['Tous', 'Alimentation', 'Boissons', 'Hygiène', 'Snacks'];

export default function POSScreen() {
  const { items, addItem, total, getItemCount, clearCart } = useCartStore();
  const { isOffline } = useOffline();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');

  const filteredProducts = PRODUCTS.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Tous' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: typeof PRODUCTS[0]) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
    });
  };

  const handleCheckout = () => {
    router.push('/pos/payment');
  };

  const handleScan = () => {
    router.push('/pos/scanner');
  };

  const cartCount = getItemCount();

  const renderProduct = ({ item }: { item: typeof PRODUCTS[0] }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleAddToCart(item)}
      activeOpacity={0.7}
    >
      <View style={styles.productIcon}>
        <Ionicons name="cube" size={24} color="#10b981" />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price.toLocaleString()} FCFA</Text>
      </View>
      <View style={styles.addButton}>
        <Ionicons name="add" size={20} color="#ffffff" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Point de Vente" />
      
      {/* Search and Scan */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
          <Ionicons name="barcode" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === item && styles.categoryTextActive
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          isOffline ? (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline" size={16} color="#f59e0b" />
              <Text style={styles.offlineText}>Mode hors ligne actif</Text>
            </View>
          ) : null
        }
      />

      {/* Cart Summary */}
      {cartCount > 0 && (
        <View style={styles.cartSummary}>
          <View style={styles.cartInfo}>
            <View style={styles.cartCount}>
              <Text style={styles.cartCountText}>{cartCount}</Text>
            </View>
            <View>
              <Text style={styles.cartLabel}>Total</Text>
              <Text style={styles.cartTotal}>{total.toLocaleString()} FCFA</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
            <Text style={styles.checkoutText}>Valider</Text>
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesContainer: {
    paddingVertical: 8,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#10b981',
  },
  categoryText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  productsList: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  productPrice: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    marginHorizontal: 4,
  },
  offlineText: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 6,
  },
  cartSummary: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartCount: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cartCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  cartLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  checkoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
});
