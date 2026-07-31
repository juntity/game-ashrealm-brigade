import { HeroConfig, MAIN_HERO_CONFIG } from '../../config/HeroConfig';

export class HeroCalculator {
  public getAttack(level: number, hero: HeroConfig = MAIN_HERO_CONFIG): number {
    const normalizedLevel = Math.max(1, Math.floor(level));
    return hero.baseAttack + (normalizedLevel - 1) * hero.attackPerLevel;
  }

  public getUpgradeCost(level: number, hero: HeroConfig = MAIN_HERO_CONFIG): number {
    const normalizedLevel = Math.max(1, Math.floor(level));
    return Math.floor(hero.upgradeBaseCost * Math.pow(hero.upgradeCostGrowth, normalizedLevel - 1));
  }
}
