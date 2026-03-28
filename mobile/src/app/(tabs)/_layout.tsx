import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabBar } from '../../components/layout/TabBar';
import { useAuth } from '../../hooks/useAuth';
import { Loading } from '../../components/ui/Loading';

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, selectedApp, requireAuth, requireApp } = useAuth();
  const [activeTab, setActiveTab] = useState(getActiveTab(pathname));

  function getActiveTab(path: string): string {
    if (path.includes('invoices')) return 'invoices';
    if (path.includes('products')) return 'products';
    if (path.includes('pos')) return 'pos';
    if (path.includes('attendance')) return 'attendance';
    if (path.includes('students')) return 'students';
    if (path.includes('settings')) return 'settings';
    return 'index';
  }

  const handleTabPress = (key: string) => {
    setActiveTab(key);
    switch (key) {
      case 'index':
        router.replace('/(tabs)');
        break;
      case 'invoices':
        router.replace('/(tabs)/invoices');
        break;
      case 'products':
        router.replace('/(tabs)/products');
        break;
      case 'pos':
        router.replace('/pos');
        break;
      case 'attendance':
        router.replace('/attendance');
        break;
      case 'students':
        router.replace('/(tabs)/students');
        break;
      case 'settings':
        router.replace('/(tabs)/settings');
        break;
      default:
        router.replace('/(tabs)');
    }
  };

  // Check authentication
  if (!requireAuth()) {
    return <Loading fullScreen />;
  }

  // Check app selection
  if (!requireApp()) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>
      <TabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
  },
});
