import { EQUIPMENT_CONFIG, EquipmentSlot } from '../../config/EquipmentConfig';
import {
  EQUIPMENT_PROGRESSION_CONFIG,
  EquipmentProgressionConfig,
} from '../../config/EquipmentProgressionConfig';
import { EquipmentCollectionSave, EquipmentSave, PlayerSave } from '../../save/SaveData';
import { BatchOperationPreview, EquipmentBag } from '../bag/EquipmentBag';

export type ProgressionResult =
  'changed' | 'not-found' | 'insufficient-gold' | 'insufficient-essence' | 'max-level';

export interface RemovalResult extends BatchOperationPreview {
  readonly goldGained: number;
  readonly essenceGained: number;
}

export interface AutoEquipResult {
  readonly changedSlots: readonly EquipmentSlot[];
  readonly equippedBySlot: Readonly<Partial<Record<EquipmentSlot, string>>>;
}

export class EquipmentWorkshop {
  private player: PlayerSave;
  private equipment: EquipmentCollectionSave;

  public constructor(
    player: PlayerSave,
    equipment: EquipmentCollectionSave,
    private readonly config: EquipmentProgressionConfig = EQUIPMENT_PROGRESSION_CONFIG,
  ) {
    this.player = { ...player };
    this.equipment = cloneCollection(equipment);
  }

  public getEnhanceCost(instanceId: string): number | null {
    const item = this.find(instanceId);
    if (item === undefined) {
      return null;
    }
    const rarityRank = this.requireRarityRank(item);
    return Math.floor(
      this.config.enhanceGoldBase *
        rarityRank *
        Math.pow(this.config.enhanceGoldGrowth, item.enhanceLevel),
    );
  }

  public enhance(instanceId: string): ProgressionResult {
    const item = this.find(instanceId);
    if (item === undefined) {
      return 'not-found';
    }
    if (item.enhanceLevel >= this.config.maxEnhanceLevel) {
      return 'max-level';
    }
    const cost = this.getEnhanceCost(instanceId) ?? 0;
    if (this.player.gold < cost) {
      return 'insufficient-gold';
    }
    this.player = { ...this.player, gold: this.player.gold - cost };
    this.replace({ ...item, enhanceLevel: item.enhanceLevel + 1 });
    return 'changed';
  }

  public getStarCost(instanceId: string): number | null {
    const item = this.find(instanceId);
    if (item === undefined || item.starLevel >= this.config.maxStarLevel) {
      return null;
    }
    return this.config.starEssenceCosts[item.starLevel] * this.requireRarityRank(item);
  }

  public starUp(instanceId: string): ProgressionResult {
    const item = this.find(instanceId);
    if (item === undefined) {
      return 'not-found';
    }
    if (item.starLevel >= this.config.maxStarLevel) {
      return 'max-level';
    }
    const cost = this.getStarCost(instanceId) ?? 0;
    if (this.player.equipmentEssence < cost) {
      return 'insufficient-essence';
    }
    this.player = {
      ...this.player,
      equipmentEssence: this.player.equipmentEssence - cost,
    };
    this.replace({ ...item, starLevel: item.starLevel + 1 });
    return 'changed';
  }

  public sell(instanceIds: readonly string[]): RemovalResult {
    return this.remove(instanceIds, 'sell');
  }

  public salvage(instanceIds: readonly string[]): RemovalResult {
    return this.remove(instanceIds, 'salvage');
  }

  public autoEquipBest(): AutoEquipResult {
    const entries = new EquipmentBag(this.equipment).query({ sortBy: 'score' });
    const bestBySlot = new Map<EquipmentSlot, string>();
    for (const entry of entries) {
      if (!bestBySlot.has(entry.slot)) {
        bestBySlot.set(entry.slot, entry.item.instanceId);
      }
    }

    const nextEquipped = { ...this.equipment.equippedBySlot };
    const changedSlots: EquipmentSlot[] = [];
    for (const [slot, instanceId] of bestBySlot) {
      if (nextEquipped[slot] !== instanceId) {
        nextEquipped[slot] = instanceId;
        changedSlots.push(slot);
      }
    }
    this.equipment = { ...this.equipment, equippedBySlot: nextEquipped };
    return { changedSlots, equippedBySlot: { ...nextEquipped } };
  }

  public getPlayer(): PlayerSave {
    return { ...this.player };
  }

  public getEquipment(): EquipmentCollectionSave {
    return cloneCollection(this.equipment);
  }

  private remove(instanceIds: readonly string[], operation: 'sell' | 'salvage'): RemovalResult {
    const preview = new EquipmentBag(this.equipment).previewBatch(instanceIds);
    const eligibleIds = new Set(preview.eligibleInstanceIds);
    let goldGained = 0;
    let essenceGained = 0;
    for (const item of this.equipment.inventory) {
      if (!eligibleIds.has(item.instanceId)) {
        continue;
      }
      const rarityRank = this.requireRarityRank(item);
      if (operation === 'sell') {
        goldGained += Math.floor(
          this.config.sellGoldBase *
            rarityRank *
            (1 + (item.level - 1) * 0.2) *
            (1 + item.enhanceLevel * 0.1),
        );
      } else {
        essenceGained += Math.floor(
          this.config.salvageEssenceBase *
            rarityRank *
            (1 + item.starLevel * 0.5) *
            (1 + item.enhanceLevel * 0.05),
        );
      }
    }
    this.equipment = {
      ...this.equipment,
      inventory: this.equipment.inventory
        .filter((item) => !eligibleIds.has(item.instanceId))
        .map(cloneItem),
    };
    this.player = {
      ...this.player,
      gold: this.player.gold + goldGained,
      equipmentEssence: this.player.equipmentEssence + essenceGained,
    };
    return { ...preview, goldGained, essenceGained };
  }

  private find(instanceId: string): EquipmentSave | undefined {
    return this.equipment.inventory.find((item) => item.instanceId === instanceId);
  }

  private replace(item: EquipmentSave): void {
    this.equipment = {
      ...this.equipment,
      inventory: this.equipment.inventory.map((entry) =>
        entry.instanceId === item.instanceId ? cloneItem(item) : entry,
      ),
    };
  }

  private requireRarityRank(item: EquipmentSave): number {
    const rarity = EQUIPMENT_CONFIG.rarities.find((entry) => entry.id === item.rarity);
    if (rarity === undefined) {
      throw new Error(`Unknown equipment rarity: ${item.rarity}.`);
    }
    return rarity.rank;
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
