import { describe, expect, it } from 'vitest';
import { createDefaultSaveData } from '../assets/scripts/save/SaveData';
import { HeroRoster, MAX_SUPPORT_HEROES } from '../assets/scripts/modules/hero/HeroRoster';

describe('HeroRoster', () => {
  it('unlocks heroes idempotently from the highest reached stage', () => {
    const roster = new HeroRoster(createDefaultSaveData(0).heroes);

    expect(roster.synchronizeUnlocks(30)).toBe(true);
    expect(roster.synchronizeUnlocks(30)).toBe(false);
    expect(
      roster
        .getHeroes()
        .filter((hero) => hero.isUnlocked)
        .map((hero) => hero.heroId),
    ).toEqual(['hero_main', 'hero_mage', 'hero_archer', 'hero_priest']);
  });

  it('keeps the main hero deployed and limits support heroes to three', () => {
    const heroes = createDefaultSaveData(0).heroes.map((hero) => ({
      ...hero,
      isUnlocked: true,
    }));
    const roster = new HeroRoster(heroes);

    expect(roster.setDeployed('hero_main', false)).toBe('main-required');
    expect(roster.setDeployed('hero_mage', true)).toBe('changed');
    expect(roster.setDeployed('hero_archer', true)).toBe('changed');
    expect(roster.setDeployed('hero_priest', true)).toBe('changed');
    expect(roster.setDeployed('hero_assassin', true)).toBe('full');
    expect(roster.getDeployedSupportCount()).toBe(MAX_SUPPORT_HEROES);
  });

  it('auto deploys the strongest unlocked supports and aggregates their DPS', () => {
    const heroes = createDefaultSaveData(0).heroes.map((hero) => ({
      ...hero,
      isUnlocked: true,
    }));
    const roster = new HeroRoster(heroes);

    expect(roster.getTotalDps()).toBe(3);
    roster.autoDeployStrongestSupports();

    expect(roster.getDeployedSupportCount()).toBe(3);
    expect(roster.getTotalDps()).toBeGreaterThan(3);
  });
});
