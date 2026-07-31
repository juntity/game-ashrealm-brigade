import { EquipmentCollectionSave, EquipmentSave } from '../../save/SaveData';
import { EconomyCalculator } from '../economy/EconomyCalculator';
import { EquipmentDropContext, EquipmentGenerator } from './EquipmentGenerator';
import { EquipmentInventory } from './EquipmentInventory';

export interface EquipmentDropGenerator {
  generate(context: EquipmentDropContext): EquipmentSave;
}

export interface StageDropResult {
  readonly equipment: EquipmentCollectionSave;
  readonly drops: readonly EquipmentSave[];
}

export class StageEquipmentDropper {
  public constructor(
    private readonly generator: EquipmentDropGenerator = new EquipmentGenerator(),
    private readonly economy: EconomyCalculator = new EconomyCalculator(),
  ) {}

  public collect(
    equipment: EquipmentCollectionSave,
    previousStage: number,
    currentStage: number,
  ): StageDropResult {
    const inventory = new EquipmentInventory(equipment);
    const drops: EquipmentSave[] = [];
    for (let clearedStage = previousStage; clearedStage < currentStage; clearedStage += 1) {
      const drop = this.generator.generate({
        stage: clearedStage,
        isBoss: this.economy.isBossStage(clearedStage),
      });
      if (inventory.add(drop)) {
        drops.push(drop);
      }
    }
    return { equipment: inventory.toSave(), drops };
  }
}
