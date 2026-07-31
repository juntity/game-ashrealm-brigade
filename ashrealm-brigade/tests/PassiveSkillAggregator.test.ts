import { describe, expect, it } from 'vitest';
import { PassiveSkillAggregator } from '../assets/scripts/modules/skill/PassiveSkillAggregator';
import { createDefaultSaveData } from '../assets/scripts/save/SaveData';

describe('PassiveSkillAggregator', () => {
  const aggregator = new PassiveSkillAggregator();

  it('activates passives only for unlocked heroes at the required level', () => {
    const heroes = createDefaultSaveData(0).heroes;
    expect(aggregator.calculate(heroes)).toEqual({
      attackMultiplier: 1,
      criticalRateBonus: 0,
      goldMultiplier: 1,
      offlineMultiplier: 1,
      activeCount: 0,
    });

    const leveled = heroes.map((hero) =>
      hero.heroId === 'hero_main' ? { ...hero, level: 5 } : hero,
    );
    expect(aggregator.calculate(leveled)).toMatchObject({
      attackMultiplier: 1.05,
      activeCount: 1,
    });
  });

  it('stacks attack, critical, gold and offline bonuses from unlocked heroes', () => {
    const heroes = createDefaultSaveData(0).heroes.map((hero) => ({
      ...hero,
      level: Math.max(hero.level, 5),
      isUnlocked: true,
    }));

    expect(aggregator.calculate(heroes)).toEqual({
      attackMultiplier: 1.25,
      criticalRateBonus: 0.13,
      goldMultiplier: 1.25,
      offlineMultiplier: 1.15,
      activeCount: 8,
    });
  });
});
