import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from 'react-native-vector-icons';

import './src/i18n';
import { useAuthStore } from './src/store/auth';
import { useNetworkStore } from './src/store/network';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import POScreen from './src/screens/pos/POScreen';
import ProductsScreen from './src/screens/products/ProductsScreen';
import SalesHistoryScreen from './src/screens/sales/SalesHistoryScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';
import CustomerSelectScreen from './src/screens/customers/CustomerSelectScreen';
import PaymentScreen from './src/screens/payment/PaymentScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1F4E79',
    secondary: '#2E75B6',
    accent: '#F59E0B',
    background: '#F5F5F5',
  },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'POS':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'Products':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'History':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'More':
              iconName = focused ? 'menu' : 'menu-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1F4E79',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#1F4E79',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="POS" 
        component={POScreen} 
        options={{ title: 'Caisse' }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductsScreen} 
        options={{ title: 'Produits' }}
      />
      <Tab.Screen 
        name="History" 
        component={SalesHistoryScreen} 
        options={{ title: 'Historique' }}
      />
      <Tab.Screen 
        name="More" 
        component={SettingsScreen} 
        options={{ title: 'Plus' }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen 
        name="CustomerSelect" 
        component={CustomerSelectScreen}
        options={{ 
          presentation: 'modal',
          headerShown: true,
          title: 'Sélectionner un client'
        }}
      />
      <Stack.Screen 
        name="Payment" 
        component={PaymentScreen}
        options={{ 
          presentation: 'modal',
          headerShown: true,
          title: 'Paiement'
        }}
      />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user, isLoading, checkAuth } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await checkAuth();
      } catch (e) {
        console.warn('Auth check failed:', e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!isReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1F4E79" />
      </View>
    );
  }

  return user ? <MainStack /> : <AuthStack />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});
