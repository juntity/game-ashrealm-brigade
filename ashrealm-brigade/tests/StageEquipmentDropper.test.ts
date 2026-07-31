import { describe, expect, it } from 'vitest';
import { EquipmentDropContext } from '../assets/scripts/modules/equip/EquipmentGenerator';
import {
  EquipmentDropGenerator,
  StageEquipmentDropper,
} from '../assets/scripts/modules/equip/StageEquipmentDropper';
import { EquipmentSave } from '../assets/scripts/save/SaveData';

describe('StageEquipmentDropper', () => {
  it('adds exactly one equipment item for every cleared stage', () => {
    const generator = new FakeGenerator();
    const dropper = new StageEquipmentDropper(generator, undefined, () => 0);

    const result = dropper.collect({ inventory: [], equippedBySlot: {} }, 3, 6, {
      normalMisses: 0,
      bossesSinceMythic: 0,
    });

    expect(result.drops.map((item) => item.instanceId)).toEqual(['drop_3', 'drop_4', 'drop_5']);
    expect(result.equipment.inventory).toHaveLength(3);
    expect(generator.contexts).toMatchObject([
      { stage: 3, isBoss: false },
      { stage: 4, isBoss: false },
      { stage: 5, isBoss: false },
    ]);
  });

  it('marks the cleared boss stage and creates no drop without progress', () => {
    const generator = new FakeGenerator();
    const dropper = new StageEquipmentDropper(generator, undefined, () => 0.99);

    const boss = dropper.collect({ inventory: [], equippedBySlot: {} }, 10, 11, {
      normalMisses: 0,
      bossesSinceMythic: 0,
    });
    expect(boss.drops).toHaveLength(1);
    expect(generator.contexts[0]).toMatchObject({
      stage: 10,
      isBoss: true,
      minimumRarity: 'rare',
      mythicChance: 0,
    });
    expect(dropper.collect({ inventory: [], equippedBySlot: {} }, 11, 11, boss.pity).drops).toEqual(
      [],
    );
  });

  it('uses normal drop chance and guarantees the sixth attempt', () => {
    const generator = new FakeGenerator();
    const dropper = new StageEquipmentDropper(generator, undefined, () => 0.99);

    const missed = dropper.collect({ inventory: [], equippedBySlot: {} }, 1, 6, {
      normalMisses: 0,
      bossesSinceMythic: 0,
    });
    expect(missed.drops).toEqual([]);
    expect(missed.pity.normalMisses).toBe(5);

    const guaranteed = dropper.collect(missed.equipment, 6, 7, missed.pity);
    expect(guaranteed.drops).toHaveLength(1);
    expect(guaranteed.pity.normalMisses).toBe(0);
  });

  it('forces mythic on the one-hundredth boss pity', () => {
    const generator = new FakeGenerator();
    const dropper = new StageEquipmentDropper(generator, undefined, () => 0.99);

    const result = dropper.collect({ inventory: [], equippedBySlot: {} }, 100, 101, {
      normalMisses: 0,
      bossesSinceMythic: 99,
    });

    expect(result.drops[0].rarity).toBe('mythic');
    expect(result.pity.bossesSinceMythic).toBe(0);
  });
});

class FakeGenerator implements EquipmentDropGenerator {
  public readonly contexts: EquipmentDropContext[] = [];

  public generate(context: EquipmentDropContext): EquipmentSave {
    this.contexts.push(context);
    return {
      instanceId: `drop_${context.stage}`,
      templateId: 'equipment_ash_blade',
      rarity: context.mythicChance === 1 ? 'mythic' : (context.minimumRarity ?? 'common'),
      level: 1,
      enhanceLevel: 0,
      starLevel: 0,
      affixes: [],
      protected: false,
    };
  }
}
