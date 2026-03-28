import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, Minus, Trash2 } from 'lucide-react-native';

interface CartItemData {
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
  };
  quantity: number;
}

interface CartItemProps {
  item: CartItemData;
  onUpdateQuantity: (delta: number) => void;
  onRemove: () => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const itemTotal = item.product.price * item.quantity;

  return (
    <View style={styles.container}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.product.name}
        </Text>
        <Text style={styles.itemPrice}>{formatPrice(item.product.price)}</Text>
      </View>

      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(-1)}
        >
          <Minus size={16} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(1)}
        >
          <Plus size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.rightSection}>
        <Text style={styles.itemTotal}>{formatPrice(itemTotal)}</Text>
        <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
          <Trash2 size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  itemPrice: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    gap: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 24,
    textAlign: 'center',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  removeButton: {
    marginTop: 4,
    padding: 4,
  },
});
