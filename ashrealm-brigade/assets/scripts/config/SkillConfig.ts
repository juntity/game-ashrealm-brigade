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

export type PassiveEffectType =
  'attack-multiplier' | 'critical-rate' | 'gold-multiplier' | 'offline-multiplier';

export interface PassiveSkillConfig {
  readonly id: string;
  readonly name: string;
  readonly ownerHeroId: string;
  readonly effectType: PassiveEffectType;
  readonly value: number;
  readonly unlockLevel: number;
}

export interface SkillConfigTable {
  readonly schemaVersion: 1;
  readonly activeSkills: readonly ActiveSkillConfig[];
  readonly passiveSkills: readonly PassiveSkillConfig[];
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
  passiveSkills: [
    createPassiveSkill('passive_main_attack', '剑意', 'hero_main', 'attack-multiplier', 0.05, 5),
    createPassiveSkill(
      'passive_mage_attack',
      '魔力涌动',
      'hero_mage',
      'attack-multiplier',
      0.08,
      1,
    ),
    createPassiveSkill('passive_archer_crit', '鹰眼', 'hero_archer', 'critical-rate', 0.05, 1),
    createPassiveSkill('passive_priest_gold', '祝福', 'hero_priest', 'gold-multiplier', 0.1, 1),
    createPassiveSkill(
      'passive_assassin_crit',
      '弱点洞察',
      'hero_assassin',
      'critical-rate',
      0.08,
      1,
    ),
    createPassiveSkill(
      'passive_berserker_attack',
      '血性',
      'hero_berserker',
      'attack-multiplier',
      0.12,
      1,
    ),
    createPassiveSkill(
      'passive_elementalist_offline',
      '元素共鸣',
      'hero_elementalist',
      'offline-multiplier',
      0.15,
      1,
    ),
    createPassiveSkill('passive_paladin_gold', '圣契', 'hero_paladin', 'gold-multiplier', 0.15, 1),
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

function createPassiveSkill(
  id: string,
  name: string,
  ownerHeroId: string,
  effectType: PassiveEffectType,
  value: number,
  unlockLevel: number,
): PassiveSkillConfig {
  return { id, name, ownerHeroId, effectType, value, unlockLevel };
}
