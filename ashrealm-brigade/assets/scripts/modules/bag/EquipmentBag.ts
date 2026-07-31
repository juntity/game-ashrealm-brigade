import { EQUIPMENT_BAG_CONFIG, EquipmentBagConfig } from '../../config/EquipmentBagConfig';
import { EQUIPMENT_CONFIG, EquipmentRarity, EquipmentSlot } from '../../config/EquipmentConfig';
import { EquipmentCollectionSave, EquipmentSave } from '../../save/SaveData';
import { EquipmentInventory } from '../equip/EquipmentInventory';

export type EquipmentSortKey = 'rarity' | 'level' | 'score';
export type SortDirection = 'ascending' | 'descending';
export type ProtectionResult = 'changed' | 'not-found' | 'unchanged';
export type BatchBlockReason = 'protected' | 'equipped' | 'not-found';

export interface EquipmentBagQuery {
  readonly slots?: readonly EquipmentSlot[];
  readonly rarities?: readonly EquipmentRarity[];
  readonly sortBy?: EquipmentSortKey;
  readonly direction?: SortDirection;
}

export interface EquipmentBagEntry {
  readonly item: EquipmentSave;
  readonly slot: EquipmentSlot;
  readonly rarityRank: number;
  readonly score: number;
  readonly equipped: boolean;
}

export interface BlockedBatchItem {
  readonly instanceId: string;
  readonly reason: BatchBlockReason;
}

export interface BatchOperationPreview {
  readonly eligibleInstanceIds: readonly string[];
  readonly blocked: readonly BlockedBatchItem[];
}

export class EquipmentBag {
  private save: EquipmentCollectionSave;

  public constructor(
    save: EquipmentCollectionSave,
    private readonly config: EquipmentBagConfig = EQUIPMENT_BAG_CONFIG,
  ) {
    this.save = cloneCollection(save);
  }

  public query(query: EquipmentBagQuery = {}): readonly EquipmentBagEntry[] {
    const slots = query.slots === undefined ? null : new Set(query.slots);
    const rarities = query.rarities === undefined ? null : new Set(query.rarities);
    const sortBy = query.sortBy ?? 'rarity';
    const directionMultiplier = query.direction === 'ascending' ? 1 : -1;

    return this.save.inventory
      .map((item) => this.toEntry(item))
      .filter(
        (entry) =>
          (slots === null || slots.has(entry.slot)) &&
          (rarities === null || rarities.has(entry.item.rarity)),
      )
      .sort((left, right) => {
        const primaryDifference = getSortValue(left, sortBy) - getSortValue(right, sortBy);
        if (primaryDifference !== 0) {
          return primaryDifference * directionMultiplier;
        }
        const rarityDifference = right.rarityRank - left.rarityRank;
        if (rarityDifference !== 0) {
          return rarityDifference;
        }
        const levelDifference = right.item.level - left.item.level;
        if (levelDifference !== 0) {
          return levelDifference;
        }
        return left.item.instanceId.localeCompare(right.item.instanceId);
      });
  }

  public setProtected(instanceId: string, protectedValue: boolean): ProtectionResult {
    const index = this.save.inventory.findIndex((item) => item.instanceId === instanceId);
    if (index < 0) {
      return 'not-found';
    }
    if (this.save.inventory[index].protected === protectedValue) {
      return 'unchanged';
    }
    this.save.inventory[index] = { ...this.save.inventory[index], protected: protectedValue };
    return 'changed';
  }

  public previewBatch(instanceIds: readonly string[]): BatchOperationPreview {
    const equippedIds = new Set(Object.values(this.save.equippedBySlot));
    const eligibleInstanceIds: string[] = [];
    const blocked: BlockedBatchItem[] = [];

    for (const instanceId of [...new Set(instanceIds)]) {
      const item = this.save.inventory.find((entry) => entry.instanceId === instanceId);
      if (item === undefined) {
        blocked.push({ instanceId, reason: 'not-found' });
      } else if (item.protected) {
        blocked.push({ instanceId, reason: 'protected' });
      } else if (equippedIds.has(instanceId)) {
        blocked.push({ instanceId, reason: 'equipped' });
      } else {
        eligibleInstanceIds.push(instanceId);
      }
    }

    return { eligibleInstanceIds, blocked };
  }

  public toSave(): EquipmentCollectionSave {
    return cloneCollection(this.save);
  }

  private toEntry(item: EquipmentSave): EquipmentBagEntry {
    const template = EQUIPMENT_CONFIG.templates.find((entry) => entry.id === item.templateId);
    const rarity = EQUIPMENT_CONFIG.rarities.find((entry) => entry.id === item.rarity);
    if (template === undefined || rarity === undefined) {
      throw new Error(`Invalid equipment item: ${item.instanceId}.`);
    }
    const stats = new EquipmentInventory({
      inventory: [item],
      equippedBySlot: {},
    }).calculateItemStats(item);
    const score = Object.entries(stats).reduce(
      (total, [stat, value]) =>
        total + value * this.config.scoreWeights[stat as keyof typeof this.config.scoreWeights],
      0,
    );
    return {
      item: cloneItem(item),
      slot: template.slot,
      rarityRank: rarity.rank,
      score: round(score, 4),
      equipped: Object.values(this.save.equippedBySlot).includes(item.instanceId),
    };
  }
}

function getSortValue(entry: EquipmentBagEntry, sortBy: EquipmentSortKey): number {
  switch (sortBy) {
    case 'rarity':
      return entry.rarityRank;
    case 'level':
      return entry.item.level;
    case 'score':
      return entry.score;
  }
}

function cloneCollection(save: EquipmentCollectionSave): EquipmentCollectionSave {
  return {
    inventory: save.inventory.map(cloneItem),
    equippedBySlot: { ...save.equippedBySlot },
  };
}

function cloneItem(item: EquipmentSave): EquipmentSave {
  return { ...item, affixes: item.affixes.map((affix) => ({ ...affix })) };
}

function round(value: number, decimalPlaces: number): number {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(value * factor) / factor;
}
