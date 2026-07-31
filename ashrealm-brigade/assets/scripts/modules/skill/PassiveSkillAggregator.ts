import { SKILL_CONFIG } from '../../config/SkillConfig';
import { HeroSave } from '../../save/SaveData';

export interface PassiveBonuses {
  readonly attackMultiplier: number;
  readonly criticalRateBonus: number;
  readonly goldMultiplier: number;
  readonly offlineMultiplier: number;
  readonly activeCount: number;
}

export class PassiveSkillAggregator {
  public calculate(heroes: readonly HeroSave[]): PassiveBonuses {
    const heroById = new Map(heroes.map((hero) => [hero.heroId, hero]));
    let attackMultiplier = 1;
    let criticalRateBonus = 0;
    let goldMultiplier = 1;
    let offlineMultiplier = 1;
    let activeCount = 0;

    for (const passive of SKILL_CONFIG.passiveSkills) {
      const owner = heroById.get(passive.ownerHeroId);
      if (owner === undefined || !owner.isUnlocked || owner.level < passive.unlockLevel) {
        continue;
      }
      activeCount += 1;
      switch (passive.effectType) {
        case 'attack-multiplier':
          attackMultiplier += passive.value;
          break;
        case 'critical-rate':
          criticalRateBonus += passive.value;
          break;
        case 'gold-multiplier':
          goldMultiplier += passive.value;
          break;
        case 'offline-multiplier':
          offlineMultiplier += passive.value;
          break;
      }
    }

    return {
      attackMultiplier,
      criticalRateBonus,
      goldMultiplier,
      offlineMultiplier,
      activeCount,
    };
  }
}
