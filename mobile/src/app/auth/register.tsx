import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, User, Phone } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { validateEmail, validatePassword, validatePhone } from '@/utils/validators';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { register, isLoading } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = t('auth.errors.nameRequired');
    }
    
    if (!validateEmail(formData.email)) {
      newErrors.email = t('auth.errors.emailInvalid');
    }
    
    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = t('auth.errors.phoneInvalid');
    }
    
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      newErrors.password = t(`auth.errors.${passwordValidation.message}`);
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.passwordsMismatch');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    
    try {
      await register(formData);
      Alert.alert(t('common.success'), t('auth.registerSuccess'), [
        { text: t('common.ok'), onPress: () => router.replace('/') }
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.errors.registerFailed'));
    }
  };

  if (isLoading) {
    return <Loading message={t('auth.registering')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backText}>← {t('common.back')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{t('auth.createAccount')}</Text>
          <Text style={styles.subtitle}>{t('auth.createAccountDesc')}</Text>

          {/* Form */}
          <View style={styles.form}>
            <Input
              placeholder={t('auth.fullName')}
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              leftIcon={<User size={20} color="#9CA3AF" />}
              error={errors.name}
            />

            <Input
              placeholder={t('auth.email')}
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color="#9CA3AF" />}
              error={errors.email}
            />

            <Input
              placeholder={t('auth.phone')}
              value={formData.phone}
              onChangeText={(value) => updateField('phone', value)}
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color="#9CA3AF" />}
              error={errors.phone}
            />

            <Input
              placeholder={t('auth.password')}
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              secureTextEntry={!showPassword}
              leftIcon={<Lock size={20} color="#9CA3AF" />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              }
              error={errors.password}
            />

            <Input
              placeholder={t('auth.confirmPassword')}
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              secureTextEntry={!showPassword}
              leftIcon={<Lock size={20} color="#9CA3AF" />}
              error={errors.confirmPassword}
            />

            <Button title={t('auth.signUp')} onPress={handleRegister} fullWidth />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.hasAccount')} </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.loginText}>{t('auth.login')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  backText: {
    color: '#2563EB',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 32,
  },
  form: {
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  loginText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
});
