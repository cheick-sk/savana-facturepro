import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trash2 } from 'lucide-react-native';

interface InvoiceItemData {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceItemRowProps {
  item: InvoiceItemData;
  index: number;
  onUpdate: (field: string, value: string | number) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function InvoiceItemRow({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: InvoiceItemRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.itemNumber}>#{index + 1}</Text>
        {canRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.fields}>
        <View style={styles.descriptionField}>
          <Text style={styles.label}>Description</Text>
          <TouchableOpacity style={styles.input}>
            <Text style={item.description ? styles.inputText : styles.placeholder}>
              {item.description || 'Description du produit/service'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={styles.smallField}>
            <Text style={styles.label}>Qté</Text>
            <TouchableOpacity style={styles.input}>
              <Text style={styles.inputText}>{item.quantity}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.smallField}>
            <Text style={styles.label}>P.U.</Text>
            <TouchableOpacity style={styles.input}>
              <Text style={styles.inputText}>
                {item.unitPrice > 0 ? item.unitPrice.toLocaleString('fr-FR') : '0'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.smallField}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.totalText}>
              {item.total.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  removeButton: {
    padding: 4,
  },
  fields: {
    gap: 12,
  },
  descriptionField: {},
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  smallField: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    minHeight: 40,
  },
  inputText: {
    fontSize: 14,
    color: '#111827',
  },
  placeholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  totalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    padding: 10,
    minHeight: 40,
    textAlignVertical: 'center',
  },
});
