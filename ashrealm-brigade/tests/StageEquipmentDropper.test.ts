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
    const dropper = new StageEquipmentDropper(generator);

    const result = dropper.collect({ inventory: [], equippedBySlot: {} }, 3, 6);

    expect(result.drops.map((item) => item.instanceId)).toEqual(['drop_3', 'drop_4', 'drop_5']);
    expect(result.equipment.inventory).toHaveLength(3);
    expect(generator.contexts).toEqual([
      { stage: 3, isBoss: false },
      { stage: 4, isBoss: false },
      { stage: 5, isBoss: false },
    ]);
  });

  it('marks the cleared boss stage and creates no drop without progress', () => {
    const generator = new FakeGenerator();
    const dropper = new StageEquipmentDropper(generator);

    expect(dropper.collect({ inventory: [], equippedBySlot: {} }, 10, 11).drops).toHaveLength(1);
    expect(generator.contexts[0]).toEqual({ stage: 10, isBoss: true });
    expect(dropper.collect({ inventory: [], equippedBySlot: {} }, 11, 11).drops).toEqual([]);
  });
});

class FakeGenerator implements EquipmentDropGenerator {
  public readonly contexts: EquipmentDropContext[] = [];

  public generate(context: EquipmentDropContext): EquipmentSave {
    this.contexts.push(context);
    return {
      instanceId: `drop_${context.stage}`,
      templateId: 'equipment_ash_blade',
      rarity: 'common',
      level: 1,
      enhanceLevel: 0,
      starLevel: 0,
      affixes: [],
      protected: false,
    };
  }
}
