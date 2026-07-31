import { describe, expect, it } from 'vitest';
import { HeroManagementService } from '../assets/scripts/modules/hero/HeroManagementService';
import { createDefaultSaveData } from '../assets/scripts/save/SaveData';

describe('HeroManagementService', () => {
  it('upgrades an unlocked hero and atomically spends gold', () => {
    const save = createDefaultSaveData(0);
    const service = new HeroManagementService({ ...save.player, gold: 100 }, save.heroes);

    expect(service.getUpgradeCost('hero_main')).toBe(10);
    expect(service.upgrade('hero_main')).toBe('upgraded');
    expect(service.getPlayer().gold).toBe(90);
    expect(service.getHeroes()[0].level).toBe(2);
  });

  it('does not partially mutate locked or unaffordable heroes', () => {
    const save = createDefaultSaveData(0);
    const service = new HeroManagementService(save.player, save.heroes);

    expect(service.upgrade('hero_mage')).toBe('locked');
    expect(service.upgrade('hero_main')).toBe('insufficient-gold');
    expect(service.getHeroes()[0].level).toBe(1);
    expect(service.getPlayer().gold).toBe(0);
  });
});
