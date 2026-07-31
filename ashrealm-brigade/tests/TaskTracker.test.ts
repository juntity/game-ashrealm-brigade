import { describe, expect, it } from 'vitest';
import { TaskTracker } from '../assets/scripts/modules/task/TaskTracker';
import { PlayerSave, TaskSave } from '../assets/scripts/save/SaveData';

const PLAYER: PlayerSave = { gold: 0, diamonds: 0, equipmentEssence: 0 };

describe('TaskTracker', () => {
  it('records matching daily and achievement progress with a target cap', () => {
    const tracker = new TaskTracker(emptyTasks('2026-07-31'), localTime(2026, 7, 31));

    expect(tracker.record('monster-kill', 120)).toBe(true);

    expect(tracker.getTasks('daily')[0]).toMatchObject({ progress: 10, completed: true });
    expect(tracker.getTasks('achievement')[1]).toMatchObject({ progress: 100, completed: true });
    expect(tracker.record('monster-kill', 1)).toBe(false);
  });

  it('claims a completed reward exactly once', () => {
    const tracker = new TaskTracker(emptyTasks('2026-07-31'), localTime(2026, 7, 31));
    tracker.record('hero-upgrade');

    const first = tracker.claim('daily_upgrade_1', PLAYER);
    const second = tracker.claim('daily_upgrade_1', first.player);

    expect(first).toMatchObject({ result: 'claimed', player: { gold: 50 } });
    expect(second).toMatchObject({ result: 'already-claimed', player: { gold: 50 } });
  });

  it('does not grant incomplete rewards', () => {
    const tracker = new TaskTracker(emptyTasks('2026-07-31'), localTime(2026, 7, 31));

    expect(tracker.claim('daily_clear_5', PLAYER)).toEqual({
      result: 'incomplete',
      player: PLAYER,
    });
  });

  it('resets daily state across days while preserving achievements', () => {
    const save = emptyTasks('2026-07-30');
    save.dailyProgress.daily_kill_10 = 8;
    save.dailyClaimed.daily_upgrade_1 = true;
    save.achievementProgress.achievement_kill_100 = 40;

    const tracker = new TaskTracker(save, localTime(2026, 7, 31));

    expect(tracker.toSave()).toMatchObject({
      dailyDateKey: '2026-07-31',
      dailyProgress: {},
      dailyClaimed: {},
      achievementProgress: { achievement_kill_100: 40 },
    });
  });
});

function emptyTasks(dailyDateKey: string): TaskSave {
  return {
    dailyDateKey,
    dailyProgress: {},
    dailyClaimed: {},
    achievementProgress: {},
    achievementClaimed: {},
  };
}

function localTime(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day, 12).getTime();
}
