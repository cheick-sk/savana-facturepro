import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';

interface TabItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

interface TabBarProps {
  activeTab: string;
  onTabPress: (key: string) => void;
}

const getTabsForApp = (app: string | null): TabItem[] => {
  switch (app) {
    case 'facturepro':
      return [
        { key: 'index', label: 'Tableau de bord', icon: 'home-outline', iconActive: 'home' },
        { key: 'invoices', label: 'Factures', icon: 'document-text-outline', iconActive: 'document-text' },
        { key: 'products', label: 'Produits', icon: 'cube-outline', iconActive: 'cube' },
        { key: 'settings', label: 'Paramètres', icon: 'settings-outline', iconActive: 'settings' },
      ];
    case 'savanaflow':
      return [
        { key: 'pos', label: 'Vente', icon: 'cart-outline', iconActive: 'cart' },
        { key: 'products', label: 'Produits', icon: 'cube-outline', iconActive: 'cube' },
        { key: 'index', label: 'Tableau de bord', icon: 'home-outline', iconActive: 'home' },
        { key: 'settings', label: 'Paramètres', icon: 'settings-outline', iconActive: 'settings' },
      ];
    case 'schoolflow':
      return [
        { key: 'index', label: 'Tableau de bord', icon: 'home-outline', iconActive: 'home' },
        { key: 'attendance', label: 'Présences', icon: 'people-outline', iconActive: 'people' },
        { key: 'students', label: 'Élèves', icon: 'school-outline', iconActive: 'school' },
        { key: 'settings', label: 'Paramètres', icon: 'settings-outline', iconActive: 'settings' },
      ];
    default:
      return [
        { key: 'index', label: 'Tableau de bord', icon: 'home-outline', iconActive: 'home' },
        { key: 'settings', label: 'Paramètres', icon: 'settings-outline', iconActive: 'settings' },
      ];
  }
};

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabPress }) => {
  const insets = useSafeAreaInsets();
  const { selectedApp } = useAuth();
  const tabs = getTabsForApp(selectedApp);

  const getActiveColor = () => {
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

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const activeColor = getActiveColor();

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={24}
              color={isActive ? activeColor : '#9ca3af'}
            />
            <Text
              style={[
                styles.label,
                isActive && { color: activeColor },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default TabBar;
