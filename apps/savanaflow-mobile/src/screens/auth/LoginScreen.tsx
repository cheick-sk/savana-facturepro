import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState('admin@facturepro.africa');
  const [password, setPassword] = useState('Admin1234!');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.message || t('auth.invalidCredentials')
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.innerContainer}>
          <Surface style={styles.card} elevation={4}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>🛒</Text>
              <Text style={styles.title}>{t('common.appName')}</Text>
              <Text style={styles.subtitle}>{t('pos.title')}</Text>
            </View>

            <View style={styles.form}>
              <TextInput
                label={t('auth.email')}
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                left={<TextInput.Icon icon="email" />}
              />

              <TextInput
                label={t('auth.password')}
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                style={styles.input}
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />

              <Button
                mode="contained"
                onPress={handleLogin}
                disabled={isLoading}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  t('auth.loginButton')
                )}
              </Button>
            </View>

            <View style={styles.demoInfo}>
              <Text style={styles.demoText}>Demo: admin@facturepro.africa</Text>
              <Text style={styles.demoText}>Password: Admin1234!</Text>
            </View>
          </Surface>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F4E79',
  },
  scrollContent: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F4E79',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  form: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#1F4E79',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  demoInfo: {
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoText: {
    fontSize: 12,
    color: '#F57C00',
  },
});
