import { GAME_BALANCE } from '../../config/GameBalanceConfig';
import { EconomyCalculator } from '../economy/EconomyCalculator';
import { DamageCalculator } from './DamageCalculator';

export type BattleState = 'fighting' | 'failed' | 'chapter-complete';
export type EnemyKind = 'normal' | 'boss';

export interface BattleProgress {
  readonly stage: number;
  readonly gold: number;
  readonly heroLevel: number;
}

export interface BattleSnapshot {
  readonly stage: number;
  readonly state: BattleState;
  readonly isPaused: boolean;
  readonly enemyKind: EnemyKind;
  readonly monsterHp: number;
  readonly monsterMaxHp: number;
  readonly bossSecondsRemaining: number | null;
  readonly gold: number;
  readonly heroLevel: number;
  readonly heroDamage: number;
  readonly upgradeCost: number;
}

export class BattleModel {
  private readonly damageCalculator = new DamageCalculator();
  private readonly economyCalculator = new EconomyCalculator();
  private stage: number;
  private monsterMaxHp: number;
  private monsterHp: number;
  private gold: number;
  private heroLevel: number;
  private heroDamage: number;
  private autoAttackElapsed = 0;
  private state: BattleState = 'fighting';
  private isPaused = false;
  private enemyKind: EnemyKind;
  private bossSecondsRemaining: number | null;
  private progressRevision = 0;

  public constructor(progress?: Partial<BattleProgress>) {
    this.stage = this.toPositiveInteger(progress?.stage, 1);
    this.gold = this.toNonNegativeInteger(progress?.gold, 0);
    this.heroLevel = this.toPositiveInteger(progress?.heroLevel, 1);
    this.heroDamage = this.economyCalculator.getHeroDamage(this.heroLevel);
    this.enemyKind = this.economyCalculator.isBossStage(this.stage) ? 'boss' : 'normal';
    this.monsterMaxHp = this.economyCalculator.getMonsterHp(this.stage, this.enemyKind === 'boss');
    this.monsterHp = this.monsterMaxHp;
    this.bossSecondsRemaining =
      this.enemyKind === 'boss' ? GAME_BALANCE.battle.bossDurationSeconds : null;
  }

  public tick(deltaTime: number): void {
    if (this.state !== 'fighting' || this.isPaused) {
      return;
    }

    if (this.enemyKind === 'boss' && this.bossSecondsRemaining !== null) {
      this.bossSecondsRemaining = Math.max(0, this.bossSecondsRemaining - deltaTime);
      if (this.bossSecondsRemaining === 0) {
        this.state = 'failed';
        return;
      }
    }

    this.autoAttackElapsed += deltaTime;

    while (this.autoAttackElapsed >= GAME_BALANCE.battle.autoAttackIntervalSeconds) {
      this.autoAttackElapsed -= GAME_BALANCE.battle.autoAttackIntervalSeconds;
      this.damageMonster(this.heroDamage);
    }
  }

  public clickAttack(): void {
    if (this.state !== 'fighting' || this.isPaused) {
      return;
    }

    const result = this.damageCalculator.calculate({
      attack: this.heroDamage,
      multiplier: GAME_BALANCE.battle.clickDamageMultiplier,
    });
    this.damageMonster(result.amount);
  }

  public upgradeHero(): boolean {
    const cost = this.getUpgradeCost();
    if (this.gold < cost) {
      return false;
    }

    this.gold -= cost;
    this.heroLevel += 1;
    this.heroDamage = this.economyCalculator.getHeroDamage(this.heroLevel);
    this.markProgressChanged();
    return true;
  }

  public getSnapshot(): BattleSnapshot {
    return {
      stage: this.stage,
      state: this.state,
      isPaused: this.isPaused,
      enemyKind: this.enemyKind,
      monsterHp: this.monsterHp,
      monsterMaxHp: this.monsterMaxHp,
      bossSecondsRemaining: this.bossSecondsRemaining,
      gold: this.gold,
      heroLevel: this.heroLevel,
      heroDamage: this.heroDamage,
      upgradeCost: this.getUpgradeCost(),
    };
  }

  public retryBoss(): boolean {
    if (this.state !== 'failed' || this.enemyKind !== 'boss') {
      return false;
    }

    this.state = 'fighting';
    this.monsterHp = this.monsterMaxHp;
    this.bossSecondsRemaining = GAME_BALANCE.battle.bossDurationSeconds;
    this.autoAttackElapsed = 0;
    return true;
  }

  public pause(): boolean {
    if (this.state !== 'fighting' || this.isPaused) {
      return false;
    }

    this.isPaused = true;
    return true;
  }

  public resume(): boolean {
    if (!this.isPaused) {
      return false;
    }

    this.isPaused = false;
    return true;
  }

  public exportProgress(): BattleProgress {
    return {
      stage: this.stage,
      gold: this.gold,
      heroLevel: this.heroLevel,
    };
  }

  public grantGold(amount: number): boolean {
    const normalizedAmount = this.toNonNegativeInteger(amount, 0);
    if (normalizedAmount === 0) {
      return false;
    }

    this.gold += normalizedAmount;
    this.markProgressChanged();
    return true;
  }

  public getProgressRevision(): number {
    return this.progressRevision;
  }

  private damageMonster(damage: number): void {
    this.monsterHp = Math.max(0, this.monsterHp - damage);
    if (this.monsterHp > 0) {
      return;
    }

    if (this.enemyKind === 'boss') {
      this.gold += this.economyCalculator.getKillGold(this.stage, true);
      this.stage += 1;
      this.state = 'chapter-complete';
      this.bossSecondsRemaining = null;
      this.markProgressChanged();
      return;
    }

    this.gold += this.economyCalculator.getKillGold(this.stage, false);
    this.stage += 1;
    this.enemyKind = this.economyCalculator.isBossStage(this.stage) ? 'boss' : 'normal';
    this.monsterMaxHp = this.economyCalculator.getMonsterHp(this.stage, this.enemyKind === 'boss');
    this.monsterHp = this.monsterMaxHp;
    this.bossSecondsRemaining =
      this.enemyKind === 'boss' ? GAME_BALANCE.battle.bossDurationSeconds : null;
    this.markProgressChanged();
  }

  private getUpgradeCost(): number {
    return this.economyCalculator.getUpgradeCost(this.heroLevel);
  }

  private markProgressChanged(): void {
    this.progressRevision += 1;
  }

  private toPositiveInteger(value: number | undefined, fallback: number): number {
    return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  private toNonNegativeInteger(value: number | undefined, fallback: number): number {
    return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
  }
}
