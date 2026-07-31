export type TaskCategory = 'daily' | 'achievement';
export type TaskEventType =
  'monster-kill' | 'stage-clear' | 'hero-upgrade' | 'equipment-enhance' | 'equipment-equip';
export type TaskRewardType = 'gold' | 'equipment-essence';

export interface TaskConfig {
  readonly id: string;
  readonly category: TaskCategory;
  readonly name: string;
  readonly eventType: TaskEventType;
  readonly target: number;
  readonly rewardType: TaskRewardType;
  readonly rewardAmount: number;
}

export const TASK_CONFIGS: readonly TaskConfig[] = [
  task('daily_kill_10', 'daily', '击败 10 只魔物', 'monster-kill', 10, 'gold', 100),
  task('daily_clear_5', 'daily', '通关 5 个关卡', 'stage-clear', 5, 'equipment-essence', 10),
  task('daily_upgrade_1', 'daily', '升级英雄 1 次', 'hero-upgrade', 1, 'gold', 50),
  task('daily_enhance_1', 'daily', '强化装备 1 次', 'equipment-enhance', 1, 'gold', 50),
  task('achievement_stage_10', 'achievement', '抵达第 10 关', 'stage-clear', 9, 'gold', 300),
  task(
    'achievement_kill_100',
    'achievement',
    '累计击败 100 只魔物',
    'monster-kill',
    100,
    'gold',
    500,
  ),
  task(
    'achievement_equip_7',
    'achievement',
    '累计穿戴装备 7 次',
    'equipment-equip',
    7,
    'equipment-essence',
    50,
  ),
];

function task(
  id: string,
  category: TaskCategory,
  name: string,
  eventType: TaskEventType,
  target: number,
  rewardType: TaskRewardType,
  rewardAmount: number,
): TaskConfig {
  return { id, category, name, eventType, target, rewardType, rewardAmount };
}
