import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Header } from '../../components/layout/Header';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import { useOffline } from '../../hooks/useOffline';

export default function DashboardScreen() {
  const { user, selectedApp, isFacturePro, isSavanaFlow, isSchoolFlow } = useAuth();
  const { isOffline } = useOffline();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const getAppColor = () => {
    switch (selectedApp) {
      case 'facturepro':
        return '#2563eb';
      case 'savanaflow':
        return '#10b981';
      case 'schoolflow':
        return '#8b5cf6';
      default:
        return '#2563eb';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const renderFactureProDashboard = () => (
    <>
      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Ventes du jour</Text>
          <Text style={[styles.statValue, { color: getAppColor() }]}>
            245,000 FCFA
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Factures en attente</Text>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>12</Text>
        </Card>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Clients</Text>
          <Text style={[styles.statValue, { color: getAppColor() }]}>156</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Devis</Text>
          <Text style={[styles.statValue, { color: getAppColor() }]}>8</Text>
        </Card>
      </View>

      {/* Quick Actions */}
      <Card style={styles.sectionCard}>
        <CardHeader title="Actions rapides" />
        <CardContent>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/invoices/create')}>
              <View style={[styles.actionIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="add-circle" size={24} color="#2563eb" />
              </View>
              <Text style={styles.actionLabel}>Nouvelle facture</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/invoices')}>
              <View style={[styles.actionIcon, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="document-text" size={24} color="#10b981" />
              </View>
              <Text style={styles.actionLabel}>Factures</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/products')}>
              <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="cube" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.actionLabel}>Produits</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/reports')}>
              <View style={[styles.actionIcon, { backgroundColor: '#f5f3ff' }]}>
                <Ionicons name="bar-chart" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.actionLabel}>Rapports</Text>
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card style={styles.sectionCard}>
        <CardHeader 
          title="Factures récentes" 
          action={
            <TouchableOpacity onPress={() => router.push('/invoices')}>
              <Text style={{ color: getAppColor() }}>Voir tout</Text>
            </TouchableOpacity>
          }
        />
        <CardContent>
          {[
            { number: 'FAC-2024-001', client: 'Entreprise ABC', amount: '125,000 FCFA', status: 'paid' },
            { number: 'FAC-2024-002', client: 'SARL XYZ', amount: '85,000 FCFA', status: 'sent' },
            { number: 'FAC-2024-003', client: 'Client 123', amount: '45,000 FCFA', status: 'overdue' },
          ].map((invoice, index) => (
            <TouchableOpacity 
              key={invoice.number} 
              style={[styles.invoiceItem, index > 0 && styles.invoiceItemBorder]}
              onPress={() => router.push(`/invoices/${invoice.number}`)}
            >
              <View style={styles.invoiceInfo}>
                <Text style={styles.invoiceNumber}>{invoice.number}</Text>
                <Text style={styles.invoiceClient}>{invoice.client}</Text>
              </View>
              <View style={styles.invoiceRight}>
                <Text style={styles.invoiceAmount}>{invoice.amount}</Text>
                <Badge 
                  label={invoice.status === 'paid' ? 'Payée' : invoice.status === 'sent' ? 'Envoyée' : 'En retard'}
                  variant={invoice.status === 'paid' ? 'success' : invoice.status === 'sent' ? 'primary' : 'danger'}
                  size="sm"
                />
              </View>
            </TouchableOpacity>
          ))}
        </CardContent>
      </Card>
    </>
  );

  const renderSavanaFlowDashboard = () => (
    <>
      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Ventes du jour</Text>
          <Text style={[styles.statValue, { color: getAppColor() }]}>
            542,000 FCFA
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Transactions</Text>
          <Text style={[styles.statValue, { color: getAppColor() }]}>48</Text>
        </Card>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Panier moyen</Text>
          <Text style={[styles.statValue, { color: getAppColor() }]}>
            11,292 FCFA
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Stock faible</Text>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>5</Text>
        </Card>
      </View>

      {/* Quick Actions */}
      <Card style={styles.sectionCard}>
        <CardHeader title="Actions rapides" />
        <CardContent>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/pos')}>
              <View style={[styles.actionIcon, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="cart" size={24} color="#10b981" />
              </View>
              <Text style={styles.actionLabel}>Nouvelle vente</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/pos/cart')}>
              <View style={[styles.actionIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="scan" size={24} color="#2563eb" />
              </View>
              <Text style={styles.actionLabel}>Scanner</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/products')}>
              <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="cube" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.actionLabel}>Produits</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/reports')}>
              <View style={[styles.actionIcon, { backgroundColor: '#f5f3ff' }]}>
                <Ionicons name="bar-chart" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.actionLabel}>Rapports</Text>
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>
    </>
  );

  const renderSchoolFlowDashboard = () => (
    <>
      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Élèves présents</Text>
          <Text style={[styles.statValue, { color: getAppColor() }]}>245</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Absents</Text>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>12</Text>
        </Card>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Classes</Text>
          <Text style={[styles.statValue, { color: getAppColor() }]}>18</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Appels à faire</Text>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>3</Text>
        </Card>
      </View>

      {/* Quick Actions */}
      <Card style={styles.sectionCard}>
        <CardHeader title="Actions rapides" />
        <CardContent>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/attendance/take')}>
              <View style={[styles.actionIcon, { backgroundColor: '#f5f3ff' }]}>
                <Ionicons name="checkbox" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.actionLabel}>Faire l'appel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/attendance')}>
              <View style={[styles.actionIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="calendar" size={24} color="#2563eb" />
              </View>
              <Text style={styles.actionLabel}>Historique</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/students')}>
              <View style={[styles.actionIcon, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="people" size={24} color="#10b981" />
              </View>
              <Text style={styles.actionLabel}>Élèves</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/reports')}>
              <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="bar-chart" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.actionLabel}>Rapports</Text>
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>
    </>
  );

  return (
    <View style={styles.container}>
      <Header />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>{getGreeting()}, {user?.name?.split(' ')[0] || 'Utilisateur'}</Text>
          {isOffline && (
            <Badge label="Mode hors ligne" variant="warning" />
          )}
        </View>

        {/* Dashboard Content based on App */}
        {isFacturePro && renderFactureProDashboard()}
        {isSavanaFlow && renderSavanaFlowDashboard()}
        {isSchoolFlow && renderSchoolFlowDashboard()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  greetingSection: {
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  sectionCard: {
    marginTop: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  actionItem: {
    width: '50%',
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  invoiceItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
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
    color: '#6b7280',
    marginTop: 2,
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
});
