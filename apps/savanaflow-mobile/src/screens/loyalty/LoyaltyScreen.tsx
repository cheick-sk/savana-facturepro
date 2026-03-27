import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

export default function LoyaltyScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Surface style={styles.card}>
        <Text style={styles.title}>🎯 {t('loyalty.title')}</Text>
        <Text style={styles.subtitle}>Programme de fidélité</Text>
        <Text style={styles.description}>
          Gérez vos clients fidèles, points et récompenses.
        </Text>
        <Text style={styles.comingSoon}>
          Fonctionnalité bientôt disponible
        </Text>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  comingSoon: {
    fontSize: 12,
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});
