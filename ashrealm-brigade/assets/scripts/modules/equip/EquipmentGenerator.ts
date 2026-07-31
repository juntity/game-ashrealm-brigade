import {
  AffixConfig,
  EQUIPMENT_CONFIG,
  EquipmentRarity,
  EquipmentTemplateConfig,
  RarityConfig,
} from '../../config/EquipmentConfig';
import { EQUIPMENT_DROP_CONFIG, EquipmentDropConfig } from '../../config/EquipmentDropConfig';
import { EquipmentAffixSave, EquipmentSave } from '../../save/SaveData';

export type RandomSource = () => number;
export type EquipmentIdFactory = () => string;

export interface EquipmentDropContext {
  readonly stage: number;
  readonly isBoss: boolean;
}

export class EquipmentGenerator {
  public constructor(
    private readonly random: RandomSource = Math.random,
    private readonly createId: EquipmentIdFactory = defaultIdFactory,
    private readonly dropConfig: EquipmentDropConfig = EQUIPMENT_DROP_CONFIG,
  ) {}

  public generate(context: EquipmentDropContext): EquipmentSave {
    const stage = Math.max(1, Math.floor(context.stage));
    const template = this.pick(EQUIPMENT_CONFIG.templates);
    const rarity = this.pickRarity(stage, context.isBoss);
    const affixCount = this.randomInteger(rarity.minAffixes, rarity.maxAffixes);
    const affixConfigs = this.pickUniqueAffixes(template, affixCount);

    return {
      instanceId: this.createId(),
      templateId: template.id,
      rarity: rarity.id,
      level: Math.floor((stage - 1) / this.dropConfig.equipmentLevelStageInterval) + 1,
      enhanceLevel: 0,
      starLevel: 0,
      affixes: affixConfigs.map((affix) => this.rollAffix(affix)),
      protected: rarity.autoProtect,
    };
  }

  private pickRarity(stage: number, isBoss: boolean): RarityConfig {
    const eligible = this.dropConfig.rarityWeights.filter((entry) => entry.unlockStage <= stage);
    const weighted = eligible.map((entry) => ({
      ...entry,
      effectiveWeight:
        entry.weight *
        (isBoss && rarityRank(entry.rarity) >= rarityRank('rare')
          ? this.dropConfig.bossHighRarityWeightMultiplier
          : 1),
    }));
    const total = weighted.reduce((sum, entry) => sum + entry.effectiveWeight, 0);
    let roll = this.normalizedRandom() * total;
    const selected =
      weighted.find((entry) => {
        roll -= entry.effectiveWeight;
        return roll < 0;
      }) ?? weighted[weighted.length - 1];
    const rarity = EQUIPMENT_CONFIG.rarities.find((entry) => entry.id === selected.rarity);
    if (rarity === undefined) {
      throw new Error(`Unknown equipment rarity: ${selected.rarity}.`);
    }
    return rarity;
  }

  private pickUniqueAffixes(
    template: EquipmentTemplateConfig,
    count: number,
  ): readonly AffixConfig[] {
    const pool = template.affixIds.map((id) => {
      const affix = EQUIPMENT_CONFIG.affixes.find((entry) => entry.id === id);
      if (affix === undefined) {
        throw new Error(`Unknown equipment affix: ${id}.`);
      }
      return affix;
    });
    const selected: AffixConfig[] = [];
    while (selected.length < Math.min(count, pool.length)) {
      selected.push(...pool.splice(this.randomInteger(0, pool.length - 1), 1));
    }
    return selected;
  }

  private rollAffix(affix: AffixConfig): EquipmentAffixSave {
    const rawValue = affix.minValue + (affix.maxValue - affix.minValue) * this.normalizedRandom();
    return {
      affixId: affix.id,
      value: affix.valueKind === 'flat' ? Math.round(rawValue) : round(rawValue, 4),
    };
  }

  private pick<T>(values: readonly T[]): T {
    if (values.length === 0) {
      throw new Error('Cannot pick from an empty collection.');
    }
    return values[this.randomInteger(0, values.length - 1)];
  }

  private randomInteger(minimum: number, maximum: number): number {
    return minimum + Math.floor(this.normalizedRandom() * (maximum - minimum + 1));
  }

  private normalizedRandom(): number {
    return Math.min(1 - Number.EPSILON, Math.max(0, this.random()));
  }
}

function rarityRank(rarity: EquipmentRarity): number {
  return EQUIPMENT_CONFIG.rarities.find((entry) => entry.id === rarity)?.rank ?? 0;
}

function round(value: number, decimalPlaces: number): number {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(value * factor) / factor;
}

let generatedId = 0;

function defaultIdFactory(): string {
  generatedId += 1;
  return `equipment_${Date.now()}_${generatedId}`;
}
