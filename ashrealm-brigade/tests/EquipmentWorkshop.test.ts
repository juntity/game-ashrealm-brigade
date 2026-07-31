import { describe, expect, it } from 'vitest';
import { EquipmentWorkshop } from '../assets/scripts/modules/equip/EquipmentWorkshop';
import {
  EquipmentCollectionSave,
  EquipmentSave,
  PlayerSave,
} from '../assets/scripts/save/SaveData';

const PLAYER: PlayerSave = { gold: 10_000, diamonds: 0, equipmentEssence: 10_000 };

describe('EquipmentWorkshop', () => {
  it('enhances without failure and spends the configured gold cost', () => {
    const workshop = createWorkshop([item('weapon', 'equipment_ash_blade', 'common')]);

    expect(workshop.getEnhanceCost('weapon')).toBe(20);
    expect(workshop.enhance('weapon')).toBe('changed');
    expect(workshop.getPlayer().gold).toBe(9_980);
    expect(workshop.getEquipment().inventory[0].enhanceLevel).toBe(1);
  });

  it('does not mutate resources when enhancement or star-up is unaffordable', () => {
    const workshop = new EquipmentWorkshop(
      { gold: 0, diamonds: 0, equipmentEssence: 0 },
      collection([item('epic', 'equipment_ash_blade', 'epic')]),
    );

    expect(workshop.enhance('epic')).toBe('insufficient-gold');
    expect(workshop.starUp('epic')).toBe('insufficient-essence');
    expect(workshop.getEquipment().inventory[0]).toMatchObject({
      enhanceLevel: 0,
      starLevel: 0,
    });
  });

  it('raises stars with essence and improves item score', () => {
    const base = item('rare_weapon', 'equipment_ash_blade', 'rare');
    const workshop = createWorkshop([base]);

    expect(workshop.getStarCost(base.instanceId)).toBe(60);
    expect(workshop.starUp(base.instanceId)).toBe('changed');
    expect(workshop.getPlayer().equipmentEssence).toBe(9_940);
    expect(workshop.getEquipment().inventory[0].starLevel).toBe(1);
  });

  it('sells and salvages only unprotected unequipped items', () => {
    const protectedItem = { ...item('protected', 'equipment_ash_blade', 'epic'), protected: true };
    const equipped = item('equipped', 'equipment_scout_helmet', 'rare');
    const sellable = item('sellable', 'equipment_gilded_ring', 'uncommon');
    const workshop = new EquipmentWorkshop(
      { gold: 0, diamonds: 0, equipmentEssence: 0 },
      {
        inventory: [protectedItem, equipped, sellable],
        equippedBySlot: { helmet: equipped.instanceId },
      },
    );

    const sold = workshop.sell(['protected', 'equipped', 'sellable']);
    expect(sold.eligibleInstanceIds).toEqual(['sellable']);
    expect(sold.blocked).toEqual([
      { instanceId: 'protected', reason: 'protected' },
      { instanceId: 'equipped', reason: 'equipped' },
    ]);
    expect(sold.goldGained).toBe(20);
    expect(workshop.getEquipment().inventory.map((entry) => entry.instanceId)).toEqual([
      'protected',
      'equipped',
    ]);

    expect(workshop.salvage(['protected', 'equipped']).essenceGained).toBe(0);
  });

  it('equips the highest-score item for each available slot', () => {
    const weakWeapon = item('weak_weapon', 'equipment_ash_blade', 'common');
    const strongWeapon = { ...item('strong_weapon', 'equipment_ash_blade', 'rare'), level: 4 };
    const helmet = item('helmet', 'equipment_scout_helmet', 'uncommon');
    const workshop = createWorkshop([weakWeapon, strongWeapon, helmet]);

    const result = workshop.autoEquipBest();

    expect(result.changedSlots).toEqual(['weapon', 'helmet']);
    expect(result.equippedBySlot).toEqual({ weapon: 'strong_weapon', helmet: 'helmet' });
    expect(workshop.autoEquipBest().changedSlots).toEqual([]);
  });
});

function createWorkshop(items: readonly EquipmentSave[]): EquipmentWorkshop {
  return new EquipmentWorkshop(PLAYER, collection(items));
}

function collection(items: readonly EquipmentSave[]): EquipmentCollectionSave {
  return { inventory: [...items], equippedBySlot: {} };
}

function item(
  instanceId: string,
  templateId: string,
  rarity: EquipmentSave['rarity'],
): EquipmentSave {
  return {
    instanceId,
    templateId,
    rarity,
    level: 1,
    enhanceLevel: 0,
    starLevel: 0,
    affixes: [],
    protected: false,
  };
}
