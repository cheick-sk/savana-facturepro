import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Badge, InvoiceStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { useOffline } from '../../hooks/useOffline';

// Mock invoices
const MOCK_INVOICES = [
  { id: '1', number: 'FAC-2024-001', customer: 'Entreprise ABC', amount: 125000, status: 'paid', date: '2024-01-15', dueDate: '2024-02-15' },
  { id: '2', number: 'FAC-2024-002', customer: 'SARL XYZ', amount: 85000, status: 'sent', date: '2024-01-18', dueDate: '2024-02-18' },
  { id: '3', number: 'FAC-2024-003', customer: 'Client 123', amount: 45000, status: 'overdue', date: '2024-01-10', dueDate: '2024-01-25' },
  { id: '4', number: 'FAC-2024-004', customer: 'Société DEF', amount: 230000, status: 'draft', date: '2024-01-20', dueDate: null },
  { id: '5', number: 'FAC-2024-005', customer: 'Entreprise GHI', amount: 67000, status: 'paid', date: '2024-01-12', dueDate: '2024-02-12' },
];

type FilterStatus = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';

export default function InvoicesScreen() {
  const { isOffline } = useOffline();
  const [invoices, setInvoices] = useState(MOCK_INVOICES);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const filteredInvoices = invoices.filter(
    invoice => filter === 'all' || invoice.status === filter
  );

  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    pending: invoices.filter(i => i.status === 'sent').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const renderInvoice = ({ item }: { item: typeof MOCK_INVOICES[0] }) => (
    <TouchableOpacity
      onPress={() => router.push(`/invoices/${item.id}`)}
      activeOpacity={0.7}
    >
      <Card style={styles.invoiceCard}>
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceNumber}>{item.number}</Text>
            <Text style={styles.customerName}>{item.customer}</Text>
          </View>
          <InvoiceStatusBadge status={item.status} />
        </View>
        
        <View style={styles.invoiceFooter}>
          <View>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDateShort(item.date)}</Text>
          </View>
          {item.dueDate && (
            <View>
              <Text style={styles.label}>Échéance</Text>
              <Text style={styles.value}>{formatDateShort(item.dueDate)}</Text>
            </View>
          )}
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header title="Factures" />
      
      {/* Stats */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={[styles.statItem, filter === 'all' && styles.statItemActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.statValue, filter === 'all' && styles.statValueActive]}>
            {stats.total}
          </Text>
          <Text style={styles.statLabel}>Total</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statItem, filter === 'paid' && styles.statItemPaid]}
          onPress={() => setFilter('paid')}
        >
          <Text style={[styles.statValue, filter === 'paid' && styles.statValuePaid]}>
            {stats.paid}
          </Text>
          <Text style={styles.statLabel}>Payées</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statItem, filter === 'sent' && styles.statItemPending]}
          onPress={() => setFilter('sent')}
        >
          <Text style={[styles.statValue, filter === 'sent' && styles.statValuePending]}>
            {stats.pending}
          </Text>
          <Text style={styles.statLabel}>En attente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statItem, filter === 'overdue' && styles.statItemOverdue]}
          onPress={() => setFilter('overdue')}
        >
          <Text style={[styles.statValue, filter === 'overdue' && styles.statValueOverdue]}>
            {stats.overdue}
          </Text>
          <Text style={styles.statLabel}>En retard</Text>
        </TouchableOpacity>
      </View>

      {/* Invoice List */}
      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoice}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          isOffline ? (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline" size={16} color="#f59e0b" />
              <Text style={styles.offlineText}>Mode hors ligne actif</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>Aucune facture trouvée</Text>
          </View>
        }
      />

      {/* Add Button */}
      <View style={styles.fabContainer}>
        <Button
          title="Nouvelle facture"
          onPress={() => router.push('/invoices/create')}
          icon={<Ionicons name="add" size={24} color="#ffffff" />}
          fullWidth
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  statItemActive: {
    backgroundColor: '#eff6ff',
  },
  statItemPaid: {
    backgroundColor: '#ecfdf5',
  },
  statItemPending: {
    backgroundColor: '#eff6ff',
  },
  statItemOverdue: {
    backgroundColor: '#fef2f2',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statValueActive: {
    color: '#2563eb',
  },
  statValuePaid: {
    color: '#10b981',
  },
  statValuePending: {
    color: '#2563eb',
  },
  statValueOverdue: {
    color: '#ef4444',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  invoiceCard: {
    marginBottom: 12,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  customerName: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 10,
    color: '#9ca3af',
  },
  value: {
    fontSize: 12,
    color: '#374151',
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
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
  },
  offlineText: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 6,
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
});
