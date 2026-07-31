export type SkillTargetType = 'single-enemy';
export type SkillEffectType = 'damage';

export interface ActiveSkillConfig {
  readonly id: string;
  readonly name: string;
  readonly ownerHeroId: string;
  readonly targetType: SkillTargetType;
  readonly effectType: SkillEffectType;
  readonly damageMultiplier: number;
  readonly cooldownSeconds: number;
  readonly unlockStage: number;
}

export interface SkillConfigTable {
  readonly schemaVersion: 1;
  readonly activeSkills: readonly ActiveSkillConfig[];
}

export const MAX_ACTIVE_SKILL_SLOTS = 4;

export const SKILL_CONFIG: Readonly<SkillConfigTable> = {
  schemaVersion: 1,
  activeSkills: [
    createDamageSkill('skill_ember_slash', '烬火斩', 'hero_main', 3, 8, 1),
    createDamageSkill('skill_meteor', '陨星术', 'hero_mage', 5, 15, 10),
    createDamageSkill('skill_arrow_rain', '箭雨', 'hero_archer', 3.5, 12, 20),
    createDamageSkill('skill_holy_judgment', '圣光裁决', 'hero_paladin', 7, 24, 70),
  ],
};

function createDamageSkill(
  id: string,
  name: string,
  ownerHeroId: string,
  damageMultiplier: number,
  cooldownSeconds: number,
  unlockStage: number,
): ActiveSkillConfig {
  return {
    id,
    name,
    ownerHeroId,
    targetType: 'single-enemy',
    effectType: 'damage',
    damageMultiplier,
    cooldownSeconds,
    unlockStage,
  };
}
