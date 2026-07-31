import { EquipmentRarity } from './EquipmentConfig';

export interface EquipmentRarityWeight {
  readonly rarity: EquipmentRarity;
  readonly weight: number;
  readonly unlockStage: number;
}

export interface EquipmentDropConfig {
  readonly rarityWeights: readonly EquipmentRarityWeight[];
  readonly bossHighRarityWeightMultiplier: number;
  readonly equipmentLevelStageInterval: number;
}

export const EQUIPMENT_DROP_CONFIG: Readonly<EquipmentDropConfig> = {
  rarityWeights: [
    { rarity: 'common', weight: 60, unlockStage: 1 },
    { rarity: 'uncommon', weight: 27, unlockStage: 1 },
    { rarity: 'rare', weight: 10, unlockStage: 5 },
    { rarity: 'epic', weight: 2.5, unlockStage: 10 },
    { rarity: 'legendary', weight: 0.45, unlockStage: 30 },
    { rarity: 'mythic', weight: 0.05, unlockStage: 60 },
  ],
  bossHighRarityWeightMultiplier: 2,
  equipmentLevelStageInterval: 5,
};
