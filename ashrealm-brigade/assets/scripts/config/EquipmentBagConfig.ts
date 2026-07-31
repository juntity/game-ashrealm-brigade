import { EquipmentStatType } from './EquipmentConfig';

export interface EquipmentBagConfig {
  readonly scoreWeights: Readonly<Record<EquipmentStatType, number>>;
}

export const EQUIPMENT_BAG_CONFIG: Readonly<EquipmentBagConfig> = {
  scoreWeights: {
    'attack-flat': 1,
    'attack-multiplier': 100,
    'critical-rate': 120,
    'critical-damage': 40,
    'attack-speed': 100,
    'boss-damage': 70,
    'gold-multiplier': 50,
    'offline-multiplier': 40,
  },
};
