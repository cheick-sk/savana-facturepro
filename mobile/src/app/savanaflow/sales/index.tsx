import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Calendar, ChevronRight, DollarSign, ShoppingBag, TrendingUp } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

interface Sale {
  id: string;
  date: string;
  total: number;
  items: number;
  paymentMethod: 'cash' | 'card' | 'mobile';
  status: 'completed' | 'refunded' | 'pending';
  customer?: string;
}

export default function SalesListScreen() {
  const { t } = useTranslation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  useEffect(() => {
    loadSales();
  }, [selectedPeriod]);

  const loadSales = async () => {
    const mockSales: Sale[] = [
      { id: '1', date: '2024-01-23 14:30', total: 15000, items: 5, paymentMethod: 'cash', status: 'completed' },
      { id: '2', date: '2024-01-23 12:15', total: 8500, items: 3, paymentMethod: 'mobile', status: 'completed', customer: 'Amadou D.' },
      { id: '3', date: '2024-01-23 10:45', total: 22000, items: 8, paymentMethod: 'card', status: 'completed' },
      { id: '4', date: '2024-01-22 16:20', total: 5000, items: 2, paymentMethod: 'cash', status: 'refunded' },
      { id: '5', date: '2024-01-22 11:30', total: 12500, items: 4, paymentMethod: 'mobile', status: 'completed' },
    ];
    setSales(mockSales);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSales();
    setRefreshing(false);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return '💵';
      case 'card':
        return '💳';
      case 'mobile':
        return '📱';
      default:
        return '💰';
    }
  };

  const renderSale = ({ item }: { item: Sale }) => (
    <TouchableOpacity
      style={styles.saleItem}
      onPress={() => router.push(`/savanaflow/sales/${item.id}`)}
    >
      <View style={styles.saleIcon}>
        <Text style={styles.paymentEmoji}>{getPaymentIcon(item.paymentMethod)}</Text>
      </View>
      <View style={styles.saleInfo}>
        <Text style={styles.saleDate}>{item.date}</Text>
        <Text style={styles.saleItems}>
          {item.items} {t('sales.items')}
          {item.customer && ` • ${item.customer}`}
        </Text>
      </View>
      <View style={styles.saleRight}>
        <Text style={styles.saleTotal}>{formatAmount(item.total)}</Text>
        <Badge
          variant={
            item.status === 'completed' ? 'success' :
            item.status === 'refunded' ? 'error' : 'warning'
          }
        >
          {t(`status.${item.status}`)}
        </Badge>
      </View>
      <ChevronRight size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const totalSales = sales.reduce((sum, sale) => sum + (sale.status === 'completed' ? sale.total : 0), 0);
  const totalTransactions = sales.filter(s => s.status === 'completed').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {['today', 'week', 'month'].map(period => (
          <TouchableOpacity
            key={period}
            style={[styles.periodTab, selectedPeriod === period && styles.periodTabActive]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[styles.periodTabText, selectedPeriod === period && styles.periodTabTextActive]}>
              {t(`periods.${period}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <DollarSign size={20} color="#10B981" />
          <Text style={styles.statValue}>{formatAmount(totalSales)}</Text>
          <Text style={styles.statLabel}>{t('sales.totalRevenue')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <ShoppingBag size={20} color="#3B82F6" />
          <Text style={styles.statValue}>{totalTransactions}</Text>
          <Text style={styles.statLabel}>{t('sales.transactions')}</Text>
        </Card>
      </View>

      {/* List */}
      <FlatList
        data={sales}
        renderItem={renderSale}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={<TrendingUp size={48} color="#9CA3AF" />}
            title={t('sales.noSales')}
            message={t('sales.noSalesDesc')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  periodTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  periodTabActive: {
    backgroundColor: '#10B981',
  },
  periodTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  periodTabTextActive: {
    color: '#FFFFFF',
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
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
  },
  saleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  saleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentEmoji: {
    fontSize: 20,
  },
  saleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  saleDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  saleItems: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  saleRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  saleTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
});
