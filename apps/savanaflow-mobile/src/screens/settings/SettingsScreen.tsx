import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  List,
  Switch,
  Divider,
  Button,
  useTheme,
  Dialog,
  Portal,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/auth';
import { useNetworkStore } from '../../store/network';
import { changeLanguage, getCurrentLanguage, supportedLanguages } from '../../i18n';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const { isConnected, pendingSyncCount } = useNetworkStore();

  const [languageDialogVisible, setLanguageDialogVisible] = React.useState(false);
  const currentLang = getCurrentLanguage();

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode);
    setLanguageDialogVisible(false);
  };

  const currentLanguageName = supportedLanguages.find(l => l.code === currentLang)?.name || 'Français';

  return (
    <ScrollView style={styles.container}>
      {/* Offline Status */}
      {!isConnected && (
        <View style={styles.offlineCard}>
          <Text style={styles.offlineTitle}>⚠️ {t('offline.title')}</Text>
          <Text style={styles.offlineText}>
            {pendingSyncCount > 0 
              ? `${pendingSyncCount} ventes en attente de synchronisation`
              : t('offline.message')
            }
          </Text>
        </View>
      )}

      {/* User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
        <List.Item
          title={`${user?.first_name} ${user?.last_name}`}
          description={user?.email}
          left={props => <List.Icon {...props} icon="account" />}
        />
        <List.Item
          title={user?.role?.toUpperCase()}
          description="Rôle"
          left={props => <List.Icon {...props} icon="badge-account" />}
        />
      </View>

      <Divider />

      {/* Store Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.store')}</Text>
        <List.Item
          title="Magasin Principal"
          description="Abidjan, Côte d'Ivoire"
          left={props => <List.Icon {...props} icon="store" />}
          onPress={() => {}}
        />
        <List.Item
          title="Devise"
          description="XOF (FCFA)"
          left={props => <List.Icon {...props} icon="currency-usd" />}
        />
        <List.Item
          title="Taux TVA"
          description="18%"
          left={props => <List.Icon {...props} icon="percent" />}
        />
      </View>

      <Divider />

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.title')}</Text>
        
        <List.Item
          title={t('settings.language')}
          description={currentLanguageName}
          left={props => <List.Icon {...props} icon="translate" />}
          onPress={() => setLanguageDialogVisible(true)}
        />
        
        <List.Item
          title="Impression automatique"
          description="Imprimer le ticket après chaque vente"
          left={props => <List.Icon {...props} icon="printer" />}
          right={props => <Switch value={false} onValueChange={() => {}} />}
        />
        
        <List.Item
          title="Mode hors ligne"
          description="Fonctionner sans connexion internet"
          left={props => <List.Icon {...props} icon="wifi-off" />}
          right={props => <Switch value={true} onValueChange={() => {}} />}
        />
      </View>

      <Divider />

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <List.Item
          title={t('settings.version')}
          description="1.0.0"
          left={props => <List.Icon {...props} icon="information" />}
        />
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          buttonColor="#EF4444"
        >
          {t('settings.logout')}
        </Button>
      </View>

      {/* Language Selection Dialog */}
      <Portal>
        <Dialog
          visible={languageDialogVisible}
          onDismiss={() => setLanguageDialogVisible(false)}
        >
          <Dialog.Title>{t('settings.language')}</Dialog.Title>
          <Dialog.Content>
            {supportedLanguages.map(lang => (
              <List.Item
                key={lang.code}
                title={`${lang.flag} ${lang.name}`}
                onPress={() => handleLanguageChange(lang.code)}
                right={props => 
                  currentLang === lang.code ? <List.Icon {...props} icon="check" /> : null
                }
              />
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLanguageDialogVisible(false)}>
              {t('common.close')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  offlineCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  offlineTitle: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#92400E',
  },
  offlineText: {
    fontSize: 13,
    color: '#92400E',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  logoutSection: {
    padding: 16,
    marginTop: 16,
  },
  logoutButton: {
    borderRadius: 8,
  },
});
