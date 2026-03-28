import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/authStore';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
}

function StatCard({ title, value, change, isPositive, icon }: StatCardProps) {
  return (
    <Card style={styles.statCard}>
      <View style={styles.statHeader}>
        {icon}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {change && (
        <View style={styles.statChange}>
          {isPositive ? (
            <TrendingUp size={14} color="#10B981" />
          ) : (
            <TrendingDown size={14} color="#EF4444" />
          )}
          <Text style={[styles.statChangeText, { color: isPositive ? '#10B981' : '#EF4444' }]}>
            {change}
          </Text>
        </View>
      )}
    </Card>
  );
}

export default function FactureProDashboard() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = React.useState(false);
  const { user } = useAuthStore();

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Fetch latest data
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const recentInvoices = [
    { id: '1', number: 'INV-2024-001', client: 'Enterprise SARL', amount: '1,500,000 FCFA', status: 'paid' },
    { id: '2', number: 'INV-2024-002', client: 'Tech Solutions', amount: '750,000 FCFA', status: 'pending' },
    { id: '3', number: 'INV-2024-003', client: 'Boutique Plus', amount: '320,000 FCFA', status: 'overdue' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">{t('status.paid')}</Badge>;
      case 'pending':
        return <Badge variant="warning">{t('status.pending')}</Badge>;
      case 'overdue':
        return <Badge variant="error">{t('status.overdue')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('dashboard.welcome')}, {user?.name}</Text>
            <Text style={styles.subtitle}>{t('facturepro.dashboardSubtitle')}</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/facturepro/invoices/create')}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title={t('facturepro.totalRevenue')}
            value="5,250,000 FCFA"
            change="+12.5%"
            isPositive
            icon={<TrendingUp size={24} color="#10B981" />}
          />
          <StatCard
            title={t('facturepro.pendingAmount')}
            value="1,070,000 FCFA"
            change="-5.2%"
            isPositive={false}
            icon={<Clock size={24} color="#F59E0B" />}
          />
          <StatCard
            title={t('facturepro.paidInvoices')}
            value="24"
            icon={<CheckCircle size={24} color="#3B82F6" />}
          />
          <StatCard
            title={t('facturepro.overdueInvoices')}
            value="3"
            icon={<AlertCircle size={24} color="#EF4444" />}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push('/facturepro/invoices/create')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#EFF6FF' }]}>
                <FileText size={24} color="#3B82F6" />
              </View>
              <Text style={styles.quickActionText}>{t('facturepro.newInvoice')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push('/facturepro/customers/index')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#ECFDF5' }]}>
                <TrendingUp size={24} color="#10B981" />
              </View>
              <Text style={styles.quickActionText}>{t('facturepro.addCustomer')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Invoices */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('facturepro.recentInvoices')}</Text>
            <TouchableOpacity onPress={() => router.push('/facturepro/invoices/index')}>
              <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          
          {recentInvoices.map((invoice) => (
            <TouchableOpacity
              key={invoice.id}
              style={styles.invoiceItem}
              onPress={() => router.push(`/facturepro/invoices/${invoice.id}`)}
            >
              <View style={styles.invoiceInfo}>
                <Text style={styles.invoiceNumber}>{invoice.number}</Text>
                <Text style={styles.invoiceClient}>{invoice.client}</Text>
              </View>
              <View style={styles.invoiceRight}>
                <Text style={styles.invoiceAmount}>{invoice.amount}</Text>
                {getStatusBadge(invoice.status)}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    padding: 16,
  },
  statHeader: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  statChangeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  invoiceClient: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
