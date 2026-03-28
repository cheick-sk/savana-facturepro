import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  RefreshCw,
  Filter,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  maxStock: number;
  category: string;
  lastRestock: string;
  status: 'ok' | 'low' | 'critical' | 'overstocked';
}

export default function InventoryScreen() {
  const { t } = useTranslation();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'low' | 'critical'>('all');

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    const mockInventory: InventoryItem[] = [
      { id: '1', name: 'Café Touba', stock: 50, minStock: 20, maxStock: 100, category: 'Boissons', lastRestock: '2024-01-20', status: 'ok' },
      { id: '2', name: 'Thé Attaya', stock: 15, minStock: 20, maxStock: 80, category: 'Boissons', lastRestock: '2024-01-18', status: 'low' },
      { id: '3', name: 'Pain', stock: 3, minStock: 15, maxStock: 50, category: 'Boulangerie', lastRestock: '2024-01-22', status: 'critical' },
      { id: '4', name: 'Croissant', stock: 25, minStock: 10, maxStock: 30, category: 'Boulangerie', lastRestock: '2024-01-21', status: 'ok' },
      { id: '5', name: 'Jus Bissap', stock: 45, minStock: 10, maxStock: 40, category: 'Boissons', lastRestock: '2024-01-19', status: 'overstocked' },
      { id: '6', name: 'Eau Minérale', stock: 5, minStock: 50, maxStock: 200, category: 'Boissons', lastRestock: '2024-01-17', status: 'critical' },
      { id: '7', name: 'Beurre', stock: 18, minStock: 10, maxStock: 30, category: 'Produits laitiers', lastRestock: '2024-01-20', status: 'ok' },
      { id: '8', name: 'Lait', stock: 12, minStock: 15, maxStock: 50, category: 'Produits laitiers', lastRestock: '2024-01-21', status: 'low' },
    ];
    setInventory(mockInventory);
  };

  const filteredInventory = inventory.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'low') return item.status === 'low' || item.status === 'critical';
    if (filter === 'critical') return item.status === 'critical';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge variant="success">{t('inventory.inStock')}</Badge>;
      case 'low':
        return <Badge variant="warning">{t('inventory.lowStock')}</Badge>;
      case 'critical':
        return <Badge variant="error">{t('inventory.critical')}</Badge>;
      case 'overstocked':
        return <Badge variant="info">{t('inventory.overstocked')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStockPercentage = (item: InventoryItem) => {
    return Math.round((item.stock / item.maxStock) * 100);
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
    const percentage = getStockPercentage(item);
    
    return (
      <Card style={styles.inventoryCard}>
        <View style={styles.cardHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemCategory}>{item.category}</Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View style={styles.stockInfo}>
          <View style={styles.stockBar}>
            <View 
              style={[
                styles.stockFill, 
                { 
                  width: `${percentage}%`,
                  backgroundColor: 
                    item.status === 'critical' ? '#EF4444' :
                    item.status === 'low' ? '#F59E0B' :
                    item.status === 'overstocked' ? '#3B82F6' :
                    '#10B981'
                }
              ]} 
            />
          </View>
          <Text style={styles.stockText}>
            {item.stock} / {item.maxStock} {t('inventory.units')}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.minMaxText}>
            Min: {item.minStock} | Max: {item.maxStock}
          </Text>
          <TouchableOpacity 
            style={styles.restockButton}
            onPress={() => Alert.alert(t('inventory.restock'), t('inventory.restockMessage'))}
          >
            <RefreshCw size={14} color="#10B981" />
            <Text style={styles.restockText}>{t('inventory.restock')}</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const stats = {
    total: inventory.length,
    low: inventory.filter(i => i.status === 'low' || i.status === 'critical').length,
    critical: inventory.filter(i => i.status === 'critical').length,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Package size={20} color="#3B82F6" />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>{t('inventory.totalItems')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <TrendingDown size={20} color="#F59E0B" />
          <Text style={styles.statValue}>{stats.low}</Text>
          <Text style={styles.statLabel}>{t('inventory.lowStockItems')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <AlertTriangle size={20} color="#EF4444" />
          <Text style={styles.statValue}>{stats.critical}</Text>
          <Text style={styles.statLabel}>{t('inventory.criticalItems')}</Text>
        </Card>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {['all', 'low', 'critical'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f as typeof filter)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {t(`filters.${f}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filteredInventory}
        renderItem={renderInventoryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon={<Package size={48} color="#9CA3AF" />}
            title={t('inventory.noItems')}
            message={t('inventory.noItemsDesc')}
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
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#10B981',
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
  },
  inventoryCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  itemCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  stockInfo: {
    marginBottom: 12,
  },
  stockBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  stockFill: {
    height: '100%',
    borderRadius: 4,
  },
  stockText: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minMaxText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  restockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
  },
  restockText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
});
