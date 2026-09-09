import { Platform } from 'react-native';
import { apiClient } from '../api/apiClient';

export interface PushNotificationPayload {
  title?: string;
  message?: string;
  type?: string;
  relatedId?: string;
  leadId?: string;
  screen?: string;
}

class PushNotificationService {
  private pushToken: string | null = null;

  /**
   * Registers mobile device push token with API server and AWS SNS platform endpoint
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // In Expo managed workflow / native build, fetch device push token
      let token = '';
      try {
        const Notifications = require('expo-notifications');
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus === 'granted') {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          token = tokenData.data;
        }
      } catch (e) {
        console.log('[PushNotificationService] Native push permissions / Expo notifications fallback:', e);
      }

      if (!token) {
        token = `sim_device_${Platform.OS}_${Date.now()}`;
      }

      this.pushToken = token;

      // Register device push token with backend for AWS SNS Endpoint creation
      await apiClient.post('/auth/register-push-token', {
        pushToken: token,
        platform: Platform.OS
      });

      console.log('[PushNotificationService] Device push token registered successfully with AWS SNS backend.');
      return token;
    } catch (err) {
      console.warn('[PushNotificationService] Error registering push token:', err);
      return null;
    }
  }

  /**
   * Configures foreground, background, and app closed (terminated) push alert behaviors
   */
  setupNotificationListeners(onNavigateToScreen?: (screen: string, params?: Record<string, any>) => void) {
    try {
      const Notifications = require('expo-notifications');

      // 1. App Open (Foreground State): Display top alert banner & trigger sound
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // 2. App Open (Foreground State) Listener
      const foregroundListener = Notifications.addNotificationReceivedListener((notification: any) => {
        const data = notification?.request?.content?.data as PushNotificationPayload;
        console.log('[PushNotificationService] Received Foreground Push Notification:', data);
      });

      // 3. App Background / Closed (Terminated State) Notification Click Listener
      const responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response?.notification?.request?.content?.data as PushNotificationPayload;
        console.log('[PushNotificationService] User Tapped Push Notification:', data);

        if (data && onNavigateToScreen) {
          const targetScreen = data.screen || (data.leadId ? 'LeadDetails' : 'Notifications');
          const params = data.leadId ? { leadId: data.leadId } : { notificationId: data.relatedId };
          onNavigateToScreen(targetScreen, params);
        }
      });

      return () => {
        foregroundListener.remove();
        responseListener.remove();
      };
    } catch (err) {
      console.log('[PushNotificationService] Notifications listeners fallback mode:', err);
      return () => {};
    }
  }
}

export const pushNotificationService = new PushNotificationService();
