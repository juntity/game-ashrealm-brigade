import { describe, expect, it } from 'vitest';
import { EquipmentBag } from '../assets/scripts/modules/bag/EquipmentBag';
import { EquipmentCollectionSave, EquipmentSave } from '../assets/scripts/save/SaveData';

const ITEMS: readonly EquipmentSave[] = [
  item('weapon_common', 'equipment_ash_blade', 'common', 3, false),
  item('weapon_epic', 'equipment_ash_blade', 'epic', 1, true),
  item('helmet_rare', 'equipment_scout_helmet', 'rare', 5, false),
  {
    ...item('ring_rare', 'equipment_gilded_ring', 'rare', 5, false),
    affixes: [{ affixId: 'affix_attack_flat', value: 20 }],
  },
];

const SAVE: EquipmentCollectionSave = {
  inventory: [...ITEMS],
  equippedBySlot: { helmet: 'helmet_rare' },
};

describe('EquipmentBag', () => {
  it('filters by slot and rarity together', () => {
    const entries = new EquipmentBag(SAVE).query({
      slots: ['weapon', 'helmet'],
      rarities: ['rare', 'epic'],
    });

    expect(entries.map((entry) => entry.item.instanceId)).toEqual(['weapon_epic', 'helmet_rare']);
    expect(entries[1].equipped).toBe(true);
  });

  it('sorts by rarity descending by default', () => {
    const entries = new EquipmentBag(SAVE).query();

    expect(entries.map((entry) => entry.item.instanceId)).toEqual([
      'weapon_epic',
      'helmet_rare',
      'ring_rare',
      'weapon_common',
    ]);
  });

  it('sorts by score and uses stable rarity, level and id tie breakers', () => {
    const entries = new EquipmentBag(SAVE).query({ sortBy: 'score' });

    expect(entries.map((entry) => entry.item.instanceId)).toEqual([
      'ring_rare',
      'helmet_rare',
      'weapon_common',
      'weapon_epic',
    ]);
  });

  it('supports protecting and unprotecting an item without mutating input', () => {
    const bag = new EquipmentBag(SAVE);

    expect(bag.setProtected('weapon_common', true)).toBe('changed');
    expect(bag.setProtected('weapon_common', true)).toBe('unchanged');
    expect(bag.setProtected('missing', true)).toBe('not-found');
    expect(bag.toSave().inventory[0].protected).toBe(true);
    expect(SAVE.inventory[0].protected).toBe(false);
    expect(bag.setProtected('weapon_epic', false)).toBe('changed');
  });

  it('excludes protected and equipped items from batch operations', () => {
    const preview = new EquipmentBag(SAVE).previewBatch([
      'weapon_common',
      'weapon_epic',
      'helmet_rare',
      'missing',
      'weapon_common',
    ]);

    expect(preview).toEqual({
      eligibleInstanceIds: ['weapon_common'],
      blocked: [
        { instanceId: 'weapon_epic', reason: 'protected' },
        { instanceId: 'helmet_rare', reason: 'equipped' },
        { instanceId: 'missing', reason: 'not-found' },
      ],
    });
  });
});

function item(
  instanceId: string,
  templateId: string,
  rarity: EquipmentSave['rarity'],
  level: number,
  protectedValue: boolean,
): EquipmentSave {
  return {
    instanceId,
    templateId,
    rarity,
    level,
    enhanceLevel: 0,
    starLevel: 0,
    affixes: [],
    protected: protectedValue,
  };
}
