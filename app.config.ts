import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ZAspot',
  slug: 'zaspot-app',
  version: '2.1.13',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'zaspot',
  // OTA updates (EAS Update): JS-only fixes reach installed apps without a new
  // APK / TestFlight build. Publish with scripts/ota-update.sh.
  updates: {
    url: 'https://u.expo.dev/5fde0a0a-a4f2-4abc-8023-245acefc126b',
    // EAS Build injects the channel from eas.json, but the Android APK is built
    // locally (scripts/build-apk-local.sh) — so it has to be declared here.
    requestHeaders: { 'expo-channel-name': 'production' },
  },
  // Runtime = app version: an update only reaches builds with the same
  // `version`. Rule: bump `version` <=> new native build; JS-only fixes go out
  // as an OTA update WITHOUT bumping it.
  runtimeVersion: { policy: 'appVersion' },
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1A1A1A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'cz.zaspot.app',
    usesAppleSignIn: true,
    buildNumber: '115',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        'ZAspot zobrazuje nabíjecí stanice v okolí na mapě.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'ZAspot zobrazuje nabíjecí stanice v okolí na mapě.',
      // Reversed iOS Client ID — required for Google OAuth redirect back into app
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            'com.googleusercontent.apps.819686551727-lfjt408d3liucikppjtoqpjs0l3mg2pg',
          ],
        },
      ],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1A1A1A',
    },
    edgeToEdgeEnabled: true,
    package: 'cz.zaspot.app',
    versionCode: 14,
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      // expo-camera's plugin already adds CAMERA, but declare it explicitly so a
      // stale/cached prebuild (local build-copy-rebuild hack) can never drop it.
      'android.permission.CAMERA',
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
    '@react-native-google-signin/google-signin',
    'expo-apple-authentication',
    [
      // AppCheckCore (via GoogleSignIn SDK) is a Swift pod that imports
      // GoogleUtilities + RecaptchaInterop — those need modular headers when
      // built as static libraries, else `pod install` fails on EAS iOS builds.
      'expo-build-properties',
      {
        ios: {
          extraPods: [
            { name: 'GoogleUtilities', modular_headers: true },
            { name: 'RecaptchaInterop', modular_headers: true },
          ],
        },
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'ZAspot potřebuje přístup k fotoaparátu pro skenování QR kódů u nabíjecích stanic.',
      },
    ],
  ],
  extra: {
    router: {},
    eas: {
      projectId: '5fde0a0a-a4f2-4abc-8023-245acefc126b',
    },
  },
  owner: 'razpi',
});
