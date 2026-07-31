export interface OfflineRewardInput {
  readonly lastActiveAt: number;
  readonly now: number;
  readonly goldPerMinute: number;
  readonly maxOfflineSeconds?: number;
}

export interface OfflineReward {
  readonly elapsedSeconds: number;
  readonly rewardedSeconds: number;
  readonly gold: number;
}

const DEFAULT_MAX_OFFLINE_SECONDS = 12 * 60 * 60;

export class OfflineRewardCalculator {
  public calculate(input: OfflineRewardInput): OfflineReward {
    const elapsedSeconds = Math.max(0, Math.floor((input.now - input.lastActiveAt) / 1_000));
    const maxOfflineSeconds = Math.max(0, input.maxOfflineSeconds ?? DEFAULT_MAX_OFFLINE_SECONDS);
    const rewardedSeconds = Math.min(elapsedSeconds, maxOfflineSeconds);
    const goldPerMinute = Math.max(0, input.goldPerMinute);

    return {
      elapsedSeconds,
      rewardedSeconds,
      gold: Math.floor((rewardedSeconds * goldPerMinute) / 60),
    };
  }
}
