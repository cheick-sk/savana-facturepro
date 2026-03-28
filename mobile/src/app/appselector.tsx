import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useOfflineStore } from '../../store/offlineStore';
import {
  FileText,
  ShoppingCart,
  GraduationCap,
  LogOut,
  Wifi,
  WifiOff,
  User,
} from 'lucide-react-native';

export default function AppSelectorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout, selectApp } = useAuthStore();
  const { isOnline, pendingActions } = useOfflineStore();

  const apps = [
    {
      id: 'facturepro' as const,
      name: t('apps.facturepro'),
      description: 'Facturation & Devis',
      icon: FileText,
      color: '#2563EB',
      route: '/facturepro',
    },
    {
      id: 'savanaflow' as const,
      name: t('apps.savanaflow'),
      description: 'Point de Vente & Inventaire',
      icon: ShoppingCart,
      color: '#059669',
      route: '/savanaflow',
    },
    {
      id: 'schoolflow' as const,
      name: t('apps.schoolflow'),
      description: 'Gestion Scolaire',
      icon: GraduationCap,
      color: '#7C3AED',
      route: '/schoolflow',
    },
  ];

  const handleAppSelect = async (app: typeof apps[0]) => {
    await selectApp(app.id);
    router.push(app.route);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <User size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.userName}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={styles.organisation}>{user?.organisation_name}</Text>
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            {isOnline ? (
              <Wifi size={14} color="#059669" />
            ) : (
              <WifiOff size={14} color="#DC2626" />
            )}
            <Text style={[styles.statusText, { color: isOnline ? '#059669' : '#DC2626' }]}>
              {isOnline ? t('common.online') : t('common.offline')}
            </Text>
          </View>
          
          {pendingActions.length > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>
                {pendingActions.length} en attente
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>{t('apps.selectApp')}</Text>
        
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <TouchableOpacity
              key={app.id}
              style={[styles.appCard, { borderLeftColor: app.color }]}
              onPress={() => handleAppSelect(app)}
            >
              <View style={[styles.appIcon, { backgroundColor: app.color }]}>
                <Icon size={28} color="#FFFFFF" />
              </View>
              <View style={styles.appInfo}>
                <Text style={styles.appName}>{app.name}</Text>
                <Text style={styles.appDescription}>{app.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#DC2626" />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  organisation: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    fontWeight: '500',
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  appIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  appDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});
