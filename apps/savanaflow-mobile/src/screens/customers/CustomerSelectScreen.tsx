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
  List,
  Button,
  useTheme,
  Divider,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

// Mock customers
const DEMO_CUSTOMERS = [
  { id: 1, name: 'Client Demo 1', phone: '+22507080910', loyalty_points: 150, tier: 'GOLD', total_spent: 125000 },
  { id: 2, name: 'Client Demo 2', phone: '+22507080911', loyalty_points: 50, tier: 'SILVER', total_spent: 45000 },
  { id: 3, name: 'Amadou Koné', phone: '+22507080912', loyalty_points: 0, tier: 'STANDARD', total_spent: 0 },
  { id: 4, name: 'Fatou Diallo', phone: '+22507080913', loyalty_points: 300, tier: 'PLATINUM', total_spent: 250000 },
  { id: 5, name: 'Ibrahim Touré', phone: '+22507080914', loyalty_points: 75, tier: 'SILVER', total_spent: 68000 },
];

interface CustomerSelectScreenProps {
  navigation: any;
  route: {
    params?: {
      onSelect?: (customer: typeof DEMO_CUSTOMERS[0]) => void;
    };
  };
}

export default function CustomerSelectScreen({ navigation, route }: CustomerSelectScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  
  const [customers, setCustomers] = useState(DEMO_CUSTOMERS);
  const [filteredCustomers, setFilteredCustomers] = useState(DEMO_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (searchQuery) {
      setFilteredCustomers(
        customers.filter(c => 
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone?.includes(searchQuery)
        )
      );
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const handleSelectCustomer = (customer: typeof DEMO_CUSTOMERS[0]) => {
    if (route.params?.onSelect) {
      route.params.onSelect(customer);
    }
    navigation.goBack();
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return '#8B5CF6';
      case 'GOLD': return '#F59E0B';
      case 'SILVER': return '#9CA3AF';
      default: return '#6B7280';
    }
  };

  const renderCustomer = ({ item }: { item: typeof DEMO_CUSTOMERS[0] }) => (
    <Card 
      style={styles.customerCard}
      onPress={() => handleSelectCustomer(item)}
    >
      <Card.Content>
        <View style={styles.customerHeader}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.name}</Text>
            {item.phone && (
              <Text style={styles.customerPhone}>{item.phone}</Text>
            )}
          </View>
          <Chip 
            mode="flat"
            style={[styles.tierChip, { backgroundColor: getTierColor(item.tier) + '20' }]}
            textStyle={{ color: getTierColor(item.tier), fontSize: 10 }}
          >
            {item.tier}
          </Chip>
        </View>
        
        <View style={styles.customerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Points</Text>
            <Text style={styles.statValue}>{item.loyalty_points}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total achats</Text>
            <Text style={styles.statValue}>
              {item.total_spent.toLocaleString()} XOF
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <Searchbar
        placeholder={t('common.search')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <Button
          mode="outlined"
          icon="account-plus"
          onPress={() => {}}
          style={styles.actionButton}
        >
          Nouveau client
        </Button>
        <Button
          mode="text"
          onPress={() => handleSelectCustomer({ id: 0, name: 'Sans client', phone: '', loyalty_points: 0, tier: 'STANDARD', total_spent: 0 })}
        >
          {t('pos.noCustomer')}
        </Button>
      </View>

      {/* Customer List */}
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomer}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {}} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Aucun client trouvé
            </Text>
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
  searchbar: {
    margin: 12,
    borderRadius: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
  listContent: {
    padding: 12,
    paddingTop: 0,
  },
  customerCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  tierChip: {
    height: 24,
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 24,
  },
  statItem: {},
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#9CA3AF',
  },
});
