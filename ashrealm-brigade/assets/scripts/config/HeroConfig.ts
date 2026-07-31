export type HeroRole =
  | 'swordsman'
  | 'mage'
  | 'archer'
  | 'priest'
  | 'assassin'
  | 'berserker'
  | 'elementalist'
  | 'paladin';

export type HeroDamageType = 'physical' | 'magical' | 'holy';

export interface HeroUnlockConfig {
  readonly type: 'default' | 'stage';
  readonly stage: number;
}

export interface HeroConfig {
  readonly id: string;
  readonly name: string;
  readonly role: HeroRole;
  readonly damageType: HeroDamageType;
  readonly isMain: boolean;
  readonly baseAttack: number;
  readonly attackPerLevel: number;
  readonly baseHp: number;
  readonly hpPerLevel: number;
  readonly attackIntervalSeconds: number;
  readonly criticalRate: number;
  readonly criticalDamage: number;
  readonly attackRange: number;
  readonly upgradeBaseCost: number;
  readonly upgradeCostGrowth: number;
  readonly unlock: HeroUnlockConfig;
  readonly activeSkillIds: readonly string[];
  readonly passiveSkillIds: readonly string[];
}

export interface HeroConfigTable {
  readonly schemaVersion: 1;
  readonly heroes: readonly HeroConfig[];
}

export const MAIN_HERO_ID = 'hero_main';

export const HERO_CONFIG: Readonly<HeroConfigTable> = {
  schemaVersion: 1,
  heroes: [
    createHero('hero_main', '剑士', 'swordsman', 'physical', true, 3, 2, 120, 18, 1, 0.05, 1),
    createHero('hero_mage', '法师', 'mage', 'magical', false, 5, 3, 75, 10, 1.4, 0.05, 10),
    createHero('hero_archer', '弓箭手', 'archer', 'physical', false, 3, 2, 85, 11, 0.75, 0.08, 20),
    createHero('hero_priest', '牧师', 'priest', 'holy', false, 2, 1, 95, 14, 1.2, 0.03, 30),
    createHero(
      'hero_assassin',
      '刺客',
      'assassin',
      'physical',
      false,
      4,
      2,
      80,
      10,
      0.65,
      0.15,
      40,
    ),
    createHero(
      'hero_berserker',
      '狂战士',
      'berserker',
      'physical',
      false,
      6,
      4,
      145,
      22,
      1.6,
      0.08,
      50,
    ),
    createHero(
      'hero_elementalist',
      '元素使',
      'elementalist',
      'magical',
      false,
      7,
      4,
      70,
      9,
      1.5,
      0.06,
      60,
    ),
    createHero('hero_paladin', '圣骑士', 'paladin', 'holy', false, 5, 3, 180, 26, 1.3, 0.05, 70),
  ],
};

export const MAIN_HERO_CONFIG = HERO_CONFIG.heroes[0];

function createHero(
  id: string,
  name: string,
  role: HeroRole,
  damageType: HeroDamageType,
  isMain: boolean,
  baseAttack: number,
  attackPerLevel: number,
  baseHp: number,
  hpPerLevel: number,
  attackIntervalSeconds: number,
  criticalRate: number,
  unlockStage: number,
): HeroConfig {
  return {
    id,
    name,
    role,
    damageType,
    isMain,
    baseAttack,
    attackPerLevel,
    baseHp,
    hpPerLevel,
    attackIntervalSeconds,
    criticalRate,
    criticalDamage: 1.5,
    attackRange: role === 'swordsman' || role === 'assassin' || role === 'berserker' ? 90 : 360,
    upgradeBaseCost: isMain ? 10 : 20 + unlockStage * 2,
    upgradeCostGrowth: 1.35,
    unlock: {
      type: isMain ? 'default' : 'stage',
      stage: unlockStage,
    },
    activeSkillIds: [],
    passiveSkillIds: [],
  };
}
