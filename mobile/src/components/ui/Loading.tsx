import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message, fullScreen = true }: LoadingProps) {
  return (
    <View style={[styles.container, !fullScreen && styles.inline]}>
      <ActivityIndicator size="large" color="#3B82F6" />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 16,
  },
  inline: {
    flex: 0,
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
  },
});
