import { describe, expect, it } from 'vitest';
import { EquipmentGenerator } from '../assets/scripts/modules/equip/EquipmentGenerator';

describe('EquipmentGenerator', () => {
  it('generates a reproducible early-stage common item', () => {
    const randomValues = [0, 0, 0];
    const generator = new EquipmentGenerator(
      () => randomValues.shift() ?? 0,
      () => 'equipment_test_1',
    );

    expect(generator.generate({ stage: 1, isBoss: false })).toEqual({
      instanceId: 'equipment_test_1',
      templateId: 'equipment_ash_blade',
      rarity: 'common',
      level: 1,
      enhanceLevel: 0,
      starLevel: 0,
      affixes: [],
      protected: false,
    });
  });

  it('unlocks high rarities by stage and auto-protects epic items', () => {
    const randomValues = [0, 0.98, 0, 0, 0, 0.5, 0, 0.5];
    const generator = new EquipmentGenerator(
      () => randomValues.shift() ?? 0,
      () => 'equipment_test_2',
    );

    const item = generator.generate({ stage: 10, isBoss: false });

    expect(item).toMatchObject({
      rarity: 'epic',
      level: 2,
      protected: true,
    });
    expect(item.affixes).toHaveLength(2);
    expect(new Set(item.affixes.map((affix) => affix.affixId)).size).toBe(2);
  });

  it('boosts rare-or-better weights for bosses', () => {
    const regular = new EquipmentGenerator(
      () => 0.86,
      () => 'regular',
    ).generate({
      stage: 10,
      isBoss: false,
    });
    const boss = new EquipmentGenerator(
      () => 0.86,
      () => 'boss',
    ).generate({
      stage: 10,
      isBoss: true,
    });

    expect(regular.rarity).toBe('uncommon');
    expect(['rare', 'epic']).toContain(boss.rarity);
  });
  it('honors boss minimum rarity and an explicit mythic roll', () => {
    const minimum = new EquipmentGenerator(
      () => 0,
      () => 'minimum',
    ).generate({
      stage: 100,
      isBoss: true,
      minimumRarity: 'legendary',
      mythicChance: 0,
    });
    const mythic = new EquipmentGenerator(
      () => 0,
      () => 'mythic',
    ).generate({
      stage: 100,
      isBoss: true,
      minimumRarity: 'legendary',
      mythicChance: 1,
    });

    expect(minimum.rarity).toBe('legendary');
    expect(mythic.rarity).toBe('mythic');
    expect(mythic.protected).toBe(true);
  });
});
