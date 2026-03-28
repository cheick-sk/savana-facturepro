import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useOffline } from '../../hooks/useOffline';
import { changeLanguage } from '../../i18n';
import { useTranslation } from 'react-i18next';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, selectedApp, logout, selectApp } = useAuth();
  const { queueCount, syncAll, syncing, clearQueue } = useOffline();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const getAppColor = () => {
    switch (selectedApp) {
      case 'facturepro': return '#2563eb';
      case 'savanaflow': return '#10b981';
      case 'schoolflow': return '#8b5cf6';
      default: return '#2563eb';
    }
  };

  const handleLanguageChange = async (lang: 'fr' | 'en') => {
    setLanguage(lang);
    await changeLanguage(lang);
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const handleClearSyncQueue = () => {
    Alert.alert(
      'Effacer la file d\'attente',
      'Voulez-vous vraiment supprimer toutes les opérations en attente de synchronisation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Effacer', style: 'destructive', onPress: clearQueue },
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    label, 
    value, 
    onPress, 
    type = 'default',
    showChevron = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    onPress?: () => void;
    type?: 'default' | 'switch' | 'select';
    showChevron?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={type === 'switch'}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={20} color="#6b7280" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        {value && <Text style={styles.settingValue}>{value}</Text>}
      </View>
      {type === 'switch' ? (
        <Switch
          value={type === 'switch' ? (value === 'true') : false}
          onValueChange={onPress}
          trackColor={{ false: '#d1d5db', true: getAppColor() }}
          thumbColor="#ffffff"
        />
      ) : showChevron && (
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header title="Paramètres" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileContent}>
            <View style={[styles.avatar, { backgroundColor: getAppColor() }]}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </View>
        </Card>

        {/* App Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application</Text>
          <Card>
            <TouchableOpacity
              style={styles.appSelector}
              onPress={() => selectApp(selectedApp || 'facturepro')}
            >
              <Ionicons 
                name={
                  selectedApp === 'facturepro' ? 'document-text' :
                  selectedApp === 'savanaflow' ? 'cart' : 'school'
                }
                size={24}
                color={getAppColor()}
              />
              <View style={styles.appInfo}>
                <Text style={styles.appName}>
                  {selectedApp === 'facturepro' ? 'FacturePro' :
                   selectedApp === 'savanaflow' ? 'SavanaFlow' : 'SchoolFlow'}
                </Text>
                <Text style={styles.appDescription}>Changer d'application</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Sync Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synchronisation</Text>
          <Card>
            <View style={styles.syncInfo}>
              <View style={styles.syncRow}>
                <Text style={styles.syncLabel}>Opérations en attente</Text>
                <Text style={[styles.syncValue, queueCount > 0 && { color: '#f59e0b' }]}>
                  {queueCount}
                </Text>
              </View>
              {queueCount > 0 && (
                <View style={styles.syncActions}>
                  <Button
                    title="Synchroniser"
                    variant="primary"
                    size="sm"
                    loading={syncing}
                    onPress={syncAll}
                    style={styles.syncButton}
                  />
                  <Button
                    title="Effacer"
                    variant="outline"
                    size="sm"
                    onPress={handleClearSyncQueue}
                    style={styles.syncButton}
                  />
                </View>
              )}
            </View>
          </Card>
        </View>

        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Général</Text>
          <Card>
            <SettingItem
              icon="language"
              label="Langue"
              value={language === 'fr' ? 'Français' : 'English'}
              onPress={() => handleLanguageChange(language === 'fr' ? 'en' : 'fr')}
              showChevron
            />
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setNotifications(!notifications)}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="notifications" size={20} color="#6b7280" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Notifications</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#d1d5db', true: getAppColor() }}
                thumbColor="#ffffff"
              />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Card>
            <SettingItem
              icon="help-circle"
              label="Centre d'aide"
              showChevron
            />
            <View style={styles.divider} />
            <SettingItem
              icon="chatbox"
              label="Contacter le support"
              showChevron
            />
            <View style={styles.divider} />
            <SettingItem
              icon="document-text"
              label="Conditions d'utilisation"
              showChevron
            />
            <View style={styles.divider} />
            <SettingItem
              icon="shield"
              label="Politique de confidentialité"
              showChevron
            />
          </Card>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.copyright}>© 2024 SaaS Africa</Text>
        </View>

        {/* Logout Button */}
        <Button
          title="Se déconnecter"
          variant="outline"
          onPress={() => setShowLogoutModal(true)}
          icon={<Ionicons name="log-out-outline" size={20} color="#ef4444" />}
          style={styles.logoutButton}
        />
      </ScrollView>

      <ConfirmModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Déconnexion"
        message="Voulez-vous vraiment vous déconnecter ?"
        confirmText="Se déconnecter"
        cancelText="Annuler"
        confirmVariant="danger"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    marginBottom: 24,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#111827',
  },
  settingValue: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 4,
  },
  appSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  appInfo: {
    flex: 1,
    marginLeft: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  appDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  syncInfo: {
    padding: 16,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  syncLabel: {
    fontSize: 14,
    color: '#374151',
  },
  syncValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  syncActions: {
    flexDirection: 'row',
    gap: 12,
  },
  syncButton: {
    flex: 1,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  version: {
    fontSize: 14,
    color: '#9ca3af',
  },
  copyright: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  logoutButton: {
    marginBottom: 32,
    borderColor: '#ef4444',
  },
});
