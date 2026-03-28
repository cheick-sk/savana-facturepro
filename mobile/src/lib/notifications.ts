import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'sale' | 'invoice' | 'stock' | 'attendance' | 'system';
  id: string;
  [key: string]: any;
}

/**
 * Register for push notifications
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  let token = null;

  // Check if running on a physical device
  if (!Constants.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  try {
    // Get the push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    token = tokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
  }

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SaaS Africa',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    });

    // Create specific channels
    await Notifications.setNotificationChannelAsync('sales', {
      name: 'Ventes',
      importance: Notifications.AndroidImportance.HIGH,
    });

    await Notifications.setNotificationChannelAsync('invoices', {
      name: 'Factures',
      importance: Notifications.AndroidImportance.HIGH,
    });

    await Notifications.setNotificationChannelAsync('stock', {
      name: 'Stock',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return token;
};

/**
 * Send a local notification
 */
export const sendLocalNotification = async (
  title: string,
  body: string,
  data?: NotificationData
): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'default',
    },
    trigger: null, // Immediately
  });
};

/**
 * Schedule a notification for later
 */
export const scheduleNotification = async (
  title: string,
  body: string,
  date: Date,
  data?: NotificationData
): Promise<string> => {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'default',
    },
    trigger: date,
  });
};

/**
 * Cancel a scheduled notification
 */
export const cancelNotification = async (identifier: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(identifier);
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Get all scheduled notifications
 */
export const getScheduledNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  return await Notifications.getAllScheduledNotificationsAsync();
};

/**
 * Set notification badge count (iOS only)
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  await Notifications.setBadgeCountAsync(count);
};

/**
 * Clear notification badge
 */
export const clearBadge = async (): Promise<void> => {
  await Notifications.setBadgeCountAsync(0);
};

/**
 * Add notification received listener
 */
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Add notification response listener (when user taps notification)
 */
export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Notification templates for common scenarios
 */
export const notify = {
  saleCreated: (amount: number, customer?: string) =>
    sendLocalNotification(
      'Nouvelle vente',
      `Vente de ${amount.toLocaleString()} FCFA${customer ? ` - ${customer}` : ''}`,
      { type: 'sale', id: Date.now().toString() }
    ),

  invoiceDue: (invoiceNumber: string, amount: number) =>
    sendLocalNotification(
      'Facture à échéance',
      `Facture ${invoiceNumber} de ${amount.toLocaleString()} FCFA`,
      { type: 'invoice', id: invoiceNumber }
    ),

  lowStock: (productName: string, quantity: number) =>
    sendLocalNotification(
      'Stock faible',
      `${productName}: ${quantity} unités restantes`,
      { type: 'stock', id: productName }
    ),

  paymentReceived: (amount: number, from: string) =>
    sendLocalNotification(
      'Paiement reçu',
      `${amount.toLocaleString()} FCFA de ${from}`,
      { type: 'invoice', id: Date.now().toString() }
    ),

  attendanceReminder: (className: string) =>
    sendLocalNotification(
      'Rappel d\'appel',
      `N'oubliez pas de faire l'appel pour ${className}`,
      { type: 'attendance', id: className }
    ),
};

export default {
  registerForPushNotifications,
  sendLocalNotification,
  scheduleNotification,
  cancelNotification,
  cancelAllNotifications,
  getScheduledNotifications,
  setBadgeCount,
  clearBadge,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  notify,
};
