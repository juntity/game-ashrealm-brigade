import { describe, expect, it } from 'vitest';
import { BattleModel } from '../assets/scripts/modules/battle/BattleModel';
import { SKILL_CONFIG } from '../assets/scripts/config/SkillConfig';

function clickUntilStage(model: BattleModel, targetStage: number): void {
  for (let index = 0; index < 20_000; index += 1) {
    if (model.getSnapshot().stage >= targetStage) {
      return;
    }
    model.clickAttack();
  }
  throw new Error(`Unable to reach stage ${targetStage}.`);
}

describe('BattleModel', () => {
  it('applies automatic and click damage', () => {
    const model = new BattleModel();

    model.tick(1);
    expect(model.getSnapshot().monsterHp).toBe(27);

    model.clickAttack();
    expect(model.getSnapshot().monsterHp).toBe(25);
  });

  it('stops automatic and click attacks while paused, then resumes', () => {
    const model = new BattleModel();

    expect(model.pause()).toBe(true);
    expect(model.pause()).toBe(false);
    model.tick(10);
    model.clickAttack();
    expect(model.getSnapshot()).toMatchObject({
      isPaused: true,
      monsterHp: 30,
    });

    expect(model.resume()).toBe(true);
    expect(model.resume()).toBe(false);
    model.tick(1);
    expect(model.getSnapshot()).toMatchObject({
      isPaused: false,
      monsterHp: 27,
    });
  });

  it('rewards a kill and advances the stage', () => {
    const model = new BattleModel();
    clickUntilStage(model, 2);

    expect(model.getSnapshot()).toMatchObject({
      stage: 2,
      gold: 6,
      state: 'fighting',
      enemyKind: 'normal',
    });
  });

  it('starts a timed boss fight at stage ten and can fail it', () => {
    const model = new BattleModel();
    clickUntilStage(model, 10);

    expect(model.getSnapshot()).toMatchObject({
      stage: 10,
      enemyKind: 'boss',
      bossSecondsRemaining: 30,
    });

    model.tick(31);
    expect(model.getSnapshot().state).toBe('failed');
    expect(model.retryBoss()).toBe(true);
    expect(model.getSnapshot()).toMatchObject({
      state: 'fighting',
      monsterHp: 600,
      bossSecondsRemaining: 30,
    });
  });

  it('counts down visibly and stops dealing damage after the boss timer expires', () => {
    const model = new BattleModel();
    clickUntilStage(model, 10);

    model.tick(29);
    expect(model.getSnapshot()).toMatchObject({
      state: 'fighting',
      bossSecondsRemaining: 1,
    });

    model.tick(1);
    const failedSnapshot = model.getSnapshot();
    expect(failedSnapshot.state).toBe('failed');
    expect(failedSnapshot.bossSecondsRemaining).toBe(0);

    model.tick(10);
    model.clickAttack();
    expect(model.getSnapshot().monsterHp).toBe(failedSnapshot.monsterHp);
  });

  it('preserves the boss timer while paused', () => {
    const model = new BattleModel({ stage: 10 });

    model.tick(5);
    expect(model.getSnapshot().bossSecondsRemaining).toBe(25);
    model.pause();
    model.tick(60);
    expect(model.getSnapshot()).toMatchObject({
      isPaused: true,
      state: 'fighting',
      bossSecondsRemaining: 25,
    });

    model.resume();
    model.tick(1);
    expect(model.getSnapshot().bossSecondsRemaining).toBe(24);
  });

  it('automatically starts the next normal stage after defeating the boss', () => {
    const model = new BattleModel();
    clickUntilStage(model, 10);

    for (let index = 0; index < 1_000; index += 1) {
      model.clickAttack();
      if (model.getSnapshot().stage === 11) {
        break;
      }
    }

    expect(model.getSnapshot()).toMatchObject({
      stage: 11,
      state: 'fighting',
      enemyKind: 'normal',
      monsterHp: 132,
      monsterMaxHp: 132,
      bossSecondsRemaining: null,
    });
    expect(model.exportProgress().stage).toBe(11);
  });

  it('restores persisted stage, gold and hero level', () => {
    const model = new BattleModel({
      stage: 10,
      gold: 88,
      heroLevel: 4,
    });

    expect(model.getSnapshot()).toMatchObject({
      stage: 10,
      gold: 88,
      heroLevel: 4,
      heroDamage: 9.72,
      enemyKind: 'boss',
      monsterHp: 600,
      bossSecondsRemaining: 30,
    });
    expect(model.exportProgress()).toMatchObject({
      stage: 10,
      highestStage: 10,
      gold: 88,
      heroLevel: 4,
    });
  });

  it('increments the progress revision only for persistent changes', () => {
    const model = new BattleModel();

    model.clickAttack();
    expect(model.getProgressRevision()).toBe(0);

    clickUntilStage(model, 2);
    expect(model.getProgressRevision()).toBe(1);
  });

  it('grants only positive integer offline gold', () => {
    const model = new BattleModel({ gold: 5 });

    expect(model.grantGold(12)).toBe(true);
    expect(model.exportProgress().gold).toBe(17);
    expect(model.grantGold(-3)).toBe(false);
    expect(model.exportProgress().gold).toBe(17);
  });

  it('unlocks support heroes and aggregates deployed team DPS', () => {
    const model = new BattleModel({ stage: 10, highestStage: 10 });

    expect(model.getSnapshot()).toMatchObject({
      unlockedHeroCount: 2,
      deployedSupportCount: 0,
      activePassiveCount: 1,
    });
    expect(model.getSnapshot().totalDps).toBeGreaterThan(3);
    expect(model.autoDeployStrongestSupports()).toBe(true);
    expect(model.getSnapshot()).toMatchObject({
      unlockedHeroCount: 2,
      deployedSupportCount: 1,
    });
    expect(model.getSnapshot().totalDps).toBeGreaterThan(3);
  });

  it('casts an unlocked skill, applies damage and enforces cooldown', () => {
    const model = new BattleModel({
      equippedSkillIds: SKILL_CONFIG.activeSkills.map((skill) => skill.id),
    });

    expect(model.castSkill(0)).toBe('cast');
    expect(model.getSnapshot().monsterHp).toBe(21);
    expect(model.castSkill(0)).toBe('cooldown');
    model.pause();
    expect(model.castSkill(0)).toBe('locked');
    expect(model.getSnapshot().monsterHp).toBe(21);
  });

  it('freezes skill cooldown while battle is paused', () => {
    const model = new BattleModel({
      equippedSkillIds: SKILL_CONFIG.activeSkills.map((skill) => skill.id),
    });

    model.castSkill(0);
    model.tick(2);
    expect(model.getSnapshot().skillSlots[0].cooldownRemaining).toBe(6);
    model.pause();
    model.tick(20);
    expect(model.getSnapshot().skillSlots[0].cooldownRemaining).toBe(6);
    model.resume();
    model.tick(1);
    expect(model.getSnapshot().skillSlots[0].cooldownRemaining).toBe(5);
  });
});
