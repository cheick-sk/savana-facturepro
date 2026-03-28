import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Search, Plus, Phone, Mail, ChevronRight } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalInvoices: number;
  totalAmount: number;
  status: 'active' | 'inactive';
}

export default function CustomersScreen() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const mockCustomers: Customer[] = [
      { id: '1', name: 'Enterprise SARL', email: 'contact@enterprise.com', phone: '+221 77 123 45 67', totalInvoices: 12, totalAmount: 5500000, status: 'active' },
      { id: '2', name: 'Tech Solutions', email: 'info@techsol.com', phone: '+221 78 234 56 78', totalInvoices: 5, totalAmount: 1200000, status: 'active' },
      { id: '3', name: 'Boutique Plus', email: 'boutique@email.com', phone: '+221 76 345 67 89', totalInvoices: 8, totalAmount: 890000, status: 'active' },
      { id: '4', name: 'Café du Centre', email: 'cafe@email.com', phone: '+221 70 456 78 90', totalInvoices: 3, totalAmount: 450000, status: 'inactive' },
    ];
    setCustomers(mockCustomers);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const renderCustomer = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerItem}
      onPress={() => {}}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        <View style={styles.customerContact}>
          <Mail size={12} color="#9CA3AF" />
          <Text style={styles.customerEmail}>{item.email}</Text>
        </View>
        <View style={styles.customerContact}>
          <Phone size={12} color="#9CA3AF" />
          <Text style={styles.customerPhone}>{item.phone}</Text>
        </View>
      </View>
      <View style={styles.customerRight}>
        <Text style={styles.customerAmount}>{formatAmount(item.totalAmount)}</Text>
        <Text style={styles.customerInvoices}>{item.totalInvoices} {t('customers.invoices')}</Text>
        <Badge variant={item.status === 'active' ? 'success' : 'default'}>
          {t(`status.${item.status}`)}
        </Badge>
      </View>
      <ChevronRight size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <Search size={20} color="#9CA3AF" />
          <Text style={styles.searchText}>Rechercher...</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{customers.length}</Text>
          <Text style={styles.statLabel}>{t('customers.totalCustomers')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{customers.filter(c => c.status === 'active').length}</Text>
          <Text style={styles.statLabel}>{t('customers.active')}</Text>
        </Card>
      </View>

      {/* List */}
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomer}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon={<User size={48} color="#9CA3AF" />}
            title={t('customers.noCustomers')}
            message={t('customers.noCustomersDesc')}
          />
        }
      />

      {/* Add Button */}
      <TouchableOpacity style={styles.fabButton}>
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

import { User } from 'lucide-react-native';

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
    color: '#9CA3AF',
    paddingVertical: 12,
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
    fontSize: 24,
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
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  customerContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  customerEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  customerPhone: {
    fontSize: 12,
    color: '#6B7280',
  },
  customerRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  customerAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  customerInvoices: {
    fontSize: 12,
    color: '#6B7280',
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
