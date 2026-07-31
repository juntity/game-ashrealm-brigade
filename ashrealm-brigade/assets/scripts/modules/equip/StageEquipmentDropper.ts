import { EquipmentCollectionSave, EquipmentDropPitySave, EquipmentSave } from '../../save/SaveData';
import {
  EQUIPMENT_DROP_CONFIG,
  BossDropTier,
  EquipmentDropConfig,
} from '../../config/EquipmentDropConfig';
import { EconomyCalculator } from '../economy/EconomyCalculator';
import { EquipmentDropContext, EquipmentGenerator } from './EquipmentGenerator';
import { EquipmentInventory } from './EquipmentInventory';

export interface EquipmentDropGenerator {
  generate(context: EquipmentDropContext): EquipmentSave;
}

export interface StageDropResult {
  readonly equipment: EquipmentCollectionSave;
  readonly drops: readonly EquipmentSave[];
  readonly pity: EquipmentDropPitySave;
}

export class StageEquipmentDropper {
  public constructor(
    private readonly generator: EquipmentDropGenerator = new EquipmentGenerator(),
    private readonly economy: EconomyCalculator = new EconomyCalculator(),
    private readonly random: () => number = Math.random,
    private readonly config: EquipmentDropConfig = EQUIPMENT_DROP_CONFIG,
  ) {}

  public collect(
    equipment: EquipmentCollectionSave,
    previousStage: number,
    currentStage: number,
    initialPity: EquipmentDropPitySave,
  ): StageDropResult {
    const inventory = new EquipmentInventory(equipment);
    const drops: EquipmentSave[] = [];
    let normalMisses = initialPity.normalMisses;
    let bossesSinceMythic = initialPity.bossesSinceMythic;
    for (let clearedStage = previousStage; clearedStage < currentStage; clearedStage += 1) {
      const isBoss = this.economy.isBossStage(clearedStage);
      if (
        !isBoss &&
        this.random() >= this.config.normalDropChance &&
        normalMisses < this.config.normalPityMisses
      ) {
        normalMisses += 1;
        continue;
      }
      const bossTier = isBoss ? this.getBossTier(clearedStage) : undefined;
      const mythicChance =
        bossTier === undefined ? undefined : this.getBossMythicChance(bossTier, bossesSinceMythic);
      const drop = this.generator.generate({
        stage: clearedStage,
        isBoss,
        minimumRarity: bossTier?.minimumRarity,
        mythicChance,
      });
      if (inventory.add(drop)) {
        drops.push(drop);
      }
      if (isBoss) {
        bossesSinceMythic = drop.rarity === 'mythic' ? 0 : bossesSinceMythic + 1;
      } else {
        normalMisses = 0;
      }
    }
    return {
      equipment: inventory.toSave(),
      drops,
      pity: { normalMisses, bossesSinceMythic },
    };
  }

  private getBossTier(stage: number): BossDropTier {
    return (
      [...this.config.bossTiers].reverse().find((tier) => tier.minimumStage <= stage) ??
      this.config.bossTiers[0]
    );
  }

  private getBossMythicChance(tier: BossDropTier, bossesSinceMythic: number): number {
    if (bossesSinceMythic + 1 >= this.config.bossMythicHardPity) {
      return 1;
    }
    const currentBossCount = bossesSinceMythic + 1;
    const softPityBonus =
      currentBossCount >= this.config.bossMythicSoftPityStart
        ? (currentBossCount - this.config.bossMythicSoftPityStart + 1) *
          this.config.bossMythicSoftPityStep
        : 0;
    return Math.min(1, tier.mythicChance + softPityBonus);
  }
}
