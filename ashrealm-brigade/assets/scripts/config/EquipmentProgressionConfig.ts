export interface EquipmentProgressionConfig {
  readonly maxEnhanceLevel: number;
  readonly maxStarLevel: number;
  readonly enhanceMainStatBonusPerLevel: number;
  readonly starMainStatBonusPerLevel: number;
  readonly enhanceGoldBase: number;
  readonly enhanceGoldGrowth: number;
  readonly starEssenceCosts: readonly number[];
  readonly sellGoldBase: number;
  readonly salvageEssenceBase: number;
}

export const EQUIPMENT_PROGRESSION_CONFIG: Readonly<EquipmentProgressionConfig> = {
  maxEnhanceLevel: 20,
  maxStarLevel: 5,
  enhanceMainStatBonusPerLevel: 0.05,
  starMainStatBonusPerLevel: 0.15,
  enhanceGoldBase: 20,
  enhanceGoldGrowth: 1.25,
  starEssenceCosts: [20, 50, 100, 200, 400],
  sellGoldBase: 10,
  salvageEssenceBase: 5,
};
