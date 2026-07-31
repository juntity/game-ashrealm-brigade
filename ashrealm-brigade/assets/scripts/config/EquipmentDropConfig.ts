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
  readonly normalDropChance: number;
  readonly normalPityMisses: number;
  readonly bossMythicSoftPityStart: number;
  readonly bossMythicSoftPityStep: number;
  readonly bossMythicHardPity: number;
  readonly bossTiers: readonly BossDropTier[];
}

export interface BossDropTier {
  readonly minimumStage: number;
  readonly minimumRarity: EquipmentRarity;
  readonly mythicChance: number;
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
  normalDropChance: 0.2,
  normalPityMisses: 5,
  bossMythicSoftPityStart: 70,
  bossMythicSoftPityStep: 0.02,
  bossMythicHardPity: 100,
  bossTiers: [
    { minimumStage: 10, minimumRarity: 'rare', mythicChance: 0 },
    { minimumStage: 30, minimumRarity: 'epic', mythicChance: 0.001 },
    { minimumStage: 60, minimumRarity: 'epic', mythicChance: 0.003 },
    { minimumStage: 100, minimumRarity: 'legendary', mythicChance: 0.005 },
    { minimumStage: 200, minimumRarity: 'legendary', mythicChance: 0.008 },
    { minimumStage: 500, minimumRarity: 'legendary', mythicChance: 0.012 },
  ],
};
