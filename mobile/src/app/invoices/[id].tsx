import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, InvoiceStatusBadge } from '../../components/ui/Badge';
import { formatCurrency, formatDate, formatDateShort } from '../../utils/formatters';

// Mock invoice data
const MOCK_INVOICE = {
  id: '1',
  number: 'FAC-2024-001',
  customer: {
    name: 'Entreprise ABC',
    email: 'contact@abc.com',
    phone: '+223 70 00 00 00',
    address: 'Bamako, Mali',
  },
  status: 'paid',
  date: '2024-01-15',
  dueDate: '2024-02-15',
  items: [
    { id: '1', description: 'Service de consultation', quantity: 10, unitPrice: 5000, total: 50000 },
    { id: '2', description: 'Développement web', quantity: 1, unitPrice: 75000, total: 75000 },
  ],
  subtotal: 125000,
  tax: 22500,
  total: 147500,
  notes: 'Merci pour votre confiance!',
};

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const [invoice] = useState(MOCK_INVOICE);

  const handlePrint = () => {
    // Print invoice
  };

  const handleSend = () => {
    // Send invoice by email
  };

  const handleMarkAsPaid = () => {
    // Mark invoice as paid
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Facture {invoice.number}</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>Statut</Text>
              <InvoiceStatusBadge status={invoice.status} />
            </View>
            <View style={styles.amountInfo}>
              <Text style={styles.amountLabel}>Montant total</Text>
              <Text style={styles.amountValue}>{formatCurrency(invoice.total)}</Text>
            </View>
          </View>
        </Card>

        {/* Customer Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <Text style={styles.customerName}>{invoice.customer.name}</Text>
          <Text style={styles.customerDetail}>{invoice.customer.email}</Text>
          <Text style={styles.customerDetail}>{invoice.customer.phone}</Text>
          <Text style={styles.customerDetail}>{invoice.customer.address}</Text>
        </Card>

        {/* Dates */}
        <Card style={styles.section}>
          <View style={styles.dateRow}>
            <View>
              <Text style={styles.dateLabel}>Date d'émission</Text>
              <Text style={styles.dateValue}>{formatDateShort(invoice.date)}</Text>
            </View>
            <View style={styles.dateRight}>
              <Text style={styles.dateLabel}>Date d'échéance</Text>
              <Text style={styles.dateValue}>{formatDateShort(invoice.dueDate)}</Text>
            </View>
          </View>
        </Card>

        {/* Items */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Articles</Text>
          
          {invoice.items.map((item, index) => (
            <View key={item.id} style={[styles.itemRow, index > 0 && styles.itemBorder]}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemDescription}>{item.description}</Text>
                <Text style={styles.itemQuantity}>
                  {item.quantity} x {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </Card>

        {/* Totals */}
        <Card style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TVA (18%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.tax)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
          </View>
        </Card>

        {/* Notes */}
        {invoice.notes && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </Card>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.footer}>
        <Button
          title="Imprimer"
          variant="outline"
          onPress={handlePrint}
          icon={<Ionicons name="print-outline" size={20} color="#2563eb" />}
          style={styles.actionButton}
        />
        <Button
          title="Envoyer"
          variant="outline"
          onPress={handleSend}
          icon={<Ionicons name="mail-outline" size={20} color="#2563eb" />}
          style={styles.actionButton}
        />
        {invoice.status !== 'paid' && (
          <Button
            title="Marquer payée"
            onPress={handleMarkAsPaid}
            style={styles.actionButton}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  amountInfo: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
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
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
  },
  dateRight: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  dateValue: {
    fontSize: 14,
    color: '#111827',
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
  },
  itemDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 14,
    color: '#111827',
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    paddingTop: 16,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
