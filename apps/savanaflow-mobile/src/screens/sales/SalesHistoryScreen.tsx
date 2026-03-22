import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Searchbar,
  useTheme,
  Divider,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNetworkStore } from '../../store/network';

// Mock sales data
const DEMO_SALES = [
  {
    id: 1,
    sale_number: 'VNT-ABC123',
    date: new Date(Date.now() - 3600000).toISOString(),
    total_amount: 12500,
    payment_method: 'CASH',
    items_count: 3,
    status: 'COMPLETED',
  },
  {
    id: 2,
    sale_number: 'VNT-ABC124',
    date: new Date(Date.now() - 7200000).toISOString(),
    total_amount: 8500,
    payment_method: 'ORANGE_MONEY',
    items_count: 2,
    status: 'COMPLETED',
  },
  {
    id: 3,
    sale_number: 'VNT-ABC125',
    date: new Date(Date.now() - 14400000).toISOString(),
    total_amount: 23000,
    payment_method: 'CASH',
    items_count: 5,
    status: 'COMPLETED',
  },
  {
    id: 4,
    sale_number: 'VNT-ABC126',
    date: new Date(Date.now() - 28800000).toISOString(),
    total_amount: 4500,
    payment_method: 'MTN_MOMO',
    items_count: 1,
    status: 'COMPLETED',
  },
];

export default function SalesHistoryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isConnected, pendingSyncCount } = useNetworkStore();
  
  const [sales, setSales] = useState(DEMO_SALES);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: 'Espèces',
      ORANGE_MONEY: 'Orange Money',
      MTN_MOMO: 'MTN MoMo',
      WAVE: 'Wave',
      CARD: 'Carte',
    };
    return labels[method] || method;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderSale = ({ item }: { item: typeof DEMO_SALES[0] }) => (
    <Card style={styles.saleCard}>
      <Card.Content>
        <View style={styles.saleHeader}>
          <View>
            <Text style={styles.saleNumber}>{item.sale_number}</Text>
            <Text style={styles.saleDate}>
              {formatFullDate(item.date)} à {formatTime(item.date)}
            </Text>
          </View>
          <Chip mode="flat" style={styles.statusChip}>
            ✓ {t('sale.statusLabels.COMPLETED')}
          </Chip>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.saleDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Articles</Text>
            <Text style={styles.detailValue}>{item.items_count}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Paiement</Text>
            <Text style={styles.detailValue}>{getPaymentMethodLabel(item.payment_method)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('common.total')}</Text>
            <Text style={styles.totalValue}>
              {item.total_amount.toLocaleString()} XOF
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  // Calculate totals
  const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalTransactions = sales.length;

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalTransactions}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalRevenue.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total (XOF)</Text>
        </View>
      </View>

      {/* Pending Sync Warning */}
      {!isConnected && pendingSyncCount > 0 && (
        <View style={styles.syncWarning}>
          <Text style={styles.syncWarningText}>
            ⚠️ {pendingSyncCount} vente(s) en attente de synchronisation
          </Text>
        </View>
      )}

      {/* Sales List */}
      <FlatList
        data={sales}
        renderItem={renderSale}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune vente aujourd'hui</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F4E79',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  syncWarning: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  syncWarningText: {
    color: '#92400E',
    textAlign: 'center',
  },
  listContent: {
    padding: 12,
    paddingTop: 0,
  },
  saleCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  saleNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  saleDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusChip: {
    backgroundColor: '#ECFDF5',
    height: 28,
  },
  divider: {
    marginVertical: 12,
  },
  saleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F4E79',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#9CA3AF',
  },
});
