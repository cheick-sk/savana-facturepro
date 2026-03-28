import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
  const { isAuthenticated, selectedApp } = useAuthStore();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            {/* Auth screens */}
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/register" />
            <Stack.Screen name="auth/forgot-password" />
            
            {/* App selector (home) */}
            <Stack.Screen name="index" />
            
            {/* FacturePro app */}
            <Stack.Screen name="facturepro" />
            
            {/* SavanaFlow app */}
            <Stack.Screen name="savanaflow" />
            
            {/* SchoolFlow app */}
            <Stack.Screen name="schoolflow" />
          </Stack>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
