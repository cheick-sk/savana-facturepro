import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Calendar,
  User,
  Package,
} from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InvoiceItemRow } from '@/components/invoice/InvoiceItemRow';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function CreateInvoiceScreen() {
  const { t } = useTranslation();
  const [customer, setCustomer] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const updateItem = (id: string, field: string, value: string | number) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          return updatedItem;
        }
        return item;
      })
    );
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    return Math.round(calculateSubtotal() * 0.18); // 18% VAT
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const handleSave = async () => {
    if (!customer) {
      Alert.alert(t('common.error'), t('invoices.selectCustomer'));
      return;
    }

    if (items.some(item => !item.description)) {
      Alert.alert(t('common.error'), t('invoices.fillAllItems'));
      return;
    }

    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert(t('common.success'), t('invoices.created'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), t('invoices.createError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('invoices.createInvoice')}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Save size={24} color={saving ? '#9CA3AF' : '#3B82F6'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Customer Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>
            <User size={16} color="#6B7280" /> {t('invoices.customer')}
          </Text>
          <TouchableOpacity style={styles.selectCustomer}>
            <Text style={styles.selectCustomerText}>
              {customer || t('invoices.selectCustomer')}
            </Text>
            <ArrowLeft size={20} color="#9CA3AF" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        </Card>

        {/* Due Date */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Calendar size={16} color="#6B7280" /> {t('invoices.dueDate')}
          </Text>
          <Input
            placeholder="JJ/MM/AAAA"
            value={dueDate}
            onChangeText={setDueDate}
          />
        </Card>

        {/* Invoice Items */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionTitle}>
              <Package size={16} color="#6B7280" /> {t('invoices.items')}
            </Text>
            <TouchableOpacity onPress={addItem} style={styles.addItemButton}>
              <Plus size={20} color="#3B82F6" />
              <Text style={styles.addItemText}>{t('invoices.addItem')}</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <InvoiceItemRow
              key={item.id}
              item={item}
              index={index}
              onUpdate={(field, value) => updateItem(item.id, field, value)}
              onRemove={() => removeItem(item.id)}
              canRemove={items.length > 1}
            />
          ))}
        </View>

        {/* Notes */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('invoices.notes')}</Text>
          <TextInput
            style={styles.notesInput}
            placeholder={t('invoices.notesPlaceholder')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </Card>

        {/* Summary */}
        <Card style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('invoices.subtotal')}</Text>
            <Text style={styles.summaryValue}>{formatAmount(calculateSubtotal())}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('invoices.tax')} (18%)</Text>
            <Text style={styles.summaryValue}>{formatAmount(calculateTax())}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t('invoices.total')}</Text>
            <Text style={styles.totalValue}>{formatAmount(calculateTotal())}</Text>
          </View>
        </Card>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          title={t('invoices.saveDraft')}
          onPress={handleSave}
          variant="outline"
          style={styles.actionButton}
        />
        <Button
          title={t('invoices.send')}
          onPress={handleSave}
          style={styles.actionButton}
          loading={saving}
        />
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  selectCustomer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  selectCustomerText: {
    fontSize: 16,
    color: '#6B7280',
  },
  itemsSection: {
    marginBottom: 16,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addItemText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  notesInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  summary: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  bottomActions: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
