import { TASK_CONFIGS, TaskCategory, TaskConfig, TaskEventType } from '../../config/TaskConfig';
import { PlayerSave, TaskSave } from '../../save/SaveData';

export type TaskClaimResult = 'claimed' | 'not-found' | 'incomplete' | 'already-claimed';

export interface TaskView {
  readonly config: TaskConfig;
  readonly progress: number;
  readonly completed: boolean;
  readonly claimed: boolean;
}

export interface TaskClaimOutcome {
  readonly result: TaskClaimResult;
  readonly player: PlayerSave;
}

export class TaskTracker {
  private save: TaskSave;

  public constructor(save: TaskSave, now: number) {
    const today = getLocalDateKey(now);
    this.save =
      save.dailyDateKey === today
        ? cloneTaskSave(save)
        : {
            ...cloneTaskSave(save),
            dailyDateKey: today,
            dailyProgress: {},
            dailyClaimed: {},
          };
  }

  public record(eventType: TaskEventType, amount = 1): boolean {
    const normalizedAmount = Math.max(0, Math.floor(amount));
    if (normalizedAmount === 0) {
      return false;
    }
    let changed = false;
    for (const config of TASK_CONFIGS.filter((task) => task.eventType === eventType)) {
      const progress = this.getProgressRecord(config.category);
      const previous = progress[config.id] ?? 0;
      const next = Math.min(config.target, previous + normalizedAmount);
      if (next !== previous) {
        progress[config.id] = next;
        changed = true;
      }
    }
    return changed;
  }

  public claim(taskId: string, player: PlayerSave): TaskClaimOutcome {
    const config = TASK_CONFIGS.find((task) => task.id === taskId);
    if (config === undefined) {
      return { result: 'not-found', player: { ...player } };
    }
    const progress = this.getProgressRecord(config.category)[config.id] ?? 0;
    const claimed = this.getClaimedRecord(config.category);
    if (claimed[config.id]) {
      return { result: 'already-claimed', player: { ...player } };
    }
    if (progress < config.target) {
      return { result: 'incomplete', player: { ...player } };
    }
    claimed[config.id] = true;
    return {
      result: 'claimed',
      player: {
        ...player,
        gold: player.gold + (config.rewardType === 'gold' ? config.rewardAmount : 0),
        equipmentEssence:
          player.equipmentEssence +
          (config.rewardType === 'equipment-essence' ? config.rewardAmount : 0),
      },
    };
  }

  public getTasks(category: TaskCategory): readonly TaskView[] {
    const progress = this.getProgressRecord(category);
    const claimed = this.getClaimedRecord(category);
    return TASK_CONFIGS.filter((task) => task.category === category).map((config) => ({
      config,
      progress: progress[config.id] ?? 0,
      completed: (progress[config.id] ?? 0) >= config.target,
      claimed: claimed[config.id] ?? false,
    }));
  }

  public toSave(): TaskSave {
    return cloneTaskSave(this.save);
  }

  private getProgressRecord(category: TaskCategory): Record<string, number> {
    return category === 'daily' ? this.save.dailyProgress : this.save.achievementProgress;
  }

  private getClaimedRecord(category: TaskCategory): Record<string, boolean> {
    return category === 'daily' ? this.save.dailyClaimed : this.save.achievementClaimed;
  }
}

export function getLocalDateKey(now: number): string {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function cloneTaskSave(save: TaskSave): TaskSave {
  return {
    dailyDateKey: save.dailyDateKey,
    dailyProgress: { ...save.dailyProgress },
    dailyClaimed: { ...save.dailyClaimed },
    achievementProgress: { ...save.achievementProgress },
    achievementClaimed: { ...save.achievementClaimed },
  };
}
