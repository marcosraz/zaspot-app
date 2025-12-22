/**
 * Custom Map Marker - Distinctive AC/DC charging station markers
 * Different colors and icons based on charger type and status
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChargingStation } from '../lib/supabase';
import { Colors } from '../constants/colors';

interface CustomMarkerProps {
  station: ChargingStation;
  isSelected?: boolean;
  isFavorite?: boolean;
}

export default function CustomMarker({ station, isSelected, isFavorite }: CustomMarkerProps) {
  // Determine colors based on type and status
  const isDC = station.type === 'DC';
  const isAvailable = station.available && station.status === 'operational';
  const isOffline = station.status !== 'operational';

  // Color scheme
  let bgColor = isDC ? '#3B82F6' : Colors.brand.accentGreen; // Blue for DC, Green for AC
  let borderColor = isDC ? '#1D4ED8' : '#15803D';

  if (isOffline) {
    bgColor = '#9CA3AF';
    borderColor = '#6B7280';
  } else if (!isAvailable) {
    bgColor = '#F59E0B';
    borderColor = '#D97706';
  }

  // Power level indicator
  const getPowerLabel = () => {
    if (station.power_kw >= 150) return 'HPC';
    if (station.power_kw >= 50) return 'DC';
    if (station.power_kw >= 22) return 'AC';
    return '';
  };

  return (
    <View style={styles.container}>
      {/* Main marker */}
      <View style={[
        styles.marker,
        { backgroundColor: bgColor, borderColor },
        isSelected && styles.markerSelected,
      ]}>
        {/* Icon */}
        <Ionicons
          name={isDC ? 'flash' : 'battery-charging'}
          size={isSelected ? 18 : 14}
          color="#FFFFFF"
        />

        {/* Power badge for high-power chargers */}
        {station.power_kw >= 50 && (
          <View style={[styles.powerBadge, { backgroundColor: borderColor }]}>
            <Text style={styles.powerText}>{getPowerLabel()}</Text>
          </View>
        )}
      </View>

      {/* Pointer/Pin */}
      <View style={[styles.pointer, { borderTopColor: bgColor }]} />

      {/* Favorite indicator */}
      {isFavorite && (
        <View style={styles.favoriteIndicator}>
          <Ionicons name="heart" size={10} color="#EF4444" />
        </View>
      )}
    </View>
  );
}

// Simplified marker for when there are many markers on screen
export function SimpleMarker({ station }: { station: ChargingStation }) {
  const isDC = station.type === 'DC';
  const isAvailable = station.available && station.status === 'operational';
  const isOffline = station.status !== 'operational';

  let bgColor = isDC ? '#3B82F6' : Colors.brand.accentGreen;
  if (isOffline) bgColor = '#9CA3AF';
  else if (!isAvailable) bgColor = '#F59E0B';

  return (
    <View style={[styles.simpleMarker, { backgroundColor: bgColor }]}>
      <Ionicons
        name={isDC ? 'flash' : 'battery-charging'}
        size={12}
        color="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  markerSelected: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  powerBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    minWidth: 22,
    alignItems: 'center',
  },
  powerText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  favoriteIndicator: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  simpleMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
});
