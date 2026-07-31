import { describe, expect, it } from 'vitest';
import { BattleModel } from '../assets/scripts/modules/battle/BattleModel';

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

  it('marks the chapter complete after defeating the boss', () => {
    const model = new BattleModel();
    clickUntilStage(model, 10);

    for (let index = 0; index < 1_000; index += 1) {
      model.clickAttack();
      if (model.getSnapshot().state === 'chapter-complete') {
        break;
      }
    }

    expect(model.getSnapshot()).toMatchObject({
      stage: 11,
      state: 'chapter-complete',
      enemyKind: 'boss',
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
      heroDamage: 9,
      enemyKind: 'boss',
      monsterHp: 600,
      bossSecondsRemaining: 30,
    });
    expect(model.exportProgress()).toEqual({
      stage: 10,
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
});
