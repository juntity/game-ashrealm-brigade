import { GAME_BALANCE } from '../../config/GameBalanceConfig';
import { EconomyCalculator } from '../economy/EconomyCalculator';
import { HeroCalculator } from '../hero/HeroCalculator';
import { HeroRoster } from '../hero/HeroRoster';
import { ActiveSkillBar, SkillCastStatus, SkillSlotSnapshot } from '../skill/ActiveSkillBar';
import { DamageCalculator } from './DamageCalculator';
import { createDefaultSaveData, HeroSave } from '../../save/SaveData';
import { EquipmentCollectionSave } from '../../save/SaveData';
import { EquipmentInventory, EquipmentStats } from '../equip/EquipmentInventory';
import { EquipmentCombatCalculator } from '../equip/EquipmentCombatCalculator';

export type BattleState = 'fighting' | 'failed';
export type EnemyKind = 'normal' | 'boss';

export interface BattleProgress {
  readonly stage: number;
  readonly highestStage: number;
  readonly gold: number;
  readonly heroLevel: number;
  readonly heroes: readonly HeroSave[];
  readonly equippedSkillIds: readonly string[];
  readonly equipment: EquipmentCollectionSave;
}

export interface BattleSnapshot {
  readonly stage: number;
  readonly highestStage: number;
  readonly state: BattleState;
  readonly isPaused: boolean;
  readonly enemyKind: EnemyKind;
  readonly monsterHp: number;
  readonly monsterMaxHp: number;
  readonly bossSecondsRemaining: number | null;
  readonly gold: number;
  readonly heroLevel: number;
  readonly heroDamage: number;
  readonly totalDps: number;
  readonly unlockedHeroCount: number;
  readonly deployedSupportCount: number;
  readonly activePassiveCount: number;
  readonly skillSlots: readonly SkillSlotSnapshot[];
  readonly upgradeCost: number;
}

export class BattleModel {
  private readonly damageCalculator = new DamageCalculator();
  private readonly economyCalculator = new EconomyCalculator();
  private readonly heroCalculator = new HeroCalculator();
  private heroRoster: HeroRoster;
  private readonly skillBar: ActiveSkillBar;
  private readonly equipmentCombatCalculator = new EquipmentCombatCalculator();
  private equipment: EquipmentCollectionSave;
  private equipmentStats: EquipmentStats;
  private stage: number;
  private highestStage: number;
  private monsterMaxHp: number;
  private monsterHp: number;
  private gold: number;
  private heroLevel: number;
  private heroDamage: number;
  private totalDps: number;
  private autoAttackDamage = 0;
  private autoAttackIntervalSeconds = GAME_BALANCE.battle.autoAttackIntervalSeconds;
  private autoAttackElapsed = 0;
  private state: BattleState = 'fighting';
  private isPaused = false;
  private enemyKind: EnemyKind;
  private bossSecondsRemaining: number | null;
  private progressRevision = 0;

