/**
 * Vehicle Context - Manages EV profile settings
 * Stores battery capacity, range, and charging preferences
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

const VEHICLE_STORAGE_KEY = '@zaspot_vehicle';

// Popular EV models with specs
export const POPULAR_VEHICLES: VehicleProfile[] = [
  {
    id: 'skoda-enyaq-iv-80',
    name: 'Enyaq iV 80',
    manufacturer: 'Škoda',
    batteryCapacityKwh: 77,
    rangeKm: 536,
    maxChargingPowerKw: 135,
    connectorType: 'CCS2',
  },
  {
    id: 'skoda-enyaq-iv-60',
    name: 'Enyaq iV 60',
    manufacturer: 'Škoda',
    batteryCapacityKwh: 58,
    rangeKm: 412,
    maxChargingPowerKw: 120,
    connectorType: 'CCS2',
  },
  {
    id: 'vw-id4-pro',
    name: 'ID.4 Pro',
    manufacturer: 'Volkswagen',
    batteryCapacityKwh: 77,
    rangeKm: 520,
    maxChargingPowerKw: 135,
    connectorType: 'CCS2',
  },
  {
    id: 'vw-id3-pro',
    name: 'ID.3 Pro',
    manufacturer: 'Volkswagen',
    batteryCapacityKwh: 58,
    rangeKm: 426,
    maxChargingPowerKw: 120,
    connectorType: 'CCS2',
  },
  {
    id: 'tesla-model-3-lr',
    name: 'Model 3 Long Range',
    manufacturer: 'Tesla',
    batteryCapacityKwh: 75,
    rangeKm: 602,
    maxChargingPowerKw: 250,
    connectorType: 'CCS2',
  },
  {
    id: 'tesla-model-y-lr',
    name: 'Model Y Long Range',
    manufacturer: 'Tesla',
    batteryCapacityKwh: 75,
    rangeKm: 533,
    maxChargingPowerKw: 250,
    connectorType: 'CCS2',
  },
  {
    id: 'hyundai-ioniq-5-lr',
    name: 'IONIQ 5 Long Range',
    manufacturer: 'Hyundai',
    batteryCapacityKwh: 77.4,
    rangeKm: 507,
    maxChargingPowerKw: 220,
    connectorType: 'CCS2',
  },
  {
    id: 'kia-ev6-lr',
    name: 'EV6 Long Range',
    manufacturer: 'Kia',
    batteryCapacityKwh: 77.4,
    rangeKm: 528,
    maxChargingPowerKw: 233,
    connectorType: 'CCS2',
  },
  {
    id: 'bmw-ix3',
    name: 'iX3',
    manufacturer: 'BMW',
    batteryCapacityKwh: 74,
    rangeKm: 461,
    maxChargingPowerKw: 150,
    connectorType: 'CCS2',
  },
  {
    id: 'mercedes-eqa-250',
    name: 'EQA 250',
    manufacturer: 'Mercedes-Benz',
    batteryCapacityKwh: 66.5,
    rangeKm: 426,
    maxChargingPowerKw: 100,
    connectorType: 'CCS2',
  },
  {
    id: 'peugeot-e-208',
    name: 'e-208',
    manufacturer: 'Peugeot',
    batteryCapacityKwh: 50,
    rangeKm: 362,
    maxChargingPowerKw: 100,
    connectorType: 'CCS2',
  },
  {
    id: 'renault-zoe',
    name: 'Zoe R135',
    manufacturer: 'Renault',
    batteryCapacityKwh: 52,
    rangeKm: 395,
    maxChargingPowerKw: 50,
    connectorType: 'Type 2',
  },
  {
    id: 'cupra-born',
    name: 'Born',
    manufacturer: 'Cupra',
    batteryCapacityKwh: 58,
    rangeKm: 424,
    maxChargingPowerKw: 120,
    connectorType: 'CCS2',
  },
  {
    id: 'audi-q4-etron',
    name: 'Q4 e-tron 50',
    manufacturer: 'Audi',
    batteryCapacityKwh: 76.6,
    rangeKm: 488,
    maxChargingPowerKw: 135,
    connectorType: 'CCS2',
  },
];

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

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (isLoaded) {
      saveSettings(settings);
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

  const saveSettings = async (newSettings: VehicleSettings) => {
    try {
      await AsyncStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save vehicle settings:', error);
    }
  };

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

  return (
    <VehicleContext.Provider
      value={{
        settings,
        setSelectedVehicle,
        setCustomVehicle,
        setCurrentBattery,
        setPreferences,
        isLoaded,
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
