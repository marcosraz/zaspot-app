/**
 * Notifications Context - Manages push notifications and price alerts
 * Handles push token registration, price alerts, charging & reservation reminders
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from '../lib/api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PriceAlert {
  id: string;
  enabled: boolean;
  thresholdKwh: number; // Price threshold in CZK/kWh
  notifyBelow: boolean; // true = notify when price falls below, false = above
}

interface NotificationSettings {
  permissionGranted: boolean;
  pushToken: string | null;
  priceAlerts: PriceAlert[];
  lastNotificationTime: number | null;
}

interface NotificationsContextType {
  settings: NotificationSettings;
  hasPermission: boolean;
  pushToken: string | null;
  requestPermission: () => Promise<boolean>;
  addPriceAlert: (alert: Omit<PriceAlert, 'id'>) => void;
  removePriceAlert: (id: string) => void;
  togglePriceAlert: (id: string) => void;
  updatePriceAlert: (id: string, updates: Partial<PriceAlert>) => void;
  checkPriceAndNotify: (currentPrice: number) => Promise<void>;
  sendTestNotification: () => Promise<void>;
  scheduleReservationReminder: (reservationId: string, stationName: string, startTime: string) => Promise<void>;
  cancelReservationReminder: (reservationId: string) => Promise<void>;
  notifyChargingStarted: (stationName: string) => Promise<void>;
  notifyChargingComplete: (stationName: string, energyKwh: number, costCzk?: number) => Promise<void>;
  isLoaded: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const NOTIFICATIONS_STORAGE_KEY = '@zaspot_notifications';
const NOTIFICATION_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown between price notifications
const RESERVATION_REMINDER_MINUTES = 30; // Remind 30 minutes before reservation

const defaultSettings: NotificationSettings = {
  permissionGranted: false,
  pushToken: null,
  priceAlerts: [
    {
      id: 'default-low',
      enabled: true,
      thresholdKwh: 2.0,
      notifyBelow: true,
    },
  ],
  lastNotificationTime: null,
};

interface NotificationsProviderProps {
  children: ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    registerForPushNotifications();

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (isLoaded) {
      saveSettings(settings);
    }
  }, [settings, isLoaded]);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#16A34A',
      });

      // Separate channel for charging updates
      await Notifications.setNotificationChannelAsync('charging', {
        name: 'Charging',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
        lightColor: '#16A34A',
      });

      // Separate channel for reservations
      await Notifications.setNotificationChannelAsync('reservations', {
        name: 'Reservations',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
        lightColor: '#8B5CF6',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') {
      setSettings(prev => ({ ...prev, permissionGranted: true }));
      await getPushTokenAndRegister();
    }
  };

  // Get Expo push token and register with backend
  const getPushTokenAndRegister = async () => {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '5fde0a0a-a4f2-4abc-8023-245acefc126b',
      });
      const token = tokenData.data;

      setSettings(prev => ({ ...prev, pushToken: token }));

      // Register token with backend for server-sent notifications
      await apiFetch('/notifications/register-token', {
        method: 'POST',
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          deviceName: Device.deviceName,
        }),
        requireAuth: true,
      });
    } catch (error) {
      console.log('Push token registration skipped:', error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!Device.isDevice) {
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const granted = finalStatus === 'granted';
    setSettings(prev => ({ ...prev, permissionGranted: granted }));

    if (granted) {
      await getPushTokenAndRegister();
    }
    return granted;
  }, []);

  const addPriceAlert = useCallback((alert: Omit<PriceAlert, 'id'>) => {
    const newAlert: PriceAlert = {
      ...alert,
      id: `alert-${Date.now()}`,
    };
    setSettings(prev => ({
      ...prev,
      priceAlerts: [...prev.priceAlerts, newAlert],
    }));
  }, []);

  const removePriceAlert = useCallback((id: string) => {
    setSettings(prev => ({
      ...prev,
      priceAlerts: prev.priceAlerts.filter(a => a.id !== id),
    }));
  }, []);

  const togglePriceAlert = useCallback((id: string) => {
    setSettings(prev => ({
      ...prev,
      priceAlerts: prev.priceAlerts.map(a =>
        a.id === id ? { ...a, enabled: !a.enabled } : a
      ),
    }));
  }, []);

  const updatePriceAlert = useCallback((id: string, updates: Partial<PriceAlert>) => {
    setSettings(prev => ({
      ...prev,
      priceAlerts: prev.priceAlerts.map(a =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
  }, []);

  const checkPriceAndNotify = useCallback(async (currentPrice: number) => {
    if (!settings.permissionGranted) return;

    // Check cooldown
    if (settings.lastNotificationTime) {
      const timeSinceLastNotification = Date.now() - settings.lastNotificationTime;
      if (timeSinceLastNotification < NOTIFICATION_COOLDOWN_MS) {
        return;
      }
    }

    // Check each enabled alert
    for (const alert of settings.priceAlerts) {
      if (!alert.enabled) continue;

      const shouldNotify = alert.notifyBelow
        ? currentPrice <= alert.thresholdKwh
        : currentPrice >= alert.thresholdKwh;

      if (shouldNotify) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: alert.notifyBelow ? 'Nízká cena elektřiny!' : 'Vysoká cena elektřiny!',
            body: `Aktuální cena ${currentPrice.toFixed(2)} Kč/kWh je ${alert.notifyBelow ? 'pod' : 'nad'} ${alert.thresholdKwh.toFixed(2)} Kč/kWh. ${alert.notifyBelow ? 'Ideální čas na nabíjení!' : 'Zvažte odložení nabíjení.'}`,
            data: { price: currentPrice, alertId: alert.id },
          },
          trigger: null, // Immediate
        });

        setSettings(prev => ({ ...prev, lastNotificationTime: Date.now() }));
        break; // Only send one notification at a time
      }
    }
  }, [settings.permissionGranted, settings.priceAlerts, settings.lastNotificationTime]);

  const sendTestNotification = useCallback(async () => {
    if (!settings.permissionGranted) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'ZAspot Test',
        body: 'Push notifikace fungují správně! Budete informováni o nízkých cenách elektřiny.',
        data: { test: true },
      },
      trigger: null,
    });
  }, [settings.permissionGranted, requestPermission]);

  /**
   * Schedule a local notification reminder before a reservation
   */
  const scheduleReservationReminder = useCallback(async (
    reservationId: string,
    stationName: string,
    startTime: string
  ) => {
    if (!settings.permissionGranted) return;

    const reminderTime = new Date(startTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - RESERVATION_REMINDER_MINUTES);

    // Don't schedule if reminder time has already passed
    if (reminderTime <= new Date()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rezervace začíná brzy',
        body: `Vaše rezervace na ${stationName} začíná za ${RESERVATION_REMINDER_MINUTES} minut.`,
        data: { type: 'reservation_reminder', reservationId },
        ...(Platform.OS === 'android' && { channelId: 'reservations' }),
      },
      trigger: { date: reminderTime, type: Notifications.SchedulableTriggerInputTypes.DATE },
      identifier: `reservation-${reservationId}`,
    });
  }, [settings.permissionGranted]);

  /**
   * Cancel a scheduled reservation reminder
   */
  const cancelReservationReminder = useCallback(async (reservationId: string) => {
    await Notifications.cancelScheduledNotificationAsync(`reservation-${reservationId}`);
  }, []);

  /**
   * Show notification when charging starts
   */
  const notifyChargingStarted = useCallback(async (stationName: string) => {
    if (!settings.permissionGranted) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nabíjení zahájeno',
        body: `Nabíjení na ${stationName} bylo úspěšně zahájeno.`,
        data: { type: 'charging_started' },
        ...(Platform.OS === 'android' && { channelId: 'charging' }),
      },
      trigger: null,
    });
  }, [settings.permissionGranted]);

  /**
   * Show notification when charging completes
   */
  const notifyChargingComplete = useCallback(async (
    stationName: string,
    energyKwh: number,
    costCzk?: number
  ) => {
    if (!settings.permissionGranted) return;

    const costText = costCzk != null ? ` • ${costCzk.toFixed(2)} CZK` : '';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nabíjení dokončeno',
        body: `${stationName}: ${energyKwh.toFixed(2)} kWh${costText}`,
        data: { type: 'charging_complete' },
        ...(Platform.OS === 'android' && { channelId: 'charging' }),
      },
      trigger: null,
    });
  }, [settings.permissionGranted]);

  return (
    <NotificationsContext.Provider
      value={{
        settings,
        hasPermission: settings.permissionGranted,
        pushToken: settings.pushToken,
        requestPermission,
        addPriceAlert,
        removePriceAlert,
        togglePriceAlert,
        updatePriceAlert,
        checkPriceAndNotify,
        sendTestNotification,
        scheduleReservationReminder,
        cancelReservationReminder,
        notifyChargingStarted,
        notifyChargingComplete,
        isLoaded,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
