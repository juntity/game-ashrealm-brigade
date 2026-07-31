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
  private stage: number;
  private monsterMaxHp: number;
  private monsterHp: number;
  private gold: number;
  private heroLevel: number;
  private heroDamage: number;
  private autoAttackElapsed = 0;
  private state: BattleState = 'fighting';
  private enemyKind: EnemyKind;
  private bossSecondsRemaining: number | null;
  private progressRevision = 0;

  public constructor(progress?: Partial<BattleProgress>) {
    this.stage = this.toPositiveInteger(progress?.stage, 1);
    this.gold = this.toNonNegativeInteger(progress?.gold, 0);
    this.heroLevel = this.toPositiveInteger(progress?.heroLevel, 1);
    this.heroDamage = this.getHeroDamage(this.heroLevel);
    this.enemyKind = this.stage % 10 === 0 ? 'boss' : 'normal';
    this.monsterMaxHp = this.getMonsterMaxHp(this.stage, this.enemyKind);
    this.monsterHp = this.monsterMaxHp;
    this.bossSecondsRemaining = this.enemyKind === 'boss' ? 30 : null;
  }

  public tick(deltaTime: number): void {
    if (this.state !== 'fighting') {
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

    while (this.autoAttackElapsed >= 1) {
      this.autoAttackElapsed -= 1;
      this.damageMonster(this.heroDamage);
    }
  }

  public clickAttack(): void {
    if (this.state !== 'fighting') {
      return;
    }

    const result = this.damageCalculator.calculate({
      attack: this.heroDamage,
      multiplier: 0.75,
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
    this.heroDamage = this.getHeroDamage(this.heroLevel);
    this.markProgressChanged();
    return true;
  }

  public getSnapshot(): BattleSnapshot {
    return {
      stage: this.stage,
      state: this.state,
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
    this.bossSecondsRemaining = 30;
    this.autoAttackElapsed = 0;
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
      this.gold += 100;
      this.stage += 1;
      this.state = 'chapter-complete';
      this.bossSecondsRemaining = null;
      this.markProgressChanged();
      return;
    }

    this.gold += 5 + Math.floor(this.stage * 1.5);
    this.stage += 1;
    this.enemyKind = this.stage % 10 === 0 ? 'boss' : 'normal';
    this.monsterMaxHp = this.getMonsterMaxHp(this.stage, this.enemyKind);
    this.monsterHp = this.monsterMaxHp;
    this.bossSecondsRemaining = this.enemyKind === 'boss' ? 30 : null;
    this.markProgressChanged();
  }

  private getUpgradeCost(): number {
    return Math.floor(10 * Math.pow(1.35, this.heroLevel - 1));
  }

  private getHeroDamage(level: number): number {
    return 3 + (level - 1) * 2;
  }

  private getMonsterMaxHp(stage: number, enemyKind: EnemyKind): number {
    return enemyKind === 'boss' ? 600 : Math.floor(30 * Math.pow(1.16, stage - 1));
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
