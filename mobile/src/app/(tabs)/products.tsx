import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Badge, StockStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';

// Mock products data
const MOCK_PRODUCTS = [
  { id: '1', name: 'Riz Premium 5kg', price: 15000, stock: 45, category: 'Alimentation', barcode: '1234567890123' },
  { id: '2', name: 'Huile Végétale 1L', price: 3500, stock: 120, category: 'Alimentation', barcode: '1234567890124' },
  { id: '3', name: 'Savon Liquide 500ml', price: 2500, stock: 8, category: 'Hygiène', barcode: '1234567890125' },
  { id: '4', name: 'Eau Minérale 1.5L', price: 1000, stock: 200, category: 'Boissons', barcode: '1234567890126' },
  { id: '5', name: 'Café Instantané 200g', price: 4500, stock: 0, category: 'Alimentation', barcode: '1234567890127' },
  { id: '6', name: 'Sucre Blanc 1kg', price: 2000, stock: 85, category: 'Alimentation', barcode: '1234567890128' },
  { id: '7', name: 'Lait en Poudre 400g', price: 5500, stock: 5, category: 'Alimentation', barcode: '1234567890129' },
  { id: '8', name: 'Biscuits Assortis', price: 3000, stock: 60, category: 'Snacks', barcode: '1234567890130' },
];

export default function ProductsScreen() {
  const { selectedApp } = useAuth();
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.includes(searchQuery);
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const getAppColor = () => {
    switch (selectedApp) {
      case 'facturepro': return '#2563eb';
      case 'savanaflow': return '#10b981';
      default: return '#2563eb';
    }
  };

  const renderProduct = ({ item }: { item: typeof MOCK_PRODUCTS[0] }) => (
    <Card style={styles.productCard}>
      <TouchableOpacity style={styles.productContent}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
        </View>
        <View style={styles.productDetails}>
          <Text style={[styles.productPrice, { color: getAppColor() }]}>
            {item.price.toLocaleString()} FCFA
          </Text>
          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Stock: {item.stock}</Text>
            <StockStatusBadge quantity={item.stock} />
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header title="Produits" />
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchText}
            placeholder="Rechercher un produit..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity>
              <Ionicons name="barcode" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filters */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['Tous', ...categories]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                (item === 'Tous' ? !selectedCategory : selectedCategory === item) && 
                { backgroundColor: getAppColor(), borderColor: getAppColor() }
              ]}
              onPress={() => setSelectedCategory(item === 'Tous' ? null : item)}
            >
              <Text style={[
                styles.categoryChipText,
                (item === 'Tous' ? !selectedCategory : selectedCategory === item) && 
                { color: '#ffffff' }
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>Aucun produit trouvé</Text>
          </View>
        }
      />

      {/* Add Product Button */}
      <View style={styles.fabContainer}>
        <Button
          title="Ajouter un produit"
          onPress={() => {}}
          icon={<Ionicons name="add" size={24} color="#ffffff" />}
          style={styles.fab}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  categoriesContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  productCard: {
    marginBottom: 12,
  },
  productContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#6b7280',
  },
  productDetails: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  fab: {
    borderRadius: 12,
  },
});
