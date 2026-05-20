import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ZAspot',
  slug: 'zaspot-app',
  version: '2.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'zaspot',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1A1A1A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'cz.zaspot.app',
    buildNumber: '1',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        'ZAspot zobrazuje nabíjecí stanice v okolí na mapě.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'ZAspot zobrazuje nabíjecí stanice v okolí na mapě.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1A1A1A',
    },
    edgeToEdgeEnabled: true,
    package: 'cz.zaspot.app',
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
    config: {
      googleMaps: {
        // Hardcoded fallback — key is also baked into APK so no benefit to hiding.
        // Real protection comes from Google Cloud restrictions (package + SHA1).
        apiKey:
          process.env.GOOGLE_MAPS_API_KEY ||
          'AIzaSyCI-zsRP85UVOi0DjtiCwWBwQ1djDy741g',
      },
    },
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-dev-client',
    'expo-router',
    'expo-location',
    'expo-secure-store',
    'expo-web-browser',
  ],
  extra: {
    router: {},
    eas: {
      projectId: '5fde0a0a-a4f2-4abc-8023-245acefc126b',
    },
  },
  owner: 'razpi',
});
