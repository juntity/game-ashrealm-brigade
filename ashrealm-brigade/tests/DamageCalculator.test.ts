import { describe, expect, it } from 'vitest';
import { DamageCalculator } from '../assets/scripts/modules/battle/DamageCalculator';

describe('DamageCalculator', () => {
  it('calculates normal damage and floors once at the end', () => {
    const calculator = new DamageCalculator(() => 0.9);

    expect(
      calculator.calculate({
        attack: 11,
        multiplier: 1.25,
        bonusMultiplier: 1.1,
      }),
    ).toEqual({ amount: 15, isCritical: false });
  });

  it('uses the injected random source for deterministic critical hits', () => {
    const calculator = new DamageCalculator(() => 0.1);

    expect(
      calculator.calculate({
        attack: 10,
        criticalChance: 0.2,
        criticalDamage: 1.5,
      }),
    ).toEqual({ amount: 15, isCritical: true });
  });

  it('always returns at least one damage', () => {
    const calculator = new DamageCalculator(() => 0.9);
    expect(calculator.calculate({ attack: 0 }).amount).toBe(1);
  });
});
