import { describe, expect, it } from 'vitest';
import { EconomyCalculator } from '../assets/scripts/modules/economy/EconomyCalculator';

describe('EconomyCalculator', () => {
  const calculator = new EconomyCalculator();

  it('derives combat values from the shared balance configuration', () => {
    expect(calculator.getHeroDamage(1)).toBe(3);
    expect(calculator.getHeroDamage(4)).toBe(9);
    expect(calculator.getUpgradeCost(1)).toBe(10);
    expect(calculator.getMonsterHp(1)).toBe(30);
    expect(calculator.getMonsterHp(10)).toBe(600);
    expect(calculator.getKillGold(1)).toBe(6);
    expect(calculator.getKillGold(10)).toBe(100);
  });

  it('uses the previous normal stage when estimating boss-stage offline income', () => {
    expect(calculator.getOfflineGoldPerMinute(9, 5)).toBe(24);
    expect(calculator.getOfflineGoldPerMinute(10, 5)).toBe(24);
  });

  it('keeps level-one offline income below active income', () => {
    const offlineGoldPerMinute = calculator.getOfflineGoldPerMinute(1, 1);
    const activeGoldPerMinute = 36;

    expect(offlineGoldPerMinute).toBe(7);
    expect(offlineGoldPerMinute / activeGoldPerMinute).toBeCloseTo(0.194, 2);
  });
});