  public constructor(progress?: Partial<BattleProgress>) {
    this.stage = this.toPositiveInteger(progress?.stage, 1);
    this.highestStage = Math.max(
      this.stage,
      this.toPositiveInteger(progress?.highestStage, this.stage),
    );
    this.gold = this.toNonNegativeInteger(progress?.gold, 0);
    const initialHeroes = (progress?.heroes ?? createDefaultSaveData(0).heroes).map((hero) => ({
      ...hero,
    }));
    if (progress?.heroes === undefined && progress?.heroLevel !== undefined) {
      initialHeroes[0] = {
        ...initialHeroes[0],
        level: this.toPositiveInteger(progress.heroLevel, 1),
      };
    }
    this.heroRoster = new HeroRoster(initialHeroes);
    this.skillBar = new ActiveSkillBar(progress?.equippedSkillIds ?? []);
    this.equipment = cloneEquipmentCollection(
      progress?.equipment ?? createDefaultSaveData(0).equipment,
    );
    this.equipmentStats = new EquipmentInventory(this.equipment).getEquippedStats();
    this.heroRoster.synchronizeUnlocks(this.highestStage);
    this.heroLevel = this.heroRoster.getMainHero().level;
    this.heroDamage = 0;
    this.totalDps = 0;
    this.enemyKind = this.economyCalculator.isBossStage(this.stage) ? 'boss' : 'normal';
    this.refreshHeroStats();
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

    this.skillBar.tick(deltaTime);

    this.autoAttackElapsed += deltaTime;

    while (this.autoAttackElapsed >= this.autoAttackIntervalSeconds) {
      this.autoAttackElapsed -= this.autoAttackIntervalSeconds;
      this.damageMonster(Math.max(1, Math.floor(this.autoAttackDamage)));
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
    this.heroRoster.levelUp('hero_main');
    this.heroLevel = this.heroRoster.getMainHero().level;
    this.refreshHeroStats();
    this.markProgressChanged();
    return true;
  }

  public getSnapshot(): BattleSnapshot {
    return {
      stage: this.stage,
      highestStage: this.highestStage,
      state: this.state,
      isPaused: this.isPaused,
      enemyKind: this.enemyKind,
      monsterHp: this.monsterHp,
      monsterMaxHp: this.monsterMaxHp,
      bossSecondsRemaining: this.bossSecondsRemaining,
      gold: this.gold,
      heroLevel: this.heroLevel,
      heroDamage: this.heroDamage,
      totalDps: this.totalDps,
      unlockedHeroCount: this.heroRoster.getUnlockedCount(),
      deployedSupportCount: this.heroRoster.getDeployedSupportCount(),
      activePassiveCount: this.heroRoster.getPassiveBonuses().activeCount,
      skillSlots: this.skillBar.getSnapshot(this.highestStage),
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
      highestStage: this.highestStage,
      gold: this.gold,
      heroLevel: this.heroLevel,
      heroes: this.heroRoster.getHeroes(),
      equippedSkillIds: this.skillBar.getEquippedSkillIds(),
      equipment: cloneEquipmentCollection(this.equipment),
    };
  }

  public autoDeployStrongestSupports(): boolean {
    if (!this.heroRoster.autoDeployStrongestSupports()) {
      return false;
    }
    this.refreshHeroStats();
    this.markProgressChanged();
    return true;
  }

  public castSkill(slotIndex: number): SkillCastStatus {
    if (this.state !== 'fighting' || this.isPaused) {
      return 'locked';
    }
    const result = this.skillBar.cast(slotIndex, this.highestStage);
    if (result.status !== 'cast' || result.skill === null) {
      return result.status;
    }

    const damage = Math.max(1, Math.floor(this.totalDps * result.skill.damageMultiplier));
    this.damageMonster(damage);
    return 'cast';
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

  public synchronizeGold(gold: number): void {
    this.gold = this.toNonNegativeInteger(gold, this.gold);
  }

  public synchronizeEquipment(equipment: EquipmentCollectionSave): void {
    this.equipment = cloneEquipmentCollection(equipment);
    this.equipmentStats = new EquipmentInventory(this.equipment).getEquippedStats();
    this.refreshHeroStats();
  }

  public synchronizeHeroes(heroes: readonly HeroSave[]): void {
    this.heroRoster = new HeroRoster(heroes);
    this.heroRoster.synchronizeUnlocks(this.highestStage);
    this.heroLevel = this.heroRoster.getMainHero().level;
    this.refreshHeroStats();
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
      this.gold += this.getKillGold(true);
      this.stage += 1;
      this.reachStage(this.stage);
      this.spawnCurrentEnemy();
      this.markProgressChanged();
      return;
    }

    this.gold += this.getKillGold(false);
    this.stage += 1;
    this.reachStage(this.stage);
    this.spawnCurrentEnemy();
    this.markProgressChanged();
  }

  private spawnCurrentEnemy(): void {
    this.enemyKind = this.economyCalculator.isBossStage(this.stage) ? 'boss' : 'normal';
    this.refreshHeroStats();
    this.monsterMaxHp = this.economyCalculator.getMonsterHp(this.stage, this.enemyKind === 'boss');
    this.monsterHp = this.monsterMaxHp;
    this.bossSecondsRemaining =
      this.enemyKind === 'boss' ? GAME_BALANCE.battle.bossDurationSeconds : null;
  }

  private getUpgradeCost(): number {
    return this.heroCalculator.getUpgradeCost(this.heroLevel);
  }

  private reachStage(stage: number): void {
    this.highestStage = Math.max(this.highestStage, stage);
    this.heroRoster.synchronizeUnlocks(this.highestStage);
    this.refreshHeroStats();
  }

  private refreshHeroStats(): void {
    const result = this.equipmentCombatCalculator.calculate(
      this.heroRoster.getMainAttack(),
      this.heroRoster.getTotalDps(),
      this.equipmentStats,
      this.enemyKind === 'boss',
      GAME_BALANCE.battle.autoAttackIntervalSeconds,
      GAME_BALANCE.battle.maxAttackSpeedBonus,
    );
    this.heroDamage = result.mainAttack;
    this.totalDps = result.totalDps;
    this.autoAttackDamage = result.autoAttackDamage;
    this.autoAttackIntervalSeconds = result.autoAttackIntervalSeconds;
  }

  private getKillGold(isBoss: boolean): number {
    const baseGold = this.economyCalculator.getKillGold(this.stage, isBoss);
    return Math.floor(
      baseGold *
        this.heroRoster.getPassiveBonuses().goldMultiplier *
        (1 + this.equipmentStats['gold-multiplier']),
    );
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

function cloneEquipmentCollection(equipment: EquipmentCollectionSave): EquipmentCollectionSave {
  return {
    inventory: equipment.inventory.map((item) => ({
      ...item,
      affixes: item.affixes.map((affix) => ({ ...affix })),
    })),
    equippedBySlot: { ...equipment.equippedBySlot },
  };
}
