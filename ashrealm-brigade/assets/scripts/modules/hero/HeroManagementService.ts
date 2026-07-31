import { HERO_CONFIG } from '../../config/HeroConfig';
import { HeroSave, PlayerSave } from '../../save/SaveData';
import { HeroCalculator } from './HeroCalculator';
import { DeploymentResult, HeroRoster } from './HeroRoster';

export type HeroUpgradeResult = 'upgraded' | 'not-found' | 'locked' | 'insufficient-gold';

export class HeroManagementService {
  private player: PlayerSave;
  private roster: HeroRoster;
  private readonly calculator = new HeroCalculator();

  public constructor(player: PlayerSave, heroes: readonly HeroSave[]) {
    this.player = { ...player };
    this.roster = new HeroRoster(heroes);
  }

  public getUpgradeCost(heroId: string): number | null {
    const hero = this.roster.getHeroes().find((entry) => entry.heroId === heroId);
    const config = HERO_CONFIG.heroes.find((entry) => entry.id === heroId);
    return hero === undefined || config === undefined
      ? null
      : this.calculator.getUpgradeCost(hero.level, config);
  }

  public upgrade(heroId: string): HeroUpgradeResult {
    const hero = this.roster.getHeroes().find((entry) => entry.heroId === heroId);
    if (hero === undefined) {
      return 'not-found';
    }
    if (!hero.isUnlocked) {
      return 'locked';
    }
    const cost = this.getUpgradeCost(heroId) ?? 0;
    if (this.player.gold < cost) {
      return 'insufficient-gold';
    }
    this.player = { ...this.player, gold: this.player.gold - cost };
    this.roster.levelUp(heroId);
    return 'upgraded';
  }

  public setDeployed(heroId: string, deployed: boolean): DeploymentResult {
    return this.roster.setDeployed(heroId, deployed);
  }

  public autoDeploy(): boolean {
    return this.roster.autoDeployStrongestSupports();
  }

  public getPlayer(): PlayerSave {
    return { ...this.player };
  }

  public getHeroes(): readonly HeroSave[] {
    return this.roster.getHeroes();
  }
}
