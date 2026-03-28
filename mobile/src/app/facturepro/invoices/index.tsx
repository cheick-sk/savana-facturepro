import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Search, Plus, Filter, ChevronRight, FileText } from 'lucide-react-native';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

interface Invoice {
  id: string;
  number: string;
  customer: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  date: string;
  dueDate: string;
}

const FILTER_TABS = ['all', 'pending', 'paid', 'overdue'];

export default function InvoicesListScreen() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    // Simulated data
    const mockInvoices: Invoice[] = [
      { id: '1', number: 'INV-2024-001', customer: 'Enterprise SARL', amount: 1500000, status: 'paid', date: '2024-01-15', dueDate: '2024-02-15' },
      { id: '2', number: 'INV-2024-002', customer: 'Tech Solutions', amount: 750000, status: 'pending', date: '2024-01-18', dueDate: '2024-02-18' },
      { id: '3', number: 'INV-2024-003', customer: 'Boutique Plus', amount: 320000, status: 'overdue', date: '2024-01-05', dueDate: '2024-01-20' },
      { id: '4', number: 'INV-2024-004', customer: 'Café du Centre', amount: 180000, status: 'paid', date: '2024-01-20', dueDate: '2024-02-20' },
      { id: '5', number: 'INV-2024-005', customer: 'Pharmacie Santé', amount: 520000, status: 'pending', date: '2024-01-22', dueDate: '2024-02-22' },
      { id: '6', number: 'INV-2024-006', customer: 'Auto Services', amount: 890000, status: 'draft', date: '2024-01-23', dueDate: '2024-02-23' },
    ];
    setInvoices(mockInvoices);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || invoice.status === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <TouchableOpacity
      style={styles.invoiceItem}
      onPress={() => router.push(`/facturepro/invoices/${item.id}`)}
    >
      <View style={styles.invoiceMain}>
        <Text style={styles.invoiceNumber}>{item.number}</Text>
        <Text style={styles.invoiceCustomer}>{item.customer}</Text>
        <Text style={styles.invoiceDate}>{item.date}</Text>
      </View>
      <View style={styles.invoiceRight}>
        <Text style={styles.invoiceAmount}>{formatAmount(item.amount)}</Text>
        <Badge 
          variant={
            item.status === 'paid' ? 'success' : 
            item.status === 'pending' ? 'warning' : 
            item.status === 'overdue' ? 'error' : 'default'
          }
        >
          {t(`status.${item.status}`)}
        </Badge>
      </View>
      <ChevronRight size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchText}
            placeholder={t('common.search')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
              {t(`filters.${tab}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Invoice List */}
      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoice}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={<FileText size={48} color="#9CA3AF" />}
            title={t('invoices.noInvoices')}
            message={t('invoices.noInvoicesDesc')}
          />
        }
      />

      {/* Create Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => router.push('/facturepro/invoices/create')}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
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
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  invoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  invoiceMain: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  invoiceCustomer: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  invoiceDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
