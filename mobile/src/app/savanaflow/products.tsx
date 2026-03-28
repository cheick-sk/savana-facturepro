import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  Camera,
  X,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  barcode?: string;
  minStock: number;
}

export default function ProductsScreen() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: '',
    category: '',
    barcode: '',
  });

  React.useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const mockProducts: Product[] = [
      { id: '1', name: 'Café Touba', price: 500, stock: 50, category: 'Boissons', barcode: '1234567890123', minStock: 10 },
      { id: '2', name: 'Thé Attaya', price: 300, stock: 100, category: 'Boissons', minStock: 20 },
      { id: '3', name: 'Pain', price: 250, stock: 5, category: 'Boulangerie', barcode: '1234567890124', minStock: 15 },
      { id: '4', name: 'Croissant', price: 400, stock: 20, category: 'Boulangerie', minStock: 10 },
      { id: '5', name: 'Jus Bissap', price: 800, stock: 25, category: 'Boissons', minStock: 5 },
      { id: '6', name: 'Eau Minérale', price: 500, stock: 2, category: 'Boissons', barcode: '1234567890125', minStock: 50 },
    ];
    setProducts(mockProducts);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode?.includes(searchQuery)
  );

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      Alert.alert(t('common.error'), t('products.fillAllFields'));
      return;
    }

    const product: Product = {
      id: Date.now().toString(),
      name: newProduct.name,
      price: parseFloat(newProduct.price),
      stock: parseInt(newProduct.stock, 10),
      category: newProduct.category || 'Autres',
      barcode: newProduct.barcode,
      minStock: 10,
    };

    setProducts([...products, product]);
    setShowAddModal(false);
    setNewProduct({ name: '', price: '', stock: '', category: '', barcode: '' });
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isLowStock = item.stock <= item.minStock;
    
    return (
      <Card style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productCategory}>{item.category}</Text>
          </View>
          <View style={styles.productActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Edit size={18} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.productDetails}>
          <View style={styles.productPrice}>
            <Text style={styles.priceLabel}>{t('products.price')}</Text>
            <Text style={styles.priceValue}>{formatAmount(item.price)}</Text>
          </View>
          
          <View style={styles.productStock}>
            <Text style={styles.stockLabel}>{t('products.stock')}</Text>
            <View style={styles.stockValue}>
              {isLowStock && <AlertTriangle size={14} color="#EF4444" />}
              <Text style={[styles.stockText, isLowStock && styles.lowStock]}>
                {item.stock}
              </Text>
            </View>
          </View>
        </View>

        {item.barcode && (
          <Text style={styles.barcode}>{t('products.barcode')}: {item.barcode}</Text>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchText}
            placeholder={t('products.search')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity style={styles.scannerButton}>
            <Camera size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{products.length}</Text>
          <Text style={styles.statLabel}>{t('products.totalProducts')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {products.filter(p => p.stock <= p.minStock).length}
          </Text>
          <Text style={styles.statLabel}>{t('products.lowStock')}</Text>
        </Card>
      </View>

      {/* List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon={<Package size={48} color="#9CA3AF" />}
            title={t('products.noProducts')}
            message={t('products.noProductsDesc')}
          />
        }
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => setShowAddModal(true)}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Product Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('products.addProduct')}</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('products.name')} *</Text>
              <TextInput
                style={styles.input}
                value={newProduct.name}
                onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
                placeholder={t('products.namePlaceholder')}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('products.price')} *</Text>
              <TextInput
                style={styles.input}
                value={newProduct.price}
                onChangeText={(text) => setNewProduct({ ...newProduct, price: text })}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('products.stock')} *</Text>
              <TextInput
                style={styles.input}
                value={newProduct.stock}
                onChangeText={(text) => setNewProduct({ ...newProduct, stock: text })}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('products.category')}</Text>
              <TextInput
                style={styles.input}
                value={newProduct.category}
                onChangeText={(text) => setNewProduct({ ...newProduct, category: text })}
                placeholder={t('products.categoryPlaceholder')}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('products.barcode')}</Text>
              <View style={styles.barcodeInput}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newProduct.barcode}
                  onChangeText={(text) => setNewProduct({ ...newProduct, barcode: text })}
                  placeholder={t('products.barcodePlaceholder')}
                />
                <TouchableOpacity style={styles.scanBarcodeButton}>
                  <Camera size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.modalActions}>
            <Button
              title={t('common.cancel')}
              onPress={() => setShowAddModal(false)}
              variant="outline"
              style={styles.modalButton}
            />
            <Button
              title={t('products.add')}
              onPress={handleAddProduct}
              style={styles.modalButton}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  scannerButton: {
    padding: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  productCard: {
    padding: 16,
    marginBottom: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  productCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productPrice: {},
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  productStock: {
    alignItems: 'flex-end',
  },
  stockLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  stockValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  lowStock: {
    color: '#EF4444',
  },
  barcode: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#111827',
  },
  barcodeInput: {
    flexDirection: 'row',
    gap: 8,
  },
  scanBarcodeButton: {
    width: 50,
    height: 50,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
