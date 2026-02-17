/**
 * Root Layout - App entry point
 * Sets up providers, navigation, and animated splash screen
 */

import { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { AuthProvider } from '../context/AuthContext';
import { CreditProvider } from '../context/CreditContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import { VehicleProvider } from '../context/VehicleContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import AnimatedSplash from '../components/AnimatedSplash';

// Keep the native splash screen visible while we load resources
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="station/[id]/index"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="history/index"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="reservations/index"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="receipt/[transactionId]/index"
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </>
  );
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load any data or resources here
        // For now, just a small delay to show splash
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide the native splash screen
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {showSplash ? (
        <AnimatedSplash onAnimationComplete={handleSplashComplete} />
      ) : (
        <RootLayoutNav />
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <CreditProvider>
                <FavoritesProvider>
                <VehicleProvider>
                  <NotificationsProvider>
                    <AppContent />
                  </NotificationsProvider>
                </VehicleProvider>
              </FavoritesProvider>
              </CreditProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
