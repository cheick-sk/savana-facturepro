import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationData {
  type: 'invoice' | 'sale' | 'attendance' | 'alert' | 'reminder';
  id?: string;
  [key: string]: any;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  async initialize(): Promise<string | null> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return null;
      }

      // Get push token
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
        });
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.expoPushToken = token.data;
      
      // Set up listeners
      this.setupListeners();
      
      return this.expoPushToken;
    } catch (error) {
      console.error('Notification init error:', error);
      return null;
    }
  }

  private setupListeners() {
    // Listener for receiving notifications
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    // Listener for notification responses (user taps)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as NotificationData;
        this.handleNotificationResponse(data);
      }
    );
  }

  private handleNotificationResponse(data: NotificationData) {
    // Handle navigation based on notification type
    console.log('Notification tapped:', data);
    
    // In a real app, you'd navigate to the relevant screen:
    // switch (data.type) {
    //   case 'invoice':
    //     router.push(`/facturepro/invoices/${data.id}`);
    //     break;
    //   case 'sale':
    //     router.push(`/savanaflow/sales/${data.id}`);
    //     break;
    //   case 'attendance':
    //     router.push('/schoolflow/attendance');
    //     break;
    // }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: NotificationData,
    trigger?: Notifications.NotificationRequestInput['trigger']
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: trigger || null,
    });
  }

  async scheduleReminder(
    title: string,
    body: string,
    date: Date,
    data?: NotificationData
  ): Promise<string> {
    return await this.scheduleLocalNotification(title, body, data, date);
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async setBadge(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  getPushToken(): string | null {
    return this.expoPushToken;
  }

  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }
}

export const notifications = new NotificationService();

// Convenience functions for common notifications
export const notify = {
  invoiceOverdue: async (invoiceNumber: string, amount: string) => {
    return notifications.scheduleLocalNotification(
      'Facture en retard',
      `La facture ${invoiceNumber} de ${amount} est en retard`,
      { type: 'invoice' }
    );
  },

  lowStock: async (productName: string, quantity: number) => {
    return notifications.scheduleLocalNotification(
      'Stock faible',
      `${productName}: seulement ${quantity} unités restantes`,
      { type: 'alert' }
    );
  },

  newSale: async (amount: string) => {
    return notifications.scheduleLocalNotification(
      'Nouvelle vente',
      `Vente de ${amount} enregistrée`,
      { type: 'sale' }
    );
  },

  attendanceReminder: async (className: string) => {
    return notifications.scheduleLocalNotification(
      'Appel à faire',
      `N'oubliez pas de faire l'appel pour ${className}`,
      { type: 'attendance' }
    );
  },
};
