import { describe, expect, it } from 'vitest';
import { EquipmentInventory } from '../assets/scripts/modules/equip/EquipmentInventory';
import { EquipmentSave } from '../assets/scripts/save/SaveData';

const BASIC_WEAPON: EquipmentSave = {
  instanceId: 'weapon_basic',
  templateId: 'equipment_ash_blade',
  rarity: 'common',
  level: 1,
  enhanceLevel: 0,
  starLevel: 0,
  affixes: [],
  protected: false,
};

describe('EquipmentInventory', () => {
  it('adds, equips, replaces and unequips items by slot', () => {
    const stronger = { ...BASIC_WEAPON, instanceId: 'weapon_strong', level: 3 };
    const inventory = new EquipmentInventory({ inventory: [BASIC_WEAPON], equippedBySlot: {} });

    expect(inventory.add(stronger)).toBe(true);
    expect(inventory.add(stronger)).toBe(false);
    expect(inventory.equip(BASIC_WEAPON.instanceId)).toBe('equipped');
    expect(inventory.equip(stronger.instanceId)).toBe('equipped');
    expect(inventory.toSave().equippedBySlot.weapon).toBe(stronger.instanceId);
    expect(inventory.unequip('weapon')?.instanceId).toBe(stronger.instanceId);
    expect(inventory.toSave().equippedBySlot.weapon).toBeUndefined();
  });

  it('aggregates main stats and affixes from equipped items', () => {
    const helmet: EquipmentSave = {
      instanceId: 'helmet_epic',
      templateId: 'equipment_scout_helmet',
      rarity: 'epic',
      level: 2,
      enhanceLevel: 0,
      starLevel: 0,
      affixes: [{ affixId: 'affix_attack_flat', value: 12 }],
      protected: true,
    };
    const inventory = new EquipmentInventory({
      inventory: [BASIC_WEAPON, helmet],
      equippedBySlot: { weapon: BASIC_WEAPON.instanceId, helmet: helmet.instanceId },
    });

    expect(inventory.getEquippedStats()).toMatchObject({
      'attack-flat': 15,
      'critical-damage': 0.1815,
    });
  });

  it('compares a candidate with the currently equipped item in the same slot', () => {
    const stronger = { ...BASIC_WEAPON, instanceId: 'weapon_strong', level: 3 };
    const inventory = new EquipmentInventory({
      inventory: [BASIC_WEAPON, stronger],
      equippedBySlot: { weapon: BASIC_WEAPON.instanceId },
    });

    expect(inventory.compare(stronger.instanceId)).toMatchObject({
      slot: 'weapon',
      currentInstanceId: BASIC_WEAPON.instanceId,
      statDifference: { 'attack-flat': 2 },
    });
    expect(inventory.compare('missing')).toBeNull();
  });
});
