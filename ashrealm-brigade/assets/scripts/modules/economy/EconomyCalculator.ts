import { GAME_BALANCE, GameBalanceConfig } from '../../config/GameBalanceConfig';
import {
  getStageConfig,
  isConfiguredStage,
  StageConfig,
} from '../../config/StageConfig';

export class EconomyCalculator {
  public constructor(private readonly config: Readonly<GameBalanceConfig> = GAME_BALANCE) {}

  public isBossStage(stage: number): boolean {
    return Math.max(1, Math.floor(stage)) % this.config.battle.bossInterval === 0;
  }

  public getStageConfig(stage: number): StageConfig | null {
    return getStageConfig(stage);
  }

  public getMonsterHp(stage: number, isBoss = this.isBossStage(stage)): number {
    if (!isBoss && isConfiguredStage(stage)) {
      const cfg = getStageConfig(stage);
      if (cfg) return cfg.monsterHp;
    }
    if (isBoss) {
      if (isConfiguredStage(stage)) {
        const cfg = getStageConfig(stage);
        if (cfg) return cfg.bossHp;
      }
      return this.config.battle.bossHp;
    }
    const normalizedStage = Math.max(1, Math.floor(stage));
    return Math.floor(
      this.config.battle.monsterBaseHp *
        Math.pow(this.config.battle.monsterHpGrowth, normalizedStage - 1),
    );
  }

  public getKillGold(stage: number, isBoss = this.isBossStage(stage)): number {
    if (!isBoss && isConfiguredStage(stage)) {
      const cfg = getStageConfig(stage);
      if (cfg) return cfg.monsterGold;
    }
    if (isBoss) {
      if (isConfiguredStage(stage)) {
        const cfg = getStageConfig(stage);
        if (cfg) return cfg.bossGold;
      }
      return this.config.economy.bossGold;
    }
    const normalizedStage = Math.max(1, Math.floor(stage));
    return (
      this.config.economy.monsterBaseGold +
      Math.floor(normalizedStage * this.config.economy.monsterStageGoldFactor)
    );
  }

  public getBossDurationSeconds(stage: number): number {
    if (isConfiguredStage(stage)) {
      const cfg = getStageConfig(stage);
      if (cfg) return cfg.bossDurationSeconds;
    }
    return this.config.battle.bossDurationSeconds;
  }

  public getOfflineGoldPerMinute(
    stage: number,
    totalDps: number,
    goldMultiplier = 1,
    offlineMultiplier = 1,
  ): number {
    const referenceStage = this.isBossStage(stage) ? Math.max(1, stage - 1) : stage;
    const monsterHp = this.getMonsterHp(referenceStage, false);
    const normalizedDps = Math.max(1, totalDps);
    const killSeconds = Math.max(this.config.economy.minimumKillSeconds, monsterHp / normalizedDps);
    const killGold = this.getKillGold(referenceStage, false) * Math.max(1, goldMultiplier);
    const activeGoldPerMinute = (killGold * 60) / killSeconds;

    return Math.max(
      1,
      Math.floor(
        activeGoldPerMinute *
          this.config.economy.offlineEfficiency *
          Math.max(1, offlineMultiplier),
      ),
    );
  }
}
