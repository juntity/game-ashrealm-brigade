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
      monsterHp: 420,
      bossSecondsRemaining: 30,
    });
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
      stage: 10,
      state: 'chapter-complete',
      enemyKind: 'boss',
    });
  });
});
