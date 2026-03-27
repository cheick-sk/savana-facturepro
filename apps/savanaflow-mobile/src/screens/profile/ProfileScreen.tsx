import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, Divider, Avatar, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuthStore();

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={`${user?.first_name?.[0] || 'U'}${user?.last_name?.[0] || ''}`}
          style={styles.avatar}
        />
        <Text style={styles.name}>
          {user?.first_name} {user?.last_name}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
      </View>

      <Divider />

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>127</Text>
          <Text style={styles.statLabel}>Ventes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>1.2M</Text>
          <Text style={styles.statLabel}>Chiffre d'affaires</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>15</Text>
          <Text style={styles.statLabel}>Jours</Text>
        </View>
      </View>

      <Divider />

      {/* Info */}
      <List.Section>
        <List.Subheader>Informations</List.Subheader>
        <List.Item
          title="Email"
          description={user?.email}
          left={props => <List.Icon {...props} icon="email" />}
        />
        <List.Item
          title="Rôle"
          description={user?.role}
          left={props => <List.Icon {...props} icon="badge-account" />}
        />
        <List.Item
          title="Magasin"
          description="Magasin Principal"
          left={props => <List.Icon {...props} icon="store" />}
        />
      </List.Section>

      <Divider />

      {/* Activity */}
      <List.Section>
        <List.Subheader>Activité récente</List.Subheader>
        <List.Item
          title="Dernière vente"
          description="Il y a 5 minutes"
          left={props => <List.Icon {...props} icon="receipt" />}
        />
        <List.Item
          title="Dernière connexion"
          description="Aujourd'hui à 08:30"
          left={props => <List.Icon {...props} icon="login" />}
        />
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  avatar: {
    marginBottom: 16,
    backgroundColor: '#1F4E79',
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  role: {
    fontSize: 12,
    color: '#1F4E79',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F4E79',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});
