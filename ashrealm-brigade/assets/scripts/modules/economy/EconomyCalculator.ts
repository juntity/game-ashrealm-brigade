import { GAME_BALANCE, GameBalanceConfig } from '../../config/GameBalanceConfig';

export class EconomyCalculator {
  public constructor(private readonly config: Readonly<GameBalanceConfig> = GAME_BALANCE) {}

  public isBossStage(stage: number): boolean {
    return Math.max(1, Math.floor(stage)) % this.config.battle.bossInterval === 0;
  }

  public getMonsterHp(stage: number, isBoss = this.isBossStage(stage)): number {
    const normalizedStage = Math.max(1, Math.floor(stage));
    if (isBoss) {
      return this.config.battle.bossHp;
    }
    return Math.floor(
      this.config.battle.monsterBaseHp *
        Math.pow(this.config.battle.monsterHpGrowth, normalizedStage - 1),
    );
  }

  public getKillGold(stage: number, isBoss = this.isBossStage(stage)): number {
    const normalizedStage = Math.max(1, Math.floor(stage));
    if (isBoss) {
      return this.config.economy.bossGold;
    }
    return (
      this.config.economy.monsterBaseGold +
      Math.floor(normalizedStage * this.config.economy.monsterStageGoldFactor)
    );
  }

  public getOfflineGoldPerMinute(stage: number, totalDps: number): number {
    const referenceStage = this.isBossStage(stage) ? Math.max(1, stage - 1) : stage;
    const monsterHp = this.getMonsterHp(referenceStage, false);
    const normalizedDps = Math.max(1, totalDps);
    const killSeconds = Math.max(this.config.economy.minimumKillSeconds, monsterHp / normalizedDps);
    const activeGoldPerMinute = (this.getKillGold(referenceStage, false) * 60) / killSeconds;

    return Math.max(1, Math.floor(activeGoldPerMinute * this.config.economy.offlineEfficiency));
  }
}
