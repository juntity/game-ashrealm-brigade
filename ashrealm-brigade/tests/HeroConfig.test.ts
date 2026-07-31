import { describe, expect, it } from 'vitest';
import {
  HERO_CONFIG,
  HeroConfigTable,
  MAIN_HERO_CONFIG,
} from '../assets/scripts/config/HeroConfig';
import { HeroConfigValidator } from '../assets/scripts/config/HeroConfigValidator';
import { HeroCalculator } from '../assets/scripts/modules/hero/HeroCalculator';

describe('hero configuration', () => {
  const validator = new HeroConfigValidator();

  it('contains eight valid heroes with one permanent main hero', () => {
    expect(validator.validate(HERO_CONFIG)).toEqual([]);
    expect(HERO_CONFIG.heroes).toHaveLength(8);
    expect(HERO_CONFIG.heroes.filter((hero) => hero.isMain)).toEqual([MAIN_HERO_CONFIG]);
  });

  it('uses unique ids and stage-based unlocks after the main hero', () => {
    expect(new Set(HERO_CONFIG.heroes.map((hero) => hero.id)).size).toBe(8);
    expect(HERO_CONFIG.heroes.map((hero) => hero.unlock.stage)).toEqual([
      1, 10, 20, 30, 40, 50, 60, 70,
    ]);
  });

  it('rejects duplicate ids and invalid combat values', () => {
    const invalid: HeroConfigTable = {
      ...HERO_CONFIG,
      heroes: [
        ...HERO_CONFIG.heroes.slice(0, 7),
        {
          ...HERO_CONFIG.heroes[7],
          id: HERO_CONFIG.heroes[0].id,
          criticalRate: 2,
        },
      ],
    };

    expect(validator.validate(invalid)).toEqual(
      expect.arrayContaining([
        `Duplicate hero id: ${MAIN_HERO_CONFIG.id}.`,
        `Hero ${MAIN_HERO_CONFIG.id} criticalRate must be between 0 and 1.`,
      ]),
    );
  });
});

describe('HeroCalculator', () => {
  const calculator = new HeroCalculator();

  it('preserves the current main hero attack and upgrade curve', () => {
    expect(calculator.getAttack(1)).toBe(3);
    expect(calculator.getAttack(4)).toBe(9);
    expect(calculator.getUpgradeCost(1)).toBe(10);
  });

  it('calculates another hero from its own configuration', () => {
    const mage = HERO_CONFIG.heroes[1];
    expect(calculator.getAttack(3, mage)).toBe(11);
    expect(calculator.getMaxHp(3, mage)).toBe(95);
  });
});
