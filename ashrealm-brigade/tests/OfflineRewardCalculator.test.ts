import { describe, expect, it } from 'vitest';
import { OfflineRewardCalculator } from '../assets/scripts/modules/offline/OfflineRewardCalculator';

describe('OfflineRewardCalculator', () => {
  it('calculates gold from complete offline minutes', () => {
    const calculator = new OfflineRewardCalculator();

    expect(
      calculator.calculate({
        lastActiveAt: 1_000,
        now: 61_000,
        goldPerMinute: 10,
      }),
    ).toEqual({
      elapsedSeconds: 60,
      rewardedSeconds: 60,
      gold: 10,
    });
  });

  it('grants nothing before the minimum offline duration', () => {
    const calculator = new OfflineRewardCalculator();

    expect(
      calculator.calculate({
        lastActiveAt: 1_000,
        now: 60_999,
        goldPerMinute: 25,
      }),
    ).toEqual({
      elapsedSeconds: 59,
      rewardedSeconds: 0,
      gold: 0,
    });
  });

  it('ignores incomplete minutes after reaching the minimum duration', () => {
    const calculator = new OfflineRewardCalculator();

    expect(
      calculator.calculate({
        lastActiveAt: 1_000,
        now: 120_999,
        goldPerMinute: 25,
      }),
    ).toEqual({
      elapsedSeconds: 119,
      rewardedSeconds: 60,
      gold: 25,
    });
  });

  it('caps rewards at twelve hours by default', () => {
    const calculator = new OfflineRewardCalculator();

    expect(
      calculator.calculate({
        lastActiveAt: 0,
        now: 13 * 60 * 60 * 1_000,
        goldPerMinute: 10,
      }),
    ).toEqual({
      elapsedSeconds: 46_800,
      rewardedSeconds: 43_200,
      gold: 7_200,
    });
  });

  it('grants nothing when the system clock moves backwards', () => {
    const calculator = new OfflineRewardCalculator();

    expect(
      calculator.calculate({
        lastActiveAt: 10_000,
        now: 5_000,
        goldPerMinute: 10,
      }),
    ).toEqual({
      elapsedSeconds: 0,
      rewardedSeconds: 0,
      gold: 0,
    });
  });
});
