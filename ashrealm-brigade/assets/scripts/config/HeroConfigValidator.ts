import { HeroConfigTable } from './HeroConfig';

export class HeroConfigValidator {
  public validate(table: HeroConfigTable): readonly string[] {
    const errors: string[] = [];
    const ids = new Set<string>();
    let mainHeroCount = 0;

    if (table.schemaVersion !== 1) {
      errors.push('Hero config schemaVersion must be 1.');
    }
    if (table.heroes.length !== 8) {
      errors.push('Hero config must contain exactly 8 heroes.');
    }

    for (const hero of table.heroes) {
      if (!/^hero_[a-z0-9_]+$/.test(hero.id)) {
        errors.push(`Invalid hero id: ${hero.id}.`);
      } else if (ids.has(hero.id)) {
        errors.push(`Duplicate hero id: ${hero.id}.`);
      }
      ids.add(hero.id);

      if (hero.name.trim().length === 0) {
        errors.push(`Hero ${hero.id} must have a name.`);
      }
      if (hero.isMain) {
        mainHeroCount += 1;
        if (hero.unlock.type !== 'default' || hero.unlock.stage !== 1) {
          errors.push(`Main hero ${hero.id} must be unlocked by default at stage 1.`);
        }
      } else if (hero.unlock.type !== 'stage' || !this.isPositiveInteger(hero.unlock.stage)) {
        errors.push(`Hero ${hero.id} must have a positive stage unlock.`);
      }

      this.requirePositive(errors, hero.id, 'baseAttack', hero.baseAttack);
      this.requirePositive(errors, hero.id, 'attackPerLevel', hero.attackPerLevel);
      this.requirePositive(errors, hero.id, 'attackIntervalSeconds', hero.attackIntervalSeconds);
      this.requirePositive(errors, hero.id, 'criticalDamage', hero.criticalDamage);
      this.requirePositive(errors, hero.id, 'attackRange', hero.attackRange);
      this.requirePositive(errors, hero.id, 'upgradeBaseCost', hero.upgradeBaseCost);
      this.requirePositive(errors, hero.id, 'upgradeCostGrowth', hero.upgradeCostGrowth);
      if (hero.criticalRate < 0 || hero.criticalRate > 1) {
        errors.push(`Hero ${hero.id} criticalRate must be between 0 and 1.`);
      }
      this.requireUniqueSkillIds(errors, hero.id, [
        ...hero.activeSkillIds,
        ...hero.passiveSkillIds,
      ]);
    }

    if (mainHeroCount !== 1) {
      errors.push('Hero config must contain exactly one main hero.');
    }
    return errors;
  }

  private requirePositive(errors: string[], heroId: string, field: string, value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      errors.push(`Hero ${heroId} ${field} must be positive.`);
    }
  }

  private requireUniqueSkillIds(
    errors: string[],
    heroId: string,
    skillIds: readonly string[],
  ): void {
    if (new Set(skillIds).size !== skillIds.length) {
      errors.push(`Hero ${heroId} contains duplicate skill ids.`);
    }
  }

  private isPositiveInteger(value: number): boolean {
    return Number.isInteger(value) && value > 0;
  }
}
