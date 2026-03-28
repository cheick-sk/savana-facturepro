import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import i18n from './i18n';
import { useSyncStore } from './stores/syncStore';

// Import expo-router entry
import 'expo-router/entry';

export default function App() {
  const [fontsLoaded] = useFonts({
    // Load custom fonts if needed
  });

  // Initialize network monitoring
  useSyncStore();

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <PaperProvider>
          <I18nextProvider i18n={i18n}>
            <StatusBar style="auto" />
          </I18nextProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
