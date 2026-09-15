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
  private channelInitialized = false;

  constructor() {
    this.initNotificationHandler();
  }

  private initNotificationHandler() {
    try {
      const Notifications = require('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (e) {
      // Graceful fallback if expo-notifications is not yet loaded
    }
  }

  /**
   * Initializes Android Notification Channel (Required for Android 8.0+ / Android 13+)
   */
  private async initAndroidChannel(Notifications: any) {
    if (Platform.OS === 'android' && !this.channelInitialized) {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'CRM Alerts & Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#EA580C',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
        this.channelInitialized = true;
      } catch (err) {
        console.warn('[PushNotificationService] Failed to set Android notification channel:', err);
      }
    }
  }

  /**
   * Registers mobile device push token with API server and AWS SNS platform endpoint
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      let token = '';

      try {
        const Notifications = require('expo-notifications');

        // 1. Initialize Android High-Importance Channel
        await this.initAndroidChannel(Notifications);

        // 2. Request Notifications Permission (Android 13+ POST_NOTIFICATIONS & iOS alert/badge/sound)
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });
          finalStatus = status;
        }

        // 3. If permission granted, acquire Native Device Token (FCM for Android, APNs for iOS)
        if (finalStatus === 'granted') {
          // Reset iOS Badge Count on App Open
          if (Platform.OS === 'ios') {
            try {
              await Notifications.setBadgeCountAsync(0);
            } catch (badgeErr) {
              // Ignore badge error
            }
          }

          // Prioritize Native FCM/APNs Device Token for AWS SNS
          try {
            const deviceToken = await Notifications.getDevicePushTokenAsync();
            if (deviceToken && deviceToken.data) {
              token = deviceToken.data;
              console.log(`[PushNotificationService] Acquired native ${Platform.OS} device token for AWS SNS.`);
            }
          } catch (deviceTokenErr) {
            console.log('[PushNotificationService] Native device token not available (e.g. Simulator/Expo Go), falling back:', deviceTokenErr);
          }

          // Fallback to Expo Push Token if device token unavailable
          if (!token) {
            try {
              const expoTokenData = await Notifications.getExpoPushTokenAsync({
                projectId: '749b72c8-bc02-4d8a-90cd-507490ebbfdf'
              });
              if (expoTokenData && expoTokenData.data) {
                token = expoTokenData.data;
                console.log(`[PushNotificationService] Acquired Expo push token: ${token}`);
              }
            } catch (expoTokenErr) {
              console.warn('[PushNotificationService] Expo push token fallback error:', expoTokenErr);
            }
          }
        }
      } catch (e) {
        console.warn('[PushNotificationService] Native push permissions / Expo notifications error:', e);
      }

      // Do NOT send fake simulator tokens to backend
      if (!token || String(token).startsWith('sim_device_')) {
        console.warn('[PushNotificationService] No valid push token acquired. Skipping backend registration.');
        return null;
      }

      this.pushToken = token;

      // Register genuine device push token with backend
      await apiClient.post('/auth/register-push-token', {
        pushToken: token,
        platform: Platform.OS
      });

      console.log(`[PushNotificationService] Device push token (${Platform.OS}) registered successfully with backend.`);
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

      // Ensure foreground alerts, sound & badge are active
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // 1. App Open (Foreground State) Listener
      const foregroundListener = Notifications.addNotificationReceivedListener((notification: any) => {
        const data = notification?.request?.content?.data as PushNotificationPayload;
        console.log('[PushNotificationService] Received Foreground Push Notification:', data);
      });

      // 2. App Background / Closed (Terminated State) Notification Click Listener
      const responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response?.notification?.request?.content?.data as PushNotificationPayload;
        console.log('[PushNotificationService] User Tapped Push Notification:', data);

        if (Platform.OS === 'ios') {
          Notifications.setBadgeCountAsync(0).catch(() => {});
        }

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
