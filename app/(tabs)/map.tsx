/**
 * Map Screen - Charging stations map with clustering
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { ChargingStation } from '../../lib/stations';
import { fetchStationsWithCache, fetchOcppStationsWithCache, formatCacheAge } from '../../lib/stationsCache';
import { fetchEmpStations, empRemoteStart } from '../../lib/v2Features';
import { openNavigationTo } from '../../lib/navigation';
import FavoriteButton from '../../components/FavoriteButton';
import { LiveStationPrice } from '../../components/LiveStationPrice';
import { loadPriceContext, getStationPriceCzk, sortByPrice, PriceContext } from '../../lib/stationPrices';
import { calculateDistance } from '../../lib/routePlanner';

// Region type
type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export default function MapScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { isFavorite } = useFavorites();
  const { symbol } = useCurrency();
  const insets = useSafeAreaInsets();
  // Legacy ref slot (former native MapView). The WebView has its own ref.
  const mapRef = useRef<unknown>(null);
  void mapRef;

  // Diagnostic: tells when the WebView Leaflet map has loaded
  const [mapStatus, setMapStatus] = useState<'init' | 'ready' | 'loaded'>('init');
  const webViewRef = useRef<WebView>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [ocppStations, setOcppStations] = useState<ChargingStation[]>([]);
  // Hubject roaming stations — loaded lazily when user toggles "Vše"
  const [empStations, setEmpStations] = useState<ChargingStation[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [networkFilter, setNetworkFilter] = useState<'zaspot' | 'all'>('zaspot');
  const [isOffline, setIsOffline] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dcOnly: false,
    acOnly: false,
    availableOnly: false,
    favoritesOnly: false,
    freeParking: false,
    connectorType: null as string | null,
    minPower: 0,
    // Max price in CZK/kWh (0 = off). Stations without a published price are
    // excluded while this filter is active — "unknown" is not "cheap".
    maxPrice: 0,
  });
  // Live prices for sorting/filtering (ZAspot bulk prices + EUR/CZK rate)
  const [priceCtx, setPriceCtx] = useState<PriceContext | null>(null);
  const [showCheapest, setShowCheapest] = useState(false);
  const [empStarting, setEmpStarting] = useState(false);

  // Default: Czech Republic center
  const [region, setRegion] = useState<Region>({
    latitude: 49.8175,
    longitude: 15.4730,
    latitudeDelta: 3,
    longitudeDelta: 3,
  });

  useEffect(() => {
    loadStations();
    requestLocationPermission();
    loadPriceContext().then(setPriceCtx).catch(() => {});
  }, []);

  const loadStations = async () => {
    setLoading(true);
    try {
      // Load both ZAspot's own OCPP stations + public stations DB in parallel
      const [ocppResult, publicResult] = await Promise.all([
        fetchOcppStationsWithCache(),
        fetchStationsWithCache(),
      ]);

      setOcppStations(ocppResult.stations);
      setStations(publicResult.stations);
      const { isFromCache, cacheAge } = publicResult;
      setIsOffline(isFromCache);

      if (isFromCache && cacheAge) {
        setCacheInfo(`Offline • Cache: ${formatCacheAge(cacheAge)}`);
      } else {
        setCacheInfo(null);
      }
    } catch (error) {
      console.error('Error loading stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    }
  };

  // ── Hubject roaming stations: loaded PER MAP VIEWPORT (like the web map).
  // The full Hubject set is ~53k stations; a single radius fetch capped at a
  // few hundred rows left the map looking empty. Instead Leaflet reports its
  // bounds after every pan/zoom and we fetch up to 1000 stations for exactly
  // that box, merging into a session cache so panning back is instant.
  const EMP_MIN_ZOOM = 8; // below this a viewport spans whole countries — skip
  const empCacheRef = useRef<Map<string, ChargingStation>>(new Map());
  const empDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkFilterRef = useRef(networkFilter);
  networkFilterRef.current = networkFilter;

  const mapEmpToStation = (s: import('../../lib/v2Features').EmpStation): ChargingStation => ({
    id: 'emp-' + s.evse_id,
    name: s.name,
    address: s.address,
    city: null,
    postal_code: null,
    country: 'EU',
    latitude: s.latitude,
    longitude: s.longitude,
    type: s.max_power_kw >= 50 ? 'DC' : 'AC',
    power_kw: s.max_power_kw,
    price_per_kwh: s.price_per_kwh,
    available: s.status === 'available',
    status: s.status === 'available' ? 'operational' : 'offline',
    operator: s.operator,
    operator_phone: null,
    connector_types: s.connectors.map((c) => c.type),
    num_connectors: s.connectors.length,
    access_hours: '24/7',
    parking_fee: false,
    description: null,
  });

  const loadEmpForBounds = useCallback((b: { west: number; south: number; east: number; north: number }) => {
    setEmpLoading(true);
    fetchEmpStations({ bounds: `${b.west},${b.south},${b.east},${b.north}`, limit: 1000 })
      .then((res) => {
        if (res.ok && res.data?.success) {
          const cache = empCacheRef.current;
          res.data.stations.forEach((s) => {
            const st = mapEmpToStation(s);
            cache.set(st.id, st);
          });
          setEmpStations(Array.from(cache.values()));
        }
      })
      .finally(() => setEmpLoading(false));
  }, []);

  const onMapBounds = useCallback((msg: { west: number; south: number; east: number; north: number; zoom: number }) => {
    if (networkFilterRef.current !== 'all') return;
    if (msg.zoom < EMP_MIN_ZOOM) return;
    if (empDebounceRef.current) clearTimeout(empDebounceRef.current);
    empDebounceRef.current = setTimeout(() => loadEmpForBounds(msg), 500);
  }, [loadEmpForBounds]);

  // Switching to 'Vše' → ask Leaflet for its current viewport to trigger the
  // first roaming fetch (and seed a wide CZ box as fallback while zoomed out)
  useEffect(() => {
    if (networkFilter !== 'all') return;
    webViewRef.current?.injectJavaScript('window.requestBounds && window.requestBounds(); true;');
    if (empCacheRef.current.size === 0) {
      loadEmpForBounds({ west: 12.0, south: 48.5, east: 18.9, north: 51.1 }); // CZ-wide seed
    }
  }, [networkFilter, loadEmpForBounds]);

  const getMarkerColor = (station: ChargingStation) => {
    if (station.status !== 'operational') return Colors.marker.offline;
    if (!station.available) return Colors.marker.occupied;
    return station.type === 'DC' ? '#3B82F6' : Colors.marker.available;
  };

  const hasActiveFilters = filters.dcOnly || filters.acOnly || filters.availableOnly
    || filters.favoritesOnly || filters.freeParking || filters.connectorType !== null
    || filters.minPower > 0 || filters.maxPrice > 0;

  const resetFilters = () => setFilters({
    dcOnly: false,
    acOnly: false,
    availableOnly: false,
    favoritesOnly: false,
    freeParking: false,
    connectorType: null,
    minPower: 0,
    maxPrice: 0,
  });

  // Combine stations based on network filter
  // 'zaspot' = only ZAspot-owned OCPP stations (default)
  // 'all'    = ZAspot + Hubject roaming + public DB, dedup by id
  const allStations = React.useMemo(() => {
    if (networkFilter === 'zaspot') return ocppStations;
    const seen = new Set(ocppStations.map((s) => s.id));
    // EMP roaming stations first (these are what user actually charges with through ZAspot wallet)
    const empOnly = empStations.filter((s) => !seen.has(s.id));
    empOnly.forEach((s) => seen.add(s.id));
    const publicOnly = stations.filter((s) => !seen.has(s.id));
    return [...ocppStations, ...empOnly, ...publicOnly];
  }, [networkFilter, ocppStations, empStations, stations]);

  // Collect all unique connector types from stations for the filter UI
  const availableConnectorTypes = React.useMemo(() => {
    const types = new Set<string>();
    allStations.forEach(s => s.connector_types?.forEach(c => types.add(c)));
    return Array.from(types).sort();
  }, [allStations]);

  const filteredStations = allStations.filter(station => {
    if (filters.dcOnly && station.type !== 'DC') return false;
    if (filters.acOnly && station.type !== 'AC') return false;
    if (filters.availableOnly && !station.available) return false;
    if (filters.favoritesOnly && !isFavorite(station.id)) return false;
    if (filters.freeParking && station.parking_fee !== false) return false;
    if (filters.connectorType && !station.connector_types?.includes(filters.connectorType)) return false;
    if (station.power_kw < filters.minPower) return false;
    if (filters.maxPrice > 0) {
      const p = priceCtx ? getStationPriceCzk(station, priceCtx) : null;
      if (p == null || p > filters.maxPrice) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        station.name?.toLowerCase().includes(query) ||
        station.city?.toLowerCase().includes(query) ||
        station.address?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // "Nejlevnější v okolí" — filtered stations within 30 km of the user
  // (whole filtered set as fallback without GPS), price-ascending, top 20.
  const cheapestNearby = useMemo(() => {
    if (!priceCtx) return [];
    let pool = filteredStations;
    if (location) {
      pool = pool.filter(
        (s) =>
          calculateDistance(
            location.coords.latitude, location.coords.longitude,
            Number(s.latitude), Number(s.longitude)
          ) <= 30
      );
    }
    return sortByPrice(pool, priceCtx)
      .filter((e) => e.priceCzk != null)
      .slice(0, 20)
      .map((e) => ({
        ...e,
        distanceKm: location
          ? calculateDistance(
              location.coords.latitude, location.coords.longitude,
              Number(e.station.latitude), Number(e.station.longitude)
            )
          : null,
      }));
  }, [filteredStations, priceCtx, location]);

  const focusStation = (station: ChargingStation) => {
    setShowCheapest(false);
    setSelectedStation(station);
    webViewRef.current?.injectJavaScript(
      `map.setView([${Number(station.latitude)}, ${Number(station.longitude)}], 14); true;`
    );
  };

  // Station classification for the detail card's primary action.
  const isEmpStation = (s: ChargingStation) => typeof s.id === 'string' && s.id.startsWith('emp-');
  const isChargeableHere = (s: ChargingStation) => s.is_ocpp === true || isEmpStation(s);

  // Start a roaming charge straight from the map card (foreign Hubject station).
  // Mirrors the emp-stations screen flow; on success we hand off to that screen
  // which has the live session banner + stop button.
  const handleRoamingStart = (station: ChargingStation) => {
    const evseId = String(station.id).replace(/^emp-/, '');
    Alert.alert(
      'Zahájit nabíjení',
      `${station.name}\n\nČástka se odečte z vašeho ZAspot kreditu po nabití (cena operátora + roaming). Minimální kredit: 200 Kč.`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Nabít',
          onPress: async () => {
            setEmpStarting(true);
            const res = await empRemoteStart(evseId);
            setEmpStarting(false);
            if (res.ok && res.data?.success) {
              setSelectedStation(null);
              router.push('/emp-stations');
            } else if (res.status === 402) {
              const min = res.data?.min_balance_czk ?? 200;
              Alert.alert('Nedostatečný kredit', `Pro roaming je potřeba alespoň ${min} Kč.`);
            } else if (res.status === 409) {
              Alert.alert('Aktivní nabíjení', 'Už máte aktivní roamingové nabíjení.');
              router.push('/emp-stations');
            } else {
              Alert.alert('Chyba', 'Operátor stanice požadavek odmítl. Zkuste to znovu nebo vyberte jinou stanici.');
            }
          },
        },
      ]
    );
  };

  const centerOnLocation = () => {
    if (location && webViewRef.current) {
      const js = `map.setView([${location.coords.latitude}, ${location.coords.longitude}], 14); true;`;
      webViewRef.current.injectJavaScript(js);
    }
  };

  const openNavigation = (station: ChargingStation) => {
    openNavigationTo(station.latitude, station.longitude, station.name);
  };

  // Push user location into WebView whenever it's available
  useEffect(() => {
    if (mapStatus !== 'loaded' || !webViewRef.current || !location) return;
    const js = `window.updateUserLocation && window.updateUserLocation(${location.coords.latitude}, ${location.coords.longitude}); true;`;
    webViewRef.current.injectJavaScript(js);
  }, [location, mapStatus]);

  // Push markers into the WebView whenever filtered stations change.
  // Runs after map.ready (post-message from Leaflet init) so updateMarkers exists.
  useEffect(() => {
    if (mapStatus !== 'loaded' || !webViewRef.current) return;
    const stationsJson = JSON.stringify(
      filteredStations.map((s) => ({
        id: s.id,
        lat: Number(s.latitude),
        lng: Number(s.longitude),
        name: s.name,
        isOcpp: s.is_ocpp === true,
        isEmp: typeof s.id === 'string' && s.id.startsWith('emp-'),
        available: s.available === true,
      }))
    );
    const js = `window.updateMarkers && window.updateMarkers(${stationsJson}); true;`;
    webViewRef.current.injectJavaScript(js);
  }, [filteredStations, mapStatus]);

  // CRITICAL: this HTML is computed ONCE per mount. We do NOT include region/isDark
  // in deps — otherwise every pan/zoom invalidates the source and reloads the WebView.
  const initialCenter = useRef({ lat: 49.8175, lng: 15.4730 });
  const leafletHtml = useMemo(
    () => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<style>
  html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#f3f4f6;}
  .pin{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3);}
  .pin svg{width:15px;height:15px;}
  .user-dot{width:18px;height:18px;background:#3B82F6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,.25);animation:pulse 2s infinite;}
  @keyframes pulse {
    0% { box-shadow: 0 0 0 4px rgba(59,130,246,.4); }
    70% { box-shadow: 0 0 0 14px rgba(59,130,246,0); }
    100% { box-shadow: 0 0 0 4px rgba(59,130,246,0); }
  }
  .marker-cluster-small div { background-color: rgba(22,163,74,.85) !important; color: #fff !important; }
  .marker-cluster-medium div { background-color: rgba(22,163,74,.95) !important; color: #fff !important; }
  .marker-cluster-large div { background-color: rgba(20,83,45,1) !important; color: #fff !important; }
  .marker-cluster { background-color: rgba(22,163,74,.3) !important; }
</style></head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
  const map = L.map('map', { zoomControl: false }).setView([${initialCenter.current.lat}, ${initialCenter.current.lng}], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Marker clustering (auto-groups markers within zoom-dependent radius)
  const markerCluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 14,
    maxClusterRadius: 50,
  });
  map.addLayer(markerCluster);

  // User location pin (pulsing blue dot)
  let userMarker = null;
  window.updateUserLocation = function(lat, lng) {
    if (userMarker) { map.removeLayer(userMarker); }
    userMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      zIndexOffset: 1000,
      interactive: false,
    }).addTo(map);
  };

  window.updateMarkers = function(stations) {
    markerCluster.clearLayers();
    const markers = stations.map(function(s) {
      const color = s.isOcpp ? '#16A34A' : (s.isEmp ? '#06B6D4' : (s.available ? '#3B82F6' : '#9CA3AF'));
      const icon = L.divIcon({
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: '<div class="pin" style="background:' + color + ';"><svg viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14h7v8l10-12h-7V2z"/></svg></div>'
      });
      const m = L.marker([s.lat, s.lng], { icon: icon });
      m.on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker', id: s.id }));
      });
      return m;
    });
    markerCluster.addLayers(markers);
  };

  // Report the visible viewport after every pan/zoom (and on demand) so RN can
  // lazy-load Hubject roaming stations for exactly this area — the full set is
  // ~53k rows, far too many to ship at once.
  function postBounds() {
    const b = map.getBounds();
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'bounds',
      west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth(),
      zoom: map.getZoom(),
    }));
  }
  map.on('moveend', postBounds);
  window.requestBounds = postBounds;

  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
</script>
</body></html>`,
    [] // empty deps: HTML is built ONCE
  );

  const onWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') setMapStatus('loaded');
      else if (msg.type === 'bounds') onMapBounds(msg);
      else if (msg.type === 'marker' && msg.id) {
        const found = filteredStations.find((s) => s.id === msg.id);
        if (found) setSelectedStation(found);
      }
    } catch {
      // ignore
    }
  };

  return (
    <View style={styles.container}>
      {/* Leaflet map inside WebView — works reliably with New Architecture
          and needs no Google Maps SDK. Tiles come from OpenStreetMap (free).
          NOTE: onLoadStart deliberately doesn't reset mapStatus — only the initial
          'ready' postMessage from Leaflet flips it to 'loaded'. */}
      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ html: leafletHtml }}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}
        onMessage={onWebViewMessage}
        scrollEnabled={false}
        bounces={false}
        allowsBackForwardNavigationGestures={false}
        androidLayerType="hardware"
      />

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.brand.accentGreen} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t.common.loading}
          </Text>
        </View>
      )}

      {/* ── Floating header: row 1 = search + filter, row 2 = network toggle + count.
          Everything lives inside ONE SafeAreaView so the notch/status-bar inset is
          applied a single time and the rows stack deterministically. The old layout
          positioned the toggle (top:110) and count badge (top:115) with absolute
          screen-top coordinates that ignored the safe-area inset, so on tall-status-bar
          devices they collided with the search bar. `box-none` lets map gestures pass
          through the empty gaps between controls. */}
      <SafeAreaView edges={['top']} style={styles.headerArea} pointerEvents="box-none">
        <View style={styles.searchRow} pointerEvents="box-none">
          <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t.map.searchPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options" size={22} color={hasActiveFilters ? Colors.brand.accentGreen : colors.text} />
            {hasActiveFilters && <View style={styles.filterActiveDot} />}
          </TouchableOpacity>
        </View>

        <View style={styles.controlsRow} pointerEvents="box-none">
          {/* Network Filter Toggle (matches web charging-map) */}
          <View style={[styles.networkToggle, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[
                styles.networkToggleBtn,
                networkFilter === 'zaspot' && { backgroundColor: Colors.brand.accentGreen },
              ]}
              onPress={() => setNetworkFilter('zaspot')}
            >
              <Text
                style={[
                  styles.networkToggleText,
                  { color: networkFilter === 'zaspot' ? '#fff' : colors.text },
                ]}
              >
                ZAspot ({ocppStations.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.networkToggleBtn,
                networkFilter === 'all' && { backgroundColor: Colors.brand.accentGreen },
              ]}
              onPress={() => setNetworkFilter('all')}
            >
              <Text
                style={[
                  styles.networkToggleText,
                  { color: networkFilter === 'all' ? '#fff' : colors.text },
                ]}
              >
                Vše
              </Text>
            </TouchableOpacity>
          </View>

          {/* Station Count Badge */}
          <View style={[styles.countBadge, { backgroundColor: colors.surface }]}>
            <Ionicons name="location" size={16} color={Colors.brand.accentGreen} />
            <Text style={[styles.countText, { color: colors.text }]}>
              {filteredStations.length} {t.map.allStations.toLowerCase()}
            </Text>
          </View>

          {/* Cheapest-nearby list */}
          <TouchableOpacity
            style={[styles.cheapestBtn, { backgroundColor: colors.surface }]}
            onPress={() => setShowCheapest(true)}
            accessibilityRole="button"
            accessibilityLabel="Nejlevnější stanice v okolí"
          >
            <Ionicons name="cash-outline" size={16} color={Colors.brand.accentGreen} />
            <Text style={[styles.countText, { color: colors.text }]}>Nejlevnější</Text>
          </TouchableOpacity>
        </View>

        {/* Offline Indicator */}
        {isOffline && cacheInfo && (
          <View style={styles.offlineRow} pointerEvents="none">
            <View style={[styles.offlineBadge, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="cloud-offline" size={14} color="#FFFFFF" />
              <Text style={styles.offlineText}>{cacheInfo}</Text>
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* Loading indicator: map init OR EMP roaming stations being fetched */}
      {(mapStatus !== 'loaded' || empLoading) && (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 120,
            alignSelf: 'center',
            backgroundColor: colors.surface,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            elevation: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ActivityIndicator size="small" color={Colors.brand.accentGreen} />
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
            {mapStatus !== 'loaded' ? 'Načítání mapy...' : 'Načítání roamingových stanic...'}
          </Text>
        </View>
      )}

      {/* Location + QR scan FABs — hidden while a station card is open so they
          don't sit hidden under the bottom sheet. */}
      {!selectedStation && (
        <>
          {/* Location Button */}
          <TouchableOpacity
            style={[styles.locationButton, { backgroundColor: colors.surface }]}
            onPress={centerOnLocation}
          >
            <Ionicons name="locate" size={24} color={Colors.brand.accentGreen} />
          </TouchableOpacity>

          {/* QR Scan Button — opens the station QR scanner full-screen */}
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: Colors.brand.accentGreen }]}
            onPress={() => router.push('/scan')}
            accessibilityLabel="Skenovat QR kód stanice"
          >
            <Ionicons name="qr-code-outline" size={26} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* Station Detail Card */}
      {selectedStation && (
        <View style={[styles.stationCard, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          {/* Handle bar */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stationName, { color: colors.text }]} numberOfLines={2}>
                  {selectedStation.name}
                </Text>
                <Text style={[styles.stationAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                  {selectedStation.address}
                  {selectedStation.city && `, ${selectedStation.city}`}
                </Text>
              </View>
              <FavoriteButton stationId={selectedStation.id} size={26} style={{ marginRight: 8 }} />
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setSelectedStation(null)}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.badgeRow}>
              <View style={[
                styles.typeBadge,
                { backgroundColor: selectedStation.type === 'DC' ? '#3B82F620' : '#16A34A20' }
              ]}>
                <Ionicons
                  name={selectedStation.type === 'DC' ? 'flash' : 'battery-charging'}
                  size={14}
                  color={selectedStation.type === 'DC' ? '#3B82F6' : Colors.brand.accentGreen}
                />
                <Text style={[
                  styles.typeBadgeText,
                  { color: selectedStation.type === 'DC' ? '#3B82F6' : Colors.brand.accentGreen }
                ]}>
                  {selectedStation.type} • {selectedStation.power_kw} kW
                </Text>
              </View>

              <View style={[
                styles.statusBadge,
                { backgroundColor: selectedStation.available ? '#16A34A20' : '#F5990B20' }
              ]}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: selectedStation.available ? Colors.marker.available : Colors.marker.occupied }
                ]} />
                <Text style={[
                  styles.statusText,
                  { color: selectedStation.available ? Colors.marker.available : Colors.marker.occupied }
                ]}>
                  {selectedStation.available ? t.map.available_status : t.map.occupied}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.cardStats}>
            <View style={[styles.statBox, { backgroundColor: isDark ? colors.surfaceSecondary : '#F9FAFB' }]}>
              <Ionicons name="flash" size={20} color={Colors.brand.accentGreen} />
              <Text style={[styles.statBoxValue, { color: colors.text }]}>
                {selectedStation.power_kw}
              </Text>
              <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>kW</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: isDark ? colors.surfaceSecondary : '#F9FAFB' }]}>
              <Ionicons name="pricetag" size={20} color="#F59E0B" />
              <LiveStationPrice
                chargePointId={selectedStation.external_id}
                isDc={selectedStation.type === 'DC'}
                // Normalized CZK price: Hubject stations store EUR — passing it
                // raw displayed e.g. "0.49" under a "Kč/kWh" label.
                fallbackPriceCzkKwh={
                  priceCtx
                    ? getStationPriceCzk(selectedStation, priceCtx)
                    : selectedStation.price_per_kwh
                }
                textColor={colors.text}
                labelColor={colors.textMuted}
              />
              <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>{`${symbol}/kWh`}</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: isDark ? colors.surfaceSecondary : '#F9FAFB' }]}>
              <Ionicons name="git-branch" size={20} color="#8B5CF6" />
              <Text style={[styles.statBoxValue, { color: colors.text }]}>
                {selectedStation.num_connectors}
              </Text>
              <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>{t.map.connectors}</Text>
            </View>
          </View>

          {/* Connectors */}
          {selectedStation.connector_types && selectedStation.connector_types.length > 0 && (
            <View style={styles.connectorsRow}>
              {selectedStation.connector_types.map((connector, idx) => (
                <View key={idx} style={[styles.connectorTag, { backgroundColor: isDark ? colors.surfaceSecondary : '#F3F4F6' }]}>
                  <Text style={[styles.connectorText, { color: colors.text }]}>{connector}</Text>
                </View>
              ))}
            </View>
          )}

          {/* External station note — we can't charge here through ZAspot */}
          {!isChargeableHere(selectedStation) && (
            <Text style={[styles.externalNote, { color: colors.textMuted }]}>
              Externí stanice — nabíjení přes ZAspot zde není dostupné.
            </Text>
          )}

          {/* Actions — primary action depends on station type:
              ZAspot OCPP → full detail (start/stop), Hubject → roaming charge,
              foreign public station → navigate only (not chargeable via us). */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[
                styles.actionBtnSecondary,
                { borderColor: Colors.brand.accentGreen },
                !isChargeableHere(selectedStation) && { flex: 1 },
              ]}
              onPress={() => openNavigation(selectedStation)}
            >
              <Ionicons name="navigate" size={20} color={Colors.brand.accentGreen} />
              <Text style={[styles.actionBtnSecondaryText, { color: Colors.brand.accentGreen }]}>
                {t.map.navigate}
              </Text>
            </TouchableOpacity>

            {selectedStation.is_ocpp && (
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => {
                  setSelectedStation(null);
                  router.push(`/station/${selectedStation.id}`);
                }}
              >
                <Ionicons name="flash" size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnPrimaryText}>{t.map.stationDetails}</Text>
              </TouchableOpacity>
            )}

            {isEmpStation(selectedStation) && (
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => handleRoamingStart(selectedStation)}
                disabled={empStarting}
              >
                {empStarting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="flash" size={20} color="#FFFFFF" />
                    <Text style={styles.actionBtnPrimaryText}>Nabít</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Cheapest-nearby bottom sheet */}
      <Modal
        visible={showCheapest}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCheapest(false)}
      >
        <View style={styles.cheapestBackdrop}>
          <View style={[styles.cheapestSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.cheapestHandle} />
            <View style={styles.cheapestHeader}>
              <Ionicons name="cash-outline" size={20} color={Colors.brand.accentGreen} />
              <Text style={[styles.cheapestTitle, { color: colors.text }]}>
                Nejlevnější {location ? 'v okolí (30 km)' : 'stanice'}
              </Text>
              <TouchableOpacity onPress={() => setShowCheapest(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {!priceCtx ? (
              <ActivityIndicator color={Colors.brand.accentGreen} style={{ padding: 24 }} />
            ) : cheapestNearby.length === 0 ? (
              <Text style={[styles.cheapestEmpty, { color: colors.textMuted }]}>
                Žádné stanice se zveřejněnou cenou
                {networkFilter === 'zaspot' ? '. Zkuste přepnout na „Vše".' : ' v této oblasti.'}
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                {cheapestNearby.map(({ station, priceCzk, distanceKm }, idx) => (
                  <TouchableOpacity
                    key={station.id}
                    style={[styles.cheapestRow, { borderBottomColor: colors.borderLight }]}
                    onPress={() => focusStation(station)}
                  >
                    <View style={[styles.cheapestRank, idx === 0 && { backgroundColor: Colors.brand.accentGreen }]}>
                      <Text style={[styles.cheapestRankText, idx === 0 && { color: '#fff' }]}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cheapestName, { color: colors.text }]} numberOfLines={1}>
                        {station.name}
                      </Text>
                      <Text style={[styles.cheapestMeta, { color: colors.textMuted }]} numberOfLines={1}>
                        {station.is_ocpp ? 'ZAspot' : (String(station.id).startsWith('emp-') ? 'Roaming' : station.operator || '—')}
                        {' · '}{station.power_kw} kW
                        {distanceKm != null ? ` · ${distanceKm.toFixed(1)} km` : ''}
                      </Text>
                    </View>
                    <Text style={styles.cheapestPrice}>
                      {priceCzk!.toFixed(2)} Kč
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModal, { backgroundColor: colors.surface }]}>
            <View style={styles.filterHeader}>
              <Text style={[styles.filterTitle, { color: colors.text }]}>{t.map.filters}</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterContent}>
              {/* Favorites Only */}
              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => setFilters({ ...filters, favoritesOnly: !filters.favoritesOnly })}
              >
                <View style={styles.filterOptionLeft}>
                  <Ionicons name="heart" size={22} color="#EF4444" />
                  <Text style={[styles.filterLabel, { color: colors.text }]}>{t.map.favoritesOnly}</Text>
                </View>
                <Ionicons
                  name={filters.favoritesOnly ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={filters.favoritesOnly ? Colors.brand.accentGreen : colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Available Only */}
              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => setFilters({ ...filters, availableOnly: !filters.availableOnly })}
              >
                <View style={styles.filterOptionLeft}>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.brand.accentGreen} />
                  <Text style={[styles.filterLabel, { color: colors.text }]}>{t.map.available}</Text>
                </View>
                <Ionicons
                  name={filters.availableOnly ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={filters.availableOnly ? Colors.brand.accentGreen : colors.textSecondary}
                />
              </TouchableOpacity>

              {/* DC Only */}
              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => setFilters({ ...filters, dcOnly: !filters.dcOnly, acOnly: false })}
              >
                <View style={styles.filterOptionLeft}>
                  <Ionicons name="flash" size={22} color="#3B82F6" />
                  <Text style={[styles.filterLabel, { color: colors.text }]}>{t.map.dcOnly}</Text>
                </View>
                <Ionicons
                  name={filters.dcOnly ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={filters.dcOnly ? Colors.brand.accentGreen : colors.textSecondary}
                />
              </TouchableOpacity>

              {/* AC Only */}
              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => setFilters({ ...filters, acOnly: !filters.acOnly, dcOnly: false })}
              >
                <View style={styles.filterOptionLeft}>
                  <Ionicons name="battery-charging" size={22} color={Colors.brand.accentGreen} />
                  <Text style={[styles.filterLabel, { color: colors.text }]}>{t.map.acOnly}</Text>
                </View>
                <Ionicons
                  name={filters.acOnly ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={filters.acOnly ? Colors.brand.accentGreen : colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Free Parking */}
              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => setFilters({ ...filters, freeParking: !filters.freeParking })}
              >
                <View style={styles.filterOptionLeft}>
                  <Ionicons name="car" size={22} color="#8B5CF6" />
                  <Text style={[styles.filterLabel, { color: colors.text }]}>{t.map.freeParking}</Text>
                </View>
                <Ionicons
                  name={filters.freeParking ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={filters.freeParking ? Colors.brand.accentGreen : colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Connector Type */}
              {availableConnectorTypes.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={[styles.filterSectionTitle, { color: colors.text }]}>
                    {t.map.connectorType}
                  </Text>
                  <View style={styles.connectorButtons}>
                    <TouchableOpacity
                      style={[
                        styles.connectorButton,
                        { borderColor: colors.border },
                        filters.connectorType === null && {
                          backgroundColor: Colors.brand.accentGreen,
                          borderColor: Colors.brand.accentGreen
                        }
                      ]}
                      onPress={() => setFilters({ ...filters, connectorType: null })}
                    >
                      <Text style={[
                        styles.connectorButtonText,
                        { color: filters.connectorType === null ? '#FFFFFF' : colors.text }
                      ]}>
                        {t.map.allTypes}
                      </Text>
                    </TouchableOpacity>
                    {availableConnectorTypes.map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.connectorButton,
                          { borderColor: colors.border },
                          filters.connectorType === type && {
                            backgroundColor: Colors.brand.accentGreen,
                            borderColor: Colors.brand.accentGreen
                          }
                        ]}
                        onPress={() => setFilters({ ...filters, connectorType: type })}
                      >
                        <Text style={[
                          styles.connectorButtonText,
                          { color: filters.connectorType === type ? '#FFFFFF' : colors.text }
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Min Power */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>
                  {t.map.minPower}: {filters.minPower} kW
                </Text>
                <View style={styles.powerButtons}>
                  {[0, 22, 50, 100, 150].map(power => (
                    <TouchableOpacity
                      key={power}
                      style={[
                        styles.powerButton,
                        { borderColor: colors.border },
                        filters.minPower === power && {
                          backgroundColor: Colors.brand.accentGreen,
                          borderColor: Colors.brand.accentGreen
                        }
                      ]}
                      onPress={() => setFilters({ ...filters, minPower: power })}
                    >
                      <Text style={[
                        styles.powerButtonText,
                        { color: filters.minPower === power ? '#FFFFFF' : colors.text }
                      ]}>
                        {power === 0 ? t.map.allTypes : `${power}+`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Max Price (CZK/kWh) — stations without a published price are
                  hidden while this is active */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>
                  Max. cena: {filters.maxPrice > 0 ? `${filters.maxPrice} Kč/kWh` : '—'}
                </Text>
                <View style={styles.powerButtons}>
                  {[0, 6, 8, 10, 12, 15].map(price => (
                    <TouchableOpacity
                      key={price}
                      style={[
                        styles.powerButton,
                        { borderColor: colors.border },
                        filters.maxPrice === price && {
                          backgroundColor: Colors.brand.accentGreen,
                          borderColor: Colors.brand.accentGreen
                        }
                      ]}
                      onPress={() => setFilters({ ...filters, maxPrice: price })}
                    >
                      <Text style={[
                        styles.powerButtonText,
                        { color: filters.maxPrice === price ? '#FFFFFF' : colors.text }
                      ]}>
                        {price === 0 ? t.map.allTypes : `≤${price}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.filterHint, { color: colors.textMuted }]}>
                  Stanice bez zveřejněné ceny jsou při aktivním filtru skryté.
                </Text>
              </View>
            </ScrollView>

            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Ionicons name="refresh" size={18} color="#EF4444" />
                <Text style={styles.resetButtonText}>{t.map.resetFilters}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>{t.common.done}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  networkToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
    gap: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  networkToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  networkToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
  },
  offlineRow: {
    alignItems: 'center',
    marginTop: 2,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    bottom: 320,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  scanButton: {
    position: 'absolute',
    right: 16,
    bottom: 380,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  stationCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  handleBar: {
    alignItems: 'center',
    marginBottom: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  stationName: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 26,
  },
  stationAddress: {
    fontSize: 14,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 2,
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statBoxLabel: {
    fontSize: 11,
  },
  connectorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  connectorTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  connectorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  externalNote: {
    fontSize: 12,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  actionBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.brand.accentGreen,
    gap: 8,
  },
  actionBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '70%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterContent: {
    paddingHorizontal: 20,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterLabel: {
    fontSize: 16,
  },
  filterSection: {
    paddingVertical: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  powerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  powerButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  powerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  connectorButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  connectorButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  connectorButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.brand.accentGreen,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    gap: 8,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  applyButton: {
    margin: 20,
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.brand.accentGreen,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterHint: {
    fontSize: 12,
    marginTop: 8,
  },
  cheapestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cheapestBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  cheapestSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Layout.spacing.lg,
    paddingBottom: 34,
  },
  cheapestHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginBottom: 12,
  },
  cheapestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cheapestTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  cheapestEmpty: {
    fontSize: 14,
    paddingVertical: 24,
    textAlign: 'center',
  },
  cheapestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cheapestRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(128,128,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cheapestRankText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  cheapestName: {
    fontSize: 14,
    fontWeight: '600',
  },
  cheapestMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  cheapestPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16A34A',
  },
});
