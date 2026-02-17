/**
 * Vehicle Context - Manages EV profile settings
 * Stores battery capacity, range, and charging preferences
 * Supports server sync for authenticated users
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { VehiclePreset, POPULAR_VEHICLES } from '../constants/vehiclePresets';
import {
  fetchVehicleProfiles,
  createVehicleProfile,
  updateVehicleProfile,
  deleteVehicleProfile,
  type ServerVehicleProfile,
} from '../lib/vehicleProfiles';

export type { VehiclePreset };
export { POPULAR_VEHICLES };

export interface VehicleProfile {
  id: string;
  name: string;
  manufacturer: string;
  batteryCapacityKwh: number;
  rangeKm: number;
  maxChargingPowerKw: number;
  connectorType: string;
}

interface VehicleSettings {
  selectedVehicle: VehicleProfile | null;
  customVehicle: VehicleProfile | null;
  currentBatteryPercent: number;
  preferredMinBattery: number; // Don't go below this %
  preferredMaxCharge: number;  // Charge up to this %
}

interface VehicleContextType {
  settings: VehicleSettings;
  setSelectedVehicle: (vehicle: VehicleProfile | null) => void;
  setCustomVehicle: (vehicle: VehicleProfile | null) => void;
  setCurrentBattery: (percent: number) => void;
  setPreferences: (minBattery: number, maxCharge: number) => void;
  isLoaded: boolean;
  // Server sync
  savedVehicles: ServerVehicleProfile[];
  isSyncing: boolean;
  saveToServer: (vehicle: VehicleProfile, isActive?: boolean) => Promise<ServerVehicleProfile | null>;
  deleteFromServer: (vehicleId: string) => Promise<boolean>;
  setActiveOnServer: (vehicleId: string) => Promise<boolean>;
  refreshFromServer: () => Promise<void>;
  activeVehicle: VehicleProfile | null;
}

const defaultSettings: VehicleSettings = {
  selectedVehicle: null,
  customVehicle: null,
  currentBatteryPercent: 80,
  preferredMinBattery: 15,
  preferredMaxCharge: 80,
};

interface VehicleProviderProps {
  children: ReactNode;
}

export function VehicleProvider({ children }: VehicleProviderProps) {
  const [settings, setSettings] = useState<VehicleSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const [savedVehicles, setSavedVehicles] = useState<ServerVehicleProfile[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user } = useAuth();
  const hasSyncedRef = useRef(false);

  // Load local settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Sync with server when user logs in
  useEffect(() => {
    if (user && isLoaded && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      refreshFromServer();
    }
    if (!user) {
      hasSyncedRef.current = false;
      setSavedVehicles([]);
    }
  }, [user, isLoaded]);

  // Save local settings when they change
  useEffect(() => {
    if (isLoaded) {
      saveLocalSettings(settings);
    }
  }, [settings, isLoaded]);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(VEHICLE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load vehicle settings:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveLocalSettings = async (newSettings: VehicleSettings) => {
    try {
      await AsyncStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save vehicle settings:', error);
    }
  };

  // Server sync methods
  const refreshFromServer = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const vehicles = await fetchVehicleProfiles();
      setSavedVehicles(vehicles);
      // If there's an active server vehicle, update local settings
      const active = vehicles.find(v => v.isActive);
      if (active) {
        setSettings(prev => ({
          ...prev,
          selectedVehicle: {
            id: active.presetId || active.id,
            name: active.name,
            manufacturer: active.manufacturer,
            batteryCapacityKwh: active.batteryCapacityKwh,
            rangeKm: active.rangeKm,
            maxChargingPowerKw: active.maxChargingPowerKw,
            connectorType: active.connectorType,
          },
          preferredMinBattery: active.preferredMinBattery ?? 15,
          preferredMaxCharge: active.preferredMaxCharge ?? 80,
        }));
      }
    } catch (error) {
      console.error('Failed to sync vehicles from server:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  const saveToServer = useCallback(async (vehicle: VehicleProfile, isActive = true): Promise<ServerVehicleProfile | null> => {
    if (!user) return null;
    try {
      const result = await createVehicleProfile({
        presetId: vehicle.id,
        name: vehicle.name,
        manufacturer: vehicle.manufacturer,
        batteryCapacityKwh: vehicle.batteryCapacityKwh,
        rangeKm: vehicle.rangeKm,
        maxChargingPowerKw: vehicle.maxChargingPowerKw,
        connectorType: vehicle.connectorType,
        preferredMinBattery: settings.preferredMinBattery,
        preferredMaxCharge: settings.preferredMaxCharge,
        isActive,
      });
      if (result) {
        await refreshFromServer();
      }
      return result;
    } catch (error) {
      console.error('Failed to save vehicle to server:', error);
      return null;
    }
  }, [user, settings.preferredMinBattery, settings.preferredMaxCharge, refreshFromServer]);

  const deleteFromServer = useCallback(async (vehicleId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const success = await deleteVehicleProfile(vehicleId);
      if (success) {
        await refreshFromServer();
      }
      return success;
    } catch (error) {
      console.error('Failed to delete vehicle from server:', error);
      return false;
    }
  }, [user, refreshFromServer]);

  const setActiveOnServer = useCallback(async (vehicleId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const result = await updateVehicleProfile(vehicleId, { isActive: true });
      if (result) {
        await refreshFromServer();
      }
      return !!result;
    } catch (error) {
      console.error('Failed to set active vehicle on server:', error);
      return false;
    }
  }, [user, refreshFromServer]);

  const setSelectedVehicle = useCallback((vehicle: VehicleProfile | null) => {
    setSettings(prev => ({ ...prev, selectedVehicle: vehicle }));
  }, []);

  const setCustomVehicle = useCallback((vehicle: VehicleProfile | null) => {
    setSettings(prev => ({ ...prev, customVehicle: vehicle }));
  }, []);

  const setCurrentBattery = useCallback((percent: number) => {
    setSettings(prev => ({ ...prev, currentBatteryPercent: Math.max(0, Math.min(100, percent)) }));
  }, []);

  const setPreferences = useCallback((minBattery: number, maxCharge: number) => {
    setSettings(prev => ({
      ...prev,
      preferredMinBattery: Math.max(5, Math.min(30, minBattery)),
      preferredMaxCharge: Math.max(50, Math.min(100, maxCharge)),
    }));
  }, []);

  // Active vehicle: server vehicle (if synced) or local selection
  const activeVehicle = settings.selectedVehicle || settings.customVehicle || null;

  return (
    <VehicleContext.Provider
      value={{
        settings,
        setSelectedVehicle,
        setCustomVehicle,
        setCurrentBattery,
        setPreferences,
        isLoaded,
        savedVehicles,
        isSyncing,
        saveToServer,
        deleteFromServer,
        setActiveOnServer,
        refreshFromServer,
        activeVehicle,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicle() {
  const context = useContext(VehicleContext);
  if (context === undefined) {
    throw new Error('useVehicle must be used within a VehicleProvider');
  }
  return context;
}
