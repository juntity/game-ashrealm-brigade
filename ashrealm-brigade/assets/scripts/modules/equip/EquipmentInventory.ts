import {
  EQUIPMENT_CONFIG,
  EquipmentSlot,
  EquipmentStatType,
  EquipmentTemplateConfig,
} from '../../config/EquipmentConfig';
import { EquipmentCollectionSave, EquipmentSave } from '../../save/SaveData';
import { EQUIPMENT_PROGRESSION_CONFIG } from '../../config/EquipmentProgressionConfig';

export type EquipResult = 'equipped' | 'not-found' | 'already-equipped';

export type EquipmentStats = Readonly<Record<EquipmentStatType, number>>;

export interface EquipmentComparison {
  readonly slot: EquipmentSlot;
  readonly currentInstanceId: string | null;
  readonly statDifference: EquipmentStats;
}

export class EquipmentInventory {
  private readonly items: EquipmentSave[];
  private readonly equippedBySlot: Partial<Record<EquipmentSlot, string>>;

  public constructor(save: EquipmentCollectionSave) {
    this.items = save.inventory.map(cloneEquipment);
    this.equippedBySlot = { ...save.equippedBySlot };
  }

  public add(item: EquipmentSave): boolean {
    if (this.items.some((entry) => entry.instanceId === item.instanceId)) {
      return false;
    }
    this.items.push(cloneEquipment(item));
    return true;
  }

  public equip(instanceId: string): EquipResult {
    const item = this.items.find((entry) => entry.instanceId === instanceId);
    if (item === undefined) {
      return 'not-found';
    }
    const slot = this.requireTemplate(item.templateId).slot;
    if (this.equippedBySlot[slot] === instanceId) {
      return 'already-equipped';
    }
    this.equippedBySlot[slot] = instanceId;
    return 'equipped';
  }

  public unequip(slot: EquipmentSlot): EquipmentSave | null {
    const instanceId = this.equippedBySlot[slot];
    if (instanceId === undefined) {
      return null;
    }
    delete this.equippedBySlot[slot];
    return this.get(instanceId);
  }

  public compare(instanceId: string): EquipmentComparison | null {
    const candidate = this.get(instanceId);
    if (candidate === null) {
      return null;
    }
    const slot = this.requireTemplate(candidate.templateId).slot;
    const currentInstanceId = this.equippedBySlot[slot] ?? null;
    const current = currentInstanceId === null ? null : this.get(currentInstanceId);
    return {
      slot,
      currentInstanceId,
      statDifference: subtractStats(
        this.calculateItemStats(candidate),
        current === null ? emptyStats() : this.calculateItemStats(current),
      ),
    };
  }

  public getEquippedStats(): EquipmentStats {
    return Object.values(this.equippedBySlot).reduce<EquipmentStats>((total, instanceId) => {
      const item = this.get(instanceId);
      return item === null ? total : addStats(total, this.calculateItemStats(item));
    }, emptyStats());
  }

  public calculateItemStats(item: EquipmentSave): EquipmentStats {
    const template = this.requireTemplate(item.templateId);
    const rarity = EQUIPMENT_CONFIG.rarities.find((entry) => entry.id === item.rarity);
    if (rarity === undefined) {
      throw new Error(`Unknown equipment rarity: ${item.rarity}.`);
    }
    const stats = mutableEmptyStats();
    stats[template.mainStatType] +=
      (template.baseMainStat + (item.level - 1) * template.mainStatPerLevel) *
      rarity.statMultiplier *
      (1 +
        item.enhanceLevel * EQUIPMENT_PROGRESSION_CONFIG.enhanceMainStatBonusPerLevel +
        item.starLevel * EQUIPMENT_PROGRESSION_CONFIG.starMainStatBonusPerLevel);
    for (const roll of item.affixes) {
      const affix = EQUIPMENT_CONFIG.affixes.find((entry) => entry.id === roll.affixId);
      if (affix === undefined) {
        throw new Error(`Unknown equipment affix: ${roll.affixId}.`);
      }
      stats[affix.statType] += roll.value;
    }
    return stats;
  }

  public get(instanceId: string): EquipmentSave | null {
    const item = this.items.find((entry) => entry.instanceId === instanceId);
    return item === undefined ? null : cloneEquipment(item);
  }

  public toSave(): EquipmentCollectionSave {
    return {
      inventory: this.items.map(cloneEquipment),
      equippedBySlot: { ...this.equippedBySlot },
    };
  }

  private requireTemplate(templateId: string): EquipmentTemplateConfig {
    const template = EQUIPMENT_CONFIG.templates.find((entry) => entry.id === templateId);
    if (template === undefined) {
      throw new Error(`Unknown equipment template: ${templateId}.`);
    }
    return template;
  }
}

const STAT_TYPES: readonly EquipmentStatType[] = [
  'attack-flat',
  'attack-multiplier',
  'critical-rate',
  'critical-damage',
  'attack-speed',
  'boss-damage',
  'gold-multiplier',
  'offline-multiplier',
];

function mutableEmptyStats(): Record<EquipmentStatType, number> {
  return Object.fromEntries(STAT_TYPES.map((stat) => [stat, 0])) as Record<
    EquipmentStatType,
    number
  >;
}

function emptyStats(): EquipmentStats {
  return mutableEmptyStats();
}

function addStats(left: EquipmentStats, right: EquipmentStats): EquipmentStats {
  const result = mutableEmptyStats();
  for (const stat of STAT_TYPES) {
    result[stat] = left[stat] + right[stat];
  }
  return result;
}

function subtractStats(left: EquipmentStats, right: EquipmentStats): EquipmentStats {
  const result = mutableEmptyStats();
  for (const stat of STAT_TYPES) {
    result[stat] = left[stat] - right[stat];
  }
  return result;
}

function cloneEquipment(item: EquipmentSave): EquipmentSave {
  return { ...item, affixes: item.affixes.map((affix) => ({ ...affix })) };
}
