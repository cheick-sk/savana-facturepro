import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Searchbar,
  Chip,
  FAB,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNetworkStore } from '../../store/network';

// Mock products
const DEMO_PRODUCTS = [
  { id: 1, name: 'Eau minérale 1.5L', price: 500, stock: 100, category: 'Boissons' },
  { id: 2, name: 'Coca-Cola 33cl', price: 500, stock: 200, category: 'Boissons' },
  { id: 3, name: 'Coca-Cola 50cl', price: 700, stock: 150, category: 'Boissons' },
  { id: 4, name: 'Fanta Orange 33cl', price: 500, stock: 120, category: 'Boissons' },
  { id: 5, name: 'Sprite 33cl', price: 500, stock: 100, category: 'Boissons' },
  { id: 6, name: 'Jus Top 1L', price: 1500, stock: 50, category: 'Boissons' },
  { id: 7, name: 'Riz 5kg Premium', price: 4500, stock: 80, category: 'Alimentation' },
  { id: 8, name: 'Huile 5L', price: 6000, stock: 40, category: 'Alimentation' },
  { id: 9, name: 'Sucre 1kg', price: 1000, stock: 100, category: 'Alimentation' },
  { id: 10, name: 'Savon 250g', price: 500, stock: 200, category: 'Hygiène' },
  { id: 11, name: 'Dentifrice 100ml', price: 1000, stock: 80, category: 'Hygiène' },
  { id: 12, name: 'Lessive 1kg', price: 2500, stock: 60, category: 'Ménage' },
];

export default function ProductsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isConnected } = useNetworkStore();
  
  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [filteredProducts, setFilteredProducts] = useState(DEMO_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const categories = [...new Set(DEMO_PRODUCTS.map(p => p.category))];

  useEffect(() => {
    let filtered = products;
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { color: '#EF4444', label: t('product.outOfStock') };
    if (stock <= 10) return { color: '#F59E0B', label: t('product.lowStock') };
    return { color: '#10B981', label: t('product.inStock') };
  };

  const renderProduct = ({ item }: { item: typeof DEMO_PRODUCTS[0] }) => {
    const stockStatus = getStockStatus(item.stock);
    
    return (
      <Card style={styles.productCard}>
        <Card.Content>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{item.name}</Text>
            <Chip 
              mode="flat" 
              style={[styles.stockChip, { backgroundColor: stockStatus.color + '20' }]}
              textStyle={{ color: stockStatus.color, fontSize: 10 }}
            >
              {stockStatus.label}
            </Chip>
          </View>
          
          <View style={styles.productDetails}>
            <Chip mode="outlined" style={styles.categoryChip} textStyle={styles.chipText}>
              {item.category}
            </Chip>
            <Text style={styles.priceText}>
              {item.price.toLocaleString()} XOF
            </Text>
          </View>
          
          <Text style={styles.stockText}>
            {t('product.stock')}: {item.stock}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <Searchbar
        placeholder={t('common.search')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {/* Category Filters */}
      <View style={styles.filtersContainer}>
        <Chip
          selected={selectedCategory === null}
          onPress={() => setSelectedCategory(null)}
          style={styles.filterChip}
        >
          {t('common.all')}
        </Chip>
        {categories.map(category => (
          <Chip
            key={category}
            selected={selectedCategory === category}
            onPress={() => setSelectedCategory(category)}
            style={styles.filterChip}
          >
            {category}
          </Chip>
        ))}
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {t('common.search')}...
            </Text>
          </View>
        }
      />

      {/* FAB for adding products */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchbar: {
    margin: 12,
    borderRadius: 8,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  filterChip: {
    marginBottom: 4,
  },
  listContent: {
    padding: 12,
    paddingTop: 0,
  },
  productCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  stockChip: {
    height: 24,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryChip: {
    height: 28,
  },
  chipText: {
    fontSize: 11,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F4E79',
  },
  stockText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#9CA3AF',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1F4E79',
  },
});
