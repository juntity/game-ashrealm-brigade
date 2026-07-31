export type EquipmentSlot =
  'weapon' | 'helmet' | 'armor' | 'bracer' | 'boots' | 'necklace' | 'ring';

export type EquipmentRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type EquipmentStatType =
  | 'attack-flat'
  | 'attack-multiplier'
  | 'critical-rate'
  | 'critical-damage'
  | 'attack-speed'
  | 'boss-damage'
  | 'gold-multiplier'
  | 'offline-multiplier';

export type StatValueKind = 'flat' | 'percent';

export interface RarityConfig {
  readonly id: EquipmentRarity;
  readonly name: string;
  readonly rank: number;
  readonly statMultiplier: number;
  readonly minAffixes: number;
  readonly maxAffixes: number;
  readonly autoProtect: boolean;
}

export interface AffixConfig {
  readonly id: string;
  readonly name: string;
  readonly statType: EquipmentStatType;
  readonly valueKind: StatValueKind;
  readonly minValue: number;
  readonly maxValue: number;
  readonly allowedSlots: readonly EquipmentSlot[];
}

export interface EquipmentTemplateConfig {
  readonly id: string;
  readonly name: string;
  readonly slot: EquipmentSlot;
  readonly mainStatType: EquipmentStatType;
  readonly mainStatValueKind: StatValueKind;
  readonly baseMainStat: number;
  readonly mainStatPerLevel: number;
  readonly affixIds: readonly string[];
}

export interface EquipmentConfigTable {
  readonly schemaVersion: 1;
  readonly rarities: readonly RarityConfig[];
  readonly affixes: readonly AffixConfig[];
  readonly templates: readonly EquipmentTemplateConfig[];
}

export const EQUIPMENT_SLOT_MAIN_STATS: Readonly<Record<EquipmentSlot, EquipmentStatType>> = {
  weapon: 'attack-flat',
  helmet: 'critical-damage',
  armor: 'attack-multiplier',
  bracer: 'critical-rate',
  boots: 'attack-speed',
  necklace: 'boss-damage',
  ring: 'gold-multiplier',
};

const ALL_SLOTS: readonly EquipmentSlot[] = [
  'weapon',
  'helmet',
  'armor',
  'bracer',
  'boots',
  'necklace',
  'ring',
];

const AFFIX_IDS_BY_SLOT: Readonly<Record<EquipmentSlot, readonly string[]>> = {
  weapon: ['affix_attack_flat', 'affix_attack_percent', 'affix_attack_speed', 'affix_boss_damage'],
  helmet: ['affix_attack_flat', 'affix_critical_rate', 'affix_critical_damage'],
  armor: ['affix_attack_flat', 'affix_attack_percent', 'affix_offline'],
  bracer: [
    'affix_attack_flat',
    'affix_critical_rate',
    'affix_critical_damage',
    'affix_attack_speed',
  ],
  boots: ['affix_attack_flat', 'affix_attack_speed', 'affix_gold', 'affix_offline'],
  necklace: [
    'affix_attack_flat',
    'affix_attack_percent',
    'affix_critical_rate',
    'affix_critical_damage',
    'affix_boss_damage',
    'affix_gold',
  ],
  ring: [
    'affix_attack_flat',
    'affix_attack_percent',
    'affix_critical_rate',
    'affix_boss_damage',
    'affix_gold',
    'affix_offline',
  ],
};

export const EQUIPMENT_CONFIG: Readonly<EquipmentConfigTable> = {
  schemaVersion: 1,
  rarities: [
    rarity('common', '普通', 1, 1, 0, 1, false),
    rarity('uncommon', '优秀', 2, 1.15, 0, 1, false),
    rarity('rare', '稀有', 3, 1.35, 1, 2, false),
    rarity('epic', '史诗', 4, 1.65, 2, 3, true),
    rarity('legendary', '传说', 5, 2, 3, 4, true),
    rarity('mythic', '神话', 6, 2.5, 4, 4, true),
  ],
  affixes: [
    affix('affix_attack_flat', '锋锐', 'attack-flat', 'flat', 2, 20, ALL_SLOTS),
    affix('affix_attack_percent', '强攻', 'attack-multiplier', 'percent', 0.02, 0.12, [
      'weapon',
      'armor',
      'necklace',
      'ring',
    ]),
    affix('affix_critical_rate', '精准', 'critical-rate', 'percent', 0.01, 0.08, [
      'helmet',
      'bracer',
      'necklace',
      'ring',
    ]),
    affix('affix_critical_damage', '毁伤', 'critical-damage', 'percent', 0.05, 0.3, [
      'helmet',
      'bracer',
      'necklace',
    ]),
    affix('affix_attack_speed', '迅捷', 'attack-speed', 'percent', 0.02, 0.12, [
      'weapon',
      'bracer',
      'boots',
    ]),
    affix('affix_boss_damage', '猎王', 'boss-damage', 'percent', 0.03, 0.2, [
      'weapon',
      'necklace',
      'ring',
    ]),
    affix('affix_gold', '富饶', 'gold-multiplier', 'percent', 0.03, 0.15, [
      'boots',
      'necklace',
      'ring',
    ]),
    affix('affix_offline', '远征', 'offline-multiplier', 'percent', 0.03, 0.15, [
      'armor',
      'boots',
      'ring',
    ]),
  ],
  templates: [
    template('equipment_ash_blade', '灰烬之刃', 'weapon', 'flat', 3, 1),
    template('equipment_scout_helmet', '斥候头盔', 'helmet', 'percent', 0.1, 0.01),
    template('equipment_rune_armor', '符文护甲', 'armor', 'percent', 0.03, 0.005),
    template('equipment_hunter_bracer', '猎手护腕', 'bracer', 'percent', 0.02, 0.003),
    template('equipment_wind_boots', '逐风之靴', 'boots', 'percent', 0.03, 0.004),
    template('equipment_oath_necklace', '誓约项链', 'necklace', 'percent', 0.05, 0.006),
    template('equipment_gilded_ring', '鎏金戒指', 'ring', 'percent', 0.04, 0.005),
  ],
};

function rarity(
  id: EquipmentRarity,
  name: string,
  rank: number,
  statMultiplier: number,
  minAffixes: number,
  maxAffixes: number,
  autoProtect: boolean,
): RarityConfig {
  return { id, name, rank, statMultiplier, minAffixes, maxAffixes, autoProtect };
}

function affix(
  id: string,
  name: string,
  statType: EquipmentStatType,
  valueKind: StatValueKind,
  minValue: number,
  maxValue: number,
  allowedSlots: readonly EquipmentSlot[],
): AffixConfig {
  return { id, name, statType, valueKind, minValue, maxValue, allowedSlots };
}

function template(
  id: string,
  name: string,
  slot: EquipmentSlot,
  mainStatValueKind: StatValueKind,
  baseMainStat: number,
  mainStatPerLevel: number,
): EquipmentTemplateConfig {
  return {
    id,
    name,
    slot,
    mainStatType: EQUIPMENT_SLOT_MAIN_STATS[slot],
    mainStatValueKind,
    baseMainStat,
    mainStatPerLevel,
    affixIds: AFFIX_IDS_BY_SLOT[slot],
  };
}
