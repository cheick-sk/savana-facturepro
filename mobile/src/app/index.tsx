import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { FileText, ShoppingCart, GraduationCap, ArrowRight } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const APPS = [
  {
    id: 'facturepro',
    name: 'FacturePro',
    description: 'Gestion de facturation et comptabilité',
    icon: FileText,
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  },
  {
    id: 'savanaflow',
    name: 'SavanaFlow',
    description: 'Point de vente et gestion de stock',
    icon: ShoppingCart,
    color: '#10B981',
    bgColor: '#ECFDF5',
  },
  {
    id: 'schoolflow',
    name: 'SchoolFlow',
    description: 'Gestion scolaire intégrée',
    icon: GraduationCap,
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
  },
];

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user, selectedApp, selectApp, logout } = useAuthStore();

  const handleAppSelect = (appId: string) => {
    selectApp(appId);
    // Navigate to the selected app's dashboard
    // In a real app, you'd use router.push(`/${appId}/dashboard`)
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {t('home.greeting')}, {user?.name || 'Utilisateur'}
            </Text>
            <Text style={styles.subtitle}>{t('home.selectApp')}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>{t('common.logout')}</Text>
          </TouchableOpacity>
        </View>

        {/* App Cards */}
        <View style={styles.appsContainer}>
          {APPS.map((app) => {
            const IconComponent = app.icon;
            return (
              <TouchableOpacity
                key={app.id}
                style={[styles.appCard, { backgroundColor: app.bgColor }]}
                onPress={() => handleAppSelect(app.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconContainer, { backgroundColor: app.color }]}>
                  <IconComponent size={28} color="#FFFFFF" />
                </View>
                <View style={styles.appInfo}>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Text style={styles.appDescription}>{app.description}</Text>
                </View>
                <ArrowRight size={20} color={app.color} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>{t('home.quickStats')}</Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>{t('home.pendingInvoices')}</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>5</Text>
              <Text style={styles.statLabel}>{t('home.todaySales')}</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>{t('home.alerts')}</Text>
            </Card>
          </View>
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
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  appsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appInfo: {
    flex: 1,
    marginLeft: 16,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  appDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
});
