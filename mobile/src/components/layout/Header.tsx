import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useOffline } from '../../hooks/useOffline';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightAction,
  transparent = false,
}) => {
  const insets = useSafeAreaInsets();
  const { user, selectedApp } = useAuth();
  const { isOffline, queueCount } = useOffline();

  const getAppBarColor = () => {
    switch (selectedApp) {
      case 'facturepro':
        return '#2563eb';
      case 'savanaflow':
        return '#10b981';
      case 'schoolflow':
        return '#8b5cf6';
      default:
        return '#2563eb';
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
        transparent && styles.transparent,
        { backgroundColor: transparent ? 'transparent' : '#ffffff' },
      ]}
    >
      <StatusBar barStyle={transparent ? 'light-content' : 'dark-content'} />
      
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
          )}
          
          {title ? (
            <Text style={styles.title}>{title}</Text>
          ) : (
            <View>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.rightSection}>
          {isOffline && (
            <Badge label="Hors ligne" variant="warning" size="sm" />
          )}
          
          {queueCount > 0 && (
            <View style={styles.queueBadge}>
              <Text style={styles.queueCount}>{queueCount}</Text>
            </View>
          )}
          
          {rightAction}
        </View>
      </View>
    </View>
  );
};

interface SimpleHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const SimpleHeader: React.FC<SimpleHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.simpleContainer, { paddingTop: insets.top }]}>
      <View style={styles.simpleContent}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        )}
        
        <View style={styles.titleContainer}>
          <Text style={styles.simpleTitle}>{title}</Text>
          {subtitle && <Text style={styles.simpleSubtitle}>{subtitle}</Text>}
        </View>
        
        {rightAction}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  transparent: {
    borderBottomWidth: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  greeting: {
    fontSize: 12,
    color: '#6b7280',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  queueCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  simpleContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  simpleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleContainer: {
    flex: 1,
  },
  simpleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  simpleSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default Header;
