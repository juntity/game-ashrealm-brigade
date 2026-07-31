import { HERO_CONFIG } from './HeroConfig';
import { MAX_ACTIVE_SKILL_SLOTS, SkillConfigTable } from './SkillConfig';

export class SkillConfigValidator {
  public validate(table: SkillConfigTable): readonly string[] {
    const errors: string[] = [];
    const ids = new Set<string>();
    const heroIds = new Set(HERO_CONFIG.heroes.map((hero) => hero.id));

    if (table.schemaVersion !== 1) {
      errors.push('Skill config schemaVersion must be 1.');
    }
    if (table.activeSkills.length !== MAX_ACTIVE_SKILL_SLOTS) {
      errors.push(`MVP skill config must contain exactly ${MAX_ACTIVE_SKILL_SLOTS} active skills.`);
    }
    if (table.passiveSkills.length !== HERO_CONFIG.heroes.length) {
      errors.push('MVP skill config must contain exactly one passive per hero.');
    }

    for (const skill of table.activeSkills) {
      if (!/^skill_[a-z0-9_]+$/.test(skill.id)) {
        errors.push(`Invalid skill id: ${skill.id}.`);
      } else if (ids.has(skill.id)) {
        errors.push(`Duplicate skill id: ${skill.id}.`);
      }
      ids.add(skill.id);

      if (!heroIds.has(skill.ownerHeroId)) {
        errors.push(`Skill ${skill.id} references unknown hero ${skill.ownerHeroId}.`);
      } else {
        const owner = HERO_CONFIG.heroes.find((hero) => hero.id === skill.ownerHeroId);
        if (!owner?.activeSkillIds.includes(skill.id)) {
          errors.push(`Skill ${skill.id} is missing from owner ${skill.ownerHeroId}.`);
        }
      }
      if (!Number.isFinite(skill.damageMultiplier) || skill.damageMultiplier <= 0) {
        errors.push(`Skill ${skill.id} damageMultiplier must be positive.`);
      }
      if (!Number.isFinite(skill.cooldownSeconds) || skill.cooldownSeconds <= 0) {
        errors.push(`Skill ${skill.id} cooldownSeconds must be positive.`);
      }
      if (!Number.isInteger(skill.unlockStage) || skill.unlockStage <= 0) {
        errors.push(`Skill ${skill.id} unlockStage must be a positive integer.`);
      }
    }
    for (const passive of table.passiveSkills) {
      if (!/^passive_[a-z0-9_]+$/.test(passive.id)) {
        errors.push(`Invalid passive skill id: ${passive.id}.`);
      } else if (ids.has(passive.id)) {
        errors.push(`Duplicate skill id: ${passive.id}.`);
      }
      ids.add(passive.id);

      const owner = HERO_CONFIG.heroes.find((hero) => hero.id === passive.ownerHeroId);
      if (owner === undefined) {
        errors.push(`Passive ${passive.id} references unknown hero ${passive.ownerHeroId}.`);
      } else if (!owner.passiveSkillIds.includes(passive.id)) {
        errors.push(`Passive ${passive.id} is missing from owner ${passive.ownerHeroId}.`);
      }
      if (!Number.isFinite(passive.value) || passive.value <= 0) {
        errors.push(`Passive ${passive.id} value must be positive.`);
      }
      if (!Number.isInteger(passive.unlockLevel) || passive.unlockLevel <= 0) {
        errors.push(`Passive ${passive.id} unlockLevel must be a positive integer.`);
      }
    }
    return errors;
  }
}
