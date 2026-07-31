export interface GameBalanceConfig {
  readonly battle: {
    readonly autoAttackIntervalSeconds: number;
    readonly maxAttackSpeedBonus: number;
    readonly clickDamageMultiplier: number;
    readonly monsterBaseHp: number;
    readonly monsterHpGrowth: number;
    readonly bossInterval: number;
    readonly bossHp: number;
    readonly bossDurationSeconds: number;
  };
  readonly economy: {
    readonly monsterBaseGold: number;
    readonly monsterStageGoldFactor: number;
    readonly bossGold: number;
    readonly offlineEfficiency: number;
    readonly offlineMinimumMinutes: number;
    readonly offlineMaxHours: number;
    readonly minimumKillSeconds: number;
  };
}

export const GAME_BALANCE: Readonly<GameBalanceConfig> = Object.freeze({
  battle: {
    autoAttackIntervalSeconds: 1,
    maxAttackSpeedBonus: 2,
    clickDamageMultiplier: 0.75,
    monsterBaseHp: 30,
    monsterHpGrowth: 1.16,
    bossInterval: 10,
    bossHp: 600,
    bossDurationSeconds: 30,
  },
  economy: {
    monsterBaseGold: 5,
    monsterStageGoldFactor: 1.5,
    bossGold: 100,
    offlineEfficiency: 0.2,
    offlineMinimumMinutes: 1,
    offlineMaxHours: 12,
    minimumKillSeconds: 1,
  },
});
