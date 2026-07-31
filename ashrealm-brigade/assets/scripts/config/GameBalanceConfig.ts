export interface GameBalanceConfig {
  readonly battle: {
    readonly autoAttackIntervalSeconds: number;
    readonly clickDamageMultiplier: number;
    readonly monsterBaseHp: number;
    readonly monsterHpGrowth: number;
    readonly bossInterval: number;
    readonly bossHp: number;
    readonly bossDurationSeconds: number;
  };
  readonly hero: {
    readonly baseDamage: number;
    readonly damagePerLevel: number;
    readonly upgradeBaseCost: number;
    readonly upgradeCostGrowth: number;
  };
  readonly economy: {
    readonly monsterBaseGold: number;
    readonly monsterStageGoldFactor: number;
    readonly bossGold: number;
    readonly offlineEfficiency: number;
    readonly offlineMaxHours: number;
    readonly minimumKillSeconds: number;
  };
}

export const GAME_BALANCE: Readonly<GameBalanceConfig> = Object.freeze({
  battle: {
    autoAttackIntervalSeconds: 1,
    clickDamageMultiplier: 0.75,
    monsterBaseHp: 30,
    monsterHpGrowth: 1.16,
    bossInterval: 10,
    bossHp: 600,
    bossDurationSeconds: 30,
  },
  hero: {
    baseDamage: 3,
    damagePerLevel: 2,
    upgradeBaseCost: 10,
    upgradeCostGrowth: 1.35,
  },
  economy: {
    monsterBaseGold: 5,
    monsterStageGoldFactor: 1.5,
    bossGold: 100,
    offlineEfficiency: 0.35,
    offlineMaxHours: 12,
    minimumKillSeconds: 1,
  },
});
