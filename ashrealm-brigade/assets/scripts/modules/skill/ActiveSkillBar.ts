import { ActiveSkillConfig, MAX_ACTIVE_SKILL_SLOTS, SKILL_CONFIG } from '../../config/SkillConfig';

export type SkillCastStatus = 'cast' | 'empty' | 'locked' | 'cooldown';

export interface SkillSlotSnapshot {
  readonly skillId: string | null;
  readonly name: string;
  readonly isUnlocked: boolean;
  readonly cooldownRemaining: number;
  readonly unlockStage: number | null;
}

export interface SkillCastResult {
  readonly status: SkillCastStatus;
  readonly skill: ActiveSkillConfig | null;
}

export class ActiveSkillBar {
  private readonly configs = new Map(SKILL_CONFIG.activeSkills.map((skill) => [skill.id, skill]));
  private readonly equippedSkillIds: (string | null)[];
  private readonly cooldowns = new Map<string, number>();

  public constructor(equippedSkillIds: readonly string[]) {
    this.equippedSkillIds = Array.from({ length: MAX_ACTIVE_SKILL_SLOTS }, (_, index) => {
      const skillId = equippedSkillIds[index];
      return skillId !== undefined && this.configs.has(skillId) ? skillId : null;
    });
  }

  public tick(deltaTime: number): void {
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }
    for (const [skillId, remaining] of this.cooldowns) {
      this.cooldowns.set(skillId, Math.max(0, remaining - deltaTime));
    }
  }

  public cast(slotIndex: number, highestStage: number): SkillCastResult {
    const skill = this.getSkillAt(slotIndex);
    if (skill === null) {
      return { status: 'empty', skill: null };
    }
    if (highestStage < skill.unlockStage) {
      return { status: 'locked', skill };
    }
    if ((this.cooldowns.get(skill.id) ?? 0) > 0) {
      return { status: 'cooldown', skill };
    }

    this.cooldowns.set(skill.id, skill.cooldownSeconds);
    return { status: 'cast', skill };
  }

  public getSnapshot(highestStage: number): readonly SkillSlotSnapshot[] {
    return this.equippedSkillIds.map((skillId) => {
      const skill = skillId === null ? null : (this.configs.get(skillId) ?? null);
      return {
        skillId,
        name: skill?.name ?? '空槽位',
        isUnlocked: skill !== null && highestStage >= skill.unlockStage,
        cooldownRemaining: skill === null ? 0 : (this.cooldowns.get(skill.id) ?? 0),
        unlockStage: skill?.unlockStage ?? null,
      };
    });
  }

  public getEquippedSkillIds(): readonly string[] {
    return this.equippedSkillIds.filter((skillId): skillId is string => skillId !== null);
  }

  private getSkillAt(slotIndex: number): ActiveSkillConfig | null {
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= MAX_ACTIVE_SKILL_SLOTS) {
      return null;
    }
    const skillId = this.equippedSkillIds[slotIndex];
    return skillId === null ? null : (this.configs.get(skillId) ?? null);
  }
}
