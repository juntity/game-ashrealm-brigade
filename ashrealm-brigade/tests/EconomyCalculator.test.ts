import { describe, expect, it } from 'vitest';
import { EconomyCalculator } from '../assets/scripts/modules/economy/EconomyCalculator';

describe('EconomyCalculator', () => {
  const calculator = new EconomyCalculator();

  it('derives monster and reward values from the shared balance configuration', () => {
    expect(calculator.getMonsterHp(1)).toBe(30);
    expect(calculator.getMonsterHp(10)).toBe(600);
    expect(calculator.getKillGold(1)).toBe(6);
    expect(calculator.getKillGold(10)).toBe(100);
  });

  it('uses the previous normal stage when estimating boss-stage offline income', () => {
    expect(calculator.getOfflineGoldPerMinute(9, 11)).toBe(24);
    expect(calculator.getOfflineGoldPerMinute(10, 11)).toBe(24);
  });

  it('keeps level-one offline income below active income', () => {
    const offlineGoldPerMinute = calculator.getOfflineGoldPerMinute(1, 3);
    const activeGoldPerMinute = 36;

    expect(offlineGoldPerMinute).toBe(7);
    expect(offlineGoldPerMinute / activeGoldPerMinute).toBeCloseTo(0.194, 2);
  });

  it('applies gold and offline passive multipliers', () => {
    expect(calculator.getOfflineGoldPerMinute(1, 3, 1.1, 1.15)).toBe(9);
  });
});
