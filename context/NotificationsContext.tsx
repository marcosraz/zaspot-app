/**
 * Notifications Context - Manages push notifications and price alerts
 * Allows users to set price thresholds for notifications
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

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
  priceAlerts: PriceAlert[];
  lastNotificationTime: number | null;
}

interface NotificationsContextType {
  settings: NotificationSettings;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  addPriceAlert: (alert: Omit<PriceAlert, 'id'>) => void;
  removePriceAlert: (id: string) => void;
  togglePriceAlert: (id: string) => void;
  updatePriceAlert: (id: string, updates: Partial<PriceAlert>) => void;
  checkPriceAndNotify: (currentPrice: number) => Promise<void>;
  sendTestNotification: () => Promise<void>;
  isLoaded: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const NOTIFICATIONS_STORAGE_KEY = '@zaspot_notifications';
const NOTIFICATION_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown between notifications

const defaultSettings: NotificationSettings = {
  permissionGranted: false,
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
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') {
      setSettings(prev => ({ ...prev, permissionGranted: true }));
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

  return (
    <NotificationsContext.Provider
      value={{
        settings,
        hasPermission: settings.permissionGranted,
        requestPermission,
        addPriceAlert,
        removePriceAlert,
        togglePriceAlert,
        updatePriceAlert,
        checkPriceAndNotify,
        sendTestNotification,
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
