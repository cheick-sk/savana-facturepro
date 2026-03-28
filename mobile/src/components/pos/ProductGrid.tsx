import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

interface ProductGridProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export function ProductGrid({ products, onSelectProduct }: ProductGridProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onSelectProduct(item)}
      activeOpacity={0.7}
    >
      <View style={styles.productIcon}>
        <Text style={styles.productEmoji}>📦</Text>
      </View>
      <Text style={styles.productName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
      <Text style={styles.productStock}>
        {item.stock > 0 ? `${item.stock} en stock` : 'Épuisé'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={products}
      renderItem={renderProduct}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.grid}
      columnWrapperStyle={styles.row}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productCard: {
    flex: 1,
    margin: 4,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productEmoji: {
    fontSize: 24,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
    minHeight: 36,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 4,
  },
  productStock: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
