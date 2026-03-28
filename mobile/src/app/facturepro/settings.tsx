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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Moon,
  Bell,
  Globe,
  Shield,
  Printer,
  Database,
  HelpCircle,
  LogOut,
  ChevronRight,
  Fingerprint,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
}

function SettingItem({ icon, title, subtitle, value, onPress, rightComponent }: SettingItemProps) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingIcon}>{icon}</View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {rightComponent}
      {onPress && !rightComponent && <ChevronRight size={20} color="#9CA3AF" />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { logout, user } = useAuthStore();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      t('settings.logoutTitle'),
      t('settings.logoutMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('settings.logout'), 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('common.settings')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile */}
        <Card style={styles.section}>
          <TouchableOpacity style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'Utilisateur'}</Text>
              <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </Card>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>
        <Card style={styles.section}>
          <SettingItem
            icon={<Moon size={20} color="#6B7280" />}
            title={t('settings.darkMode')}
            rightComponent={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<Bell size={20} color="#6B7280" />}
            title={t('settings.notifications')}
            rightComponent={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<Globe size={20} color="#6B7280" />}
            title={t('settings.language')}
            value="Français"
            onPress={() => {}}
          />
        </Card>

        {/* Security */}
        <Text style={styles.sectionTitle}>{t('settings.security')}</Text>
        <Card style={styles.section}>
          <SettingItem
            icon={<Fingerprint size={20} color="#6B7280" />}
            title={t('settings.biometric')}
            subtitle={t('settings.biometricDesc')}
            rightComponent={
              <Switch
                value={biometric}
                onValueChange={setBiometric}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<Shield size={20} color="#6B7280" />}
            title={t('settings.changePassword')}
            onPress={() => {}}
          />
        </Card>

        {/* Business Settings */}
        <Text style={styles.sectionTitle}>{t('settings.business')}</Text>
        <Card style={styles.section}>
          <SettingItem
            icon={<Printer size={20} color="#6B7280" />}
            title={t('settings.printer')}
            subtitle={t('settings.printerDesc')}
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<Database size={20} color="#6B7280" />}
            title={t('settings.offlineData')}
            subtitle={t('settings.offlineDataDesc')}
            onPress={() => {}}
          />
        </Card>

        {/* Help */}
        <Text style={styles.sectionTitle}>{t('settings.help')}</Text>
        <Card style={styles.section}>
          <SettingItem
            icon={<HelpCircle size={20} color="#6B7280" />}
            title={t('settings.helpCenter')}
            onPress={() => {}}
          />
        </Card>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginLeft: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: '#111827',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 68,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 24,
  },
});
