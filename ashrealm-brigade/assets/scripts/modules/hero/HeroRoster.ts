import { HERO_CONFIG, HeroConfig, MAIN_HERO_ID } from '../../config/HeroConfig';
import { HeroSave } from '../../save/SaveData';
import { HeroCalculator } from './HeroCalculator';

export const MAX_SUPPORT_HEROES = 3;

export type DeploymentResult = 'changed' | 'locked' | 'main-required' | 'full' | 'not-found';

export class HeroRoster {
  private heroes: HeroSave[];
  private readonly configs = new Map(HERO_CONFIG.heroes.map((hero) => [hero.id, hero]));
  private readonly calculator = new HeroCalculator();

  public constructor(heroes: readonly HeroSave[]) {
    this.heroes = heroes.map((hero) => ({ ...hero }));
  }

  public synchronizeUnlocks(highestStage: number): boolean {
    let changed = false;
    this.heroes = this.heroes.map((hero) => {
      const config = this.configs.get(hero.heroId);
      const shouldUnlock = config !== undefined && config.unlock.stage <= highestStage;
      if (!hero.isUnlocked && shouldUnlock) {
        changed = true;
        return { ...hero, isUnlocked: true };
      }
      return hero;
    });
    return changed;
  }

  public setDeployed(heroId: string, deployed: boolean): DeploymentResult {
    const index = this.heroes.findIndex((hero) => hero.heroId === heroId);
    if (index < 0) {
      return 'not-found';
    }

    const hero = this.heroes[index];
    if (!hero.isUnlocked) {
      return 'locked';
    }
    if (heroId === MAIN_HERO_ID && !deployed) {
      return 'main-required';
    }
    if (hero.isDeployed === deployed) {
      return 'changed';
    }
    if (deployed && this.getDeployedSupportCount() >= MAX_SUPPORT_HEROES) {
      return 'full';
    }

    this.heroes[index] = { ...hero, isDeployed: deployed };
    return 'changed';
  }

  public autoDeployStrongestSupports(): boolean {
    const selectedIds = new Set(
      this.heroes
        .filter((hero) => hero.heroId !== MAIN_HERO_ID && hero.isUnlocked)
        .sort((left, right) => this.getHeroDps(right) - this.getHeroDps(left))
        .slice(0, MAX_SUPPORT_HEROES)
        .map((hero) => hero.heroId),
    );

    let changed = false;
    this.heroes = this.heroes.map((hero) => {
      const isDeployed = hero.heroId === MAIN_HERO_ID || selectedIds.has(hero.heroId);
      changed ||= hero.isDeployed !== isDeployed;
      return {
        ...hero,
        isDeployed,
      };
    });
    return changed;
  }

  public levelUp(heroId: string): boolean {
    const index = this.heroes.findIndex((hero) => hero.heroId === heroId);
    if (index < 0 || !this.heroes[index].isUnlocked) {
      return false;
    }
    this.heroes[index] = {
      ...this.heroes[index],
      level: this.heroes[index].level + 1,
    };
    return true;
  }

  public getTotalDps(): number {
    return this.heroes
      .filter((hero) => hero.isDeployed && hero.isUnlocked)
      .reduce((total, hero) => total + this.getHeroDps(hero), 0);
  }

  public getMainHero(): HeroSave {
    const mainHero = this.heroes.find((hero) => hero.heroId === MAIN_HERO_ID);
    if (mainHero === undefined) {
      throw new Error('Main hero is missing from the roster.');
    }
    return { ...mainHero };
  }

  public getHeroes(): readonly HeroSave[] {
    return this.heroes.map((hero) => ({ ...hero }));
  }

  public getDeployedSupportCount(): number {
    return this.heroes.filter((hero) => hero.heroId !== MAIN_HERO_ID && hero.isDeployed).length;
  }

  public getUnlockedCount(): number {
    return this.heroes.filter((hero) => hero.isUnlocked).length;
  }

  private getHeroDps(hero: HeroSave): number {
    const config = this.requireConfig(hero.heroId);
    return this.calculator.getAttack(hero.level, config) / config.attackIntervalSeconds;
  }

  private requireConfig(heroId: string): HeroConfig {
    const config = this.configs.get(heroId);
    if (config === undefined) {
      throw new Error(`Unknown hero config: ${heroId}.`);
    }
    return config;
  }
}
