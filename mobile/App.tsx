import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from './store/authStore';
import './i18n';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function App() {
  const { init, isLoading } = useAuthStore();

  useEffect(() => {
    init().finally(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="appselector" />
          <Stack.Screen name="facturepro" />
          <Stack.Screen name="savanaflow" />
          <Stack.Screen name="schoolflow" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
