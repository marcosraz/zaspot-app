/**
 * Popular EV models with battery specs
 * Shared between VehicleContext and Web platform
 */

export interface VehiclePreset {
  id: string;
  name: string;
  manufacturer: string;
  batteryCapacityKwh: number;
  rangeKm: number;
  maxChargingPowerKw: number;
  connectorType: string;
}

export const POPULAR_VEHICLES: VehiclePreset[] = [
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

// Group by manufacturer for UI
export function getVehiclesByManufacturer(): Map<string, VehiclePreset[]> {
  const map = new Map<string, VehiclePreset[]>();
  for (const v of POPULAR_VEHICLES) {
    const list = map.get(v.manufacturer) || [];
    list.push(v);
    map.set(v.manufacturer, list);
  }
  return map;
}

// Connector type compatibility for route planner
export function getCompatibleConnectors(connectorType: string): string[] {
  switch (connectorType) {
    case 'CCS2':
      return ['CCS2', 'CCS', 'Type 2'];
    case 'Type 2':
      return ['Type 2'];
    case 'CHAdeMO':
      return ['CHAdeMO'];
    default:
      return [connectorType];
  }
}
