import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth, AppType } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface AppOption {
  id: AppType;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const APPS: AppOption[] = [
  {
    id: 'facturepro',
    name: 'FacturePro',
    description: 'Facturation & Devis pour votre entreprise',
    icon: 'document-text',
    color: '#2563eb',
    bgColor: '#eff6ff',
  },
  {
    id: 'savanaflow',
    name: 'SavanaFlow',
    description: 'Point de Vente pour commerces et boutiques',
    icon: 'cart',
    color: '#10b981',
    bgColor: '#ecfdf5',
  },
  {
    id: 'schoolflow',
    name: 'SchoolFlow',
    description: 'Gestion scolaire pour établissements',
    icon: 'school',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
  },
];

export default function SelectAppScreen() {
  const { selectApp, user, logout } = useAuth();

  const handleSelectApp = (appId: AppType) => {
    selectApp(appId);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Bonjour, {user?.name || 'Utilisateur'}</Text>
          <Text style={styles.title}>Choisir une application</Text>
          <Text style={styles.subtitle}>
            Sélectionnez l'application que vous souhaitez utiliser
          </Text>
        </View>

        {/* App Cards */}
        <View style={styles.appsContainer}>
          {APPS.map((app) => (
            <TouchableOpacity
              key={app.id}
              onPress={() => handleSelectApp(app.id)}
              activeOpacity={0.7}
            >
              <Card style={styles.appCard} variant="outlined">
                <View style={styles.appCardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: app.bgColor }]}>
                    <Ionicons name={app.icon} size={32} color={app.color} />
                  </View>
                  <View style={styles.appInfo}>
                    <Text style={[styles.appName, { color: app.color }]}>
                      {app.name}
                    </Text>
                    <Text style={styles.appDescription}>{app.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Fonctionnalités clés</Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="cloud-done" size={20} color="#2563eb" />
              <Text style={styles.featureText}>Mode hors ligne</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="scan" size={20} color="#2563eb" />
              <Text style={styles.featureText}>Scanner code-barres</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="print" size={20} color="#2563eb" />
              <Text style={styles.featureText}>Impression thermique</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="globe" size={20} color="#2563eb" />
              <Text style={styles.featureText}>Multi-langues</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.footer}>
          <Button
            title="Se déconnecter"
            variant="outline"
            onPress={handleLogout}
            icon={<Ionicons name="log-out-outline" size={20} color="#2563eb" />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  appsContainer: {
    marginBottom: 32,
  },
  appCard: {
    marginBottom: 12,
  },
  appCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  appDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  featuresContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});
