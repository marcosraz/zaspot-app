/**
 * Map Screen - Charging stations map with real Supabase data
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFavorites } from '../../context/FavoritesContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { supabase, ChargingStation, fetchNearbyStations } from '../../lib/supabase';
import { fetchStationsWithCache, formatCacheAge } from '../../lib/stationsCache';
import FavoriteButton from '../../components/FavoriteButton';
import CustomMarker from '../../components/CustomMarker';

export default function MapScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { isFavorite } = useFavorites();
  const mapRef = useRef<MapView>(null);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dcOnly: false,
    acOnly: false,
    availableOnly: false,
    favoritesOnly: false,
    minPower: 0,
  });

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
  }, []);

  const loadStations = async () => {
    setLoading(true);
    try {
      const { stations: data, isFromCache, cacheAge } = await fetchStationsWithCache();
      setStations(data);
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

  const getMarkerColor = (station: ChargingStation) => {
    if (station.status !== 'operational') return Colors.marker.offline;
    if (!station.available) return Colors.marker.occupied;
    return station.type === 'DC' ? '#3B82F6' : Colors.marker.available;
  };

  const filteredStations = stations.filter(station => {
    if (filters.dcOnly && station.type !== 'DC') return false;
    if (filters.acOnly && station.type !== 'AC') return false;
    if (filters.availableOnly && !station.available) return false;
    if (filters.favoritesOnly && !isFavorite(station.id)) return false;
    if (station.power_kw < filters.minPower) return false;
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

  const centerOnLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const openNavigation = (station: ChargingStation) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${station.latitude},${station.longitude}`,
      android: `google.navigation:q=${station.latitude},${station.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  // Dark mode map style - lighter version that works better
  const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
    { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  ];

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        mapPadding={{ top: 100, right: 0, bottom: 250, left: 0 }}
      >
        {filteredStations.map(station => (
          <Marker
            key={station.id}
            coordinate={{
              latitude: Number(station.latitude),
              longitude: Number(station.longitude),
            }}
            onPress={() => setSelectedStation(station)}
            tracksViewChanges={false}
          >
            <CustomMarker
              station={station}
              isSelected={selectedStation?.id === station.id}
              isFavorite={isFavorite(station.id)}
            />
          </Marker>
        ))}
      </MapView>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.brand.accentGreen} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t.common.loading}
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <SafeAreaView style={styles.searchContainer} edges={['top']}>
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
          <Ionicons name="options" size={22} color={colors.text} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Station Count Badge */}
      <View style={[styles.countBadge, { backgroundColor: colors.surface }]}>
        <Ionicons name="location" size={16} color={Colors.brand.accentGreen} />
        <Text style={[styles.countText, { color: colors.text }]}>
          {filteredStations.length} {t.map.allStations.toLowerCase()}
        </Text>
      </View>

      {/* Offline Indicator */}
      {isOffline && cacheInfo && (
        <View style={[styles.offlineBadge, { backgroundColor: '#F59E0B' }]}>
          <Ionicons name="cloud-offline" size={14} color="#FFFFFF" />
          <Text style={styles.offlineText}>{cacheInfo}</Text>
        </View>
      )}

      {/* Location Button */}
      <TouchableOpacity
        style={[styles.locationButton, { backgroundColor: colors.surface }]}
        onPress={centerOnLocation}
      >
        <Ionicons name="locate" size={24} color={Colors.brand.accentGreen} />
      </TouchableOpacity>

      {/* Station Detail Card */}
      {selectedStation && (
        <View style={[styles.stationCard, { backgroundColor: colors.surface }]}>
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
              <Text style={[styles.statBoxValue, { color: colors.text }]}>
                {selectedStation.price_per_kwh?.toFixed(2) || '—'}
              </Text>
              <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Kč/kWh</Text>
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

          {/* Actions */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtnSecondary, { borderColor: Colors.brand.accentGreen }]}
              onPress={() => openNavigation(selectedStation)}
            >
              <Ionicons name="navigate" size={20} color={Colors.brand.accentGreen} />
              <Text style={[styles.actionBtnSecondaryText, { color: Colors.brand.accentGreen }]}>
                {t.map.navigate}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnPrimary}>
              <Ionicons name="calendar" size={20} color="#FFFFFF" />
              <Text style={styles.actionBtnPrimaryText}>{t.map.reserve}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
                  <Text style={[styles.filterLabel, { color: colors.text }]}>Pouze oblíbené</Text>
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
                        {power === 0 ? 'Alle' : `${power}+`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

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
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
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
  countBadge: {
    position: 'absolute',
    top: 115,
    alignSelf: 'center',
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
  offlineBadge: {
    position: 'absolute',
    top: 155,
    alignSelf: 'center',
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
});
