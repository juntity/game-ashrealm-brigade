import { describe, expect, it } from 'vitest';
import { EquipmentCombatCalculator } from '../assets/scripts/modules/equip/EquipmentCombatCalculator';
import { EquipmentStats } from '../assets/scripts/modules/equip/EquipmentInventory';

describe('EquipmentCombatCalculator', () => {
  it('increases attack and dps from offensive equipment stats', () => {
    const result = new EquipmentCombatCalculator().calculate(
      10,
      12,
      stats({
        'attack-flat': 5,
        'attack-multiplier': 0.2,
        'attack-speed': 0.1,
        'critical-rate': 0.05,
        'critical-damage': 0.2,
      }),
      false,
      1,
      2,
    );

    expect(result.mainAttack).toBe(18);
    expect(result.totalDps).toBeGreaterThan(22);
  });

  it('applies boss damage only while fighting a boss', () => {
    const calculator = new EquipmentCombatCalculator();
    const equipmentStats = stats({ 'boss-damage': 0.25 });

    expect(calculator.calculate(10, 20, equipmentStats, false, 1, 2).totalDps).toBe(20);
    expect(calculator.calculate(10, 20, equipmentStats, true, 1, 2).totalDps).toBe(25);
  });

  it('reduces the real attack interval without increasing damage per hit', () => {
    const calculator = new EquipmentCombatCalculator();
    const normal = calculator.calculate(10, 20, stats({}), false, 1, 2);
    const fast = calculator.calculate(10, 20, stats({ 'attack-speed': 0.5 }), false, 1, 2);

    expect(fast.autoAttackDamage).toBe(normal.autoAttackDamage);
    expect(fast.autoAttackIntervalSeconds).toBeCloseTo(2 / 3);
    expect(fast.totalDps).toBeCloseTo(normal.totalDps * 1.5);
  });
});

function stats(overrides: Partial<EquipmentStats>): EquipmentStats {
  return {
    'attack-flat': 0,
    'attack-multiplier': 0,
    'critical-rate': 0,
    'critical-damage': 0,
    'attack-speed': 0,
    'boss-damage': 0,
    'gold-multiplier': 0,
    'offline-multiplier': 0,
    ...overrides,
  };
}
