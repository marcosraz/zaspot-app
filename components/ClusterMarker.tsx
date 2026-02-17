/**
 * Cluster Marker - Shows station count when zoomed out
 * Displays a bubble with the number of stations in the cluster
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface ClusterMarkerProps {
  count: number;
}

export default function ClusterMarker({ count }: ClusterMarkerProps) {
  // Scale size based on count
  const size = count < 10 ? 40 : count < 50 ? 48 : count < 100 ? 56 : 64;
  const fontSize = count < 10 ? 14 : count < 100 ? 16 : 18;

  return (
    <View style={[styles.cluster, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={[styles.inner, { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2 }]}>
        <Text style={[styles.count, { fontSize }]}>{count}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cluster: {
    backgroundColor: Colors.brand.accentGreen + '30',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  inner: {
    backgroundColor: Colors.brand.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
