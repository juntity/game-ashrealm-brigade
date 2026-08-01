export type MonsterTypeId =
  | 'shadow_rat'
  | 'forest_slime'
  | 'cave_bat'
  | 'river_fish'
  | 'goblin'
  | 'skeleton_warrior'
  | 'poison_spider'
  | 'wild_wolf'
  | 'stone_golem'
  | 'flame_sprite'
  | 'frost_ghost'
  | 'dark_mage'
  | 'berserk_boar'
  | 'sky_hawk'
  | 'mountain_giant'
  | 'shadow_assassin'
  | 'lava_demon'
  | 'tide_siren'
  | 'void_devourer'
  | 'twilight_drake';

export type BossTypeId =
  | 'howling_wolf_king'
  | 'swamp_witch'
  | 'boulder_titan'
  | 'inferno_demon'
  | 'abyss_black_dragon';

export interface MonsterConfig {
  readonly id: MonsterTypeId;
  readonly name: string;
  readonly description: string;
}

export interface BossConfig {
  readonly id: BossTypeId;
  readonly name: string;
  readonly description: string;
}

export type StageType = 'normal' | 'boss';

export interface StageConfig {
  readonly stage: number;
  readonly type: StageType;
  readonly monsterId: MonsterTypeId;
  readonly bossId: BossTypeId | null;
  readonly monsterHp: number;
  readonly monsterGold: number;
  readonly bossHp: number;
  readonly bossGold: number;
  readonly bossDurationSeconds: number;
}

export interface StageConfigTable {
  readonly schemaVersion: 1;
  readonly monsters: readonly MonsterConfig[];
  readonly bosses: readonly BossConfig[];
  readonly stages: readonly StageConfig[];
}

const MONSTERS: readonly MonsterConfig[] = [
  { id: 'shadow_rat', name: '影鼠', description: '潜伏于阴暗角落的齧齿类生物。' },
  { id: 'forest_slime', name: '森林史莱姆', description: '栖息在湿地中的凝胶状生物。' },
  { id: 'cave_bat', name: '洞穴蝙蝠', description: '回声定位能力极强的翼手目生物。' },
  { id: 'river_fish', name: '河鱼', description: '拥有锋利鳞片的河栖生物。' },
  { id: 'goblin', name: '哥布林', description: '群居的绿皮小型类人生物。' },
  { id: 'skeleton_warrior', name: '骷髅战士', description: '被暗影能量驱动的亡者骸骨。' },
  { id: 'poison_spider', name: '毒蜘蛛', description: '织网并注入神经毒素的八足猎手。' },
  { id: 'wild_wolf', name: '野狼', description: '协同狩猎的群体猎食者。' },
  { id: 'stone_golem', name: '岩石傀儡', description: '由土元素凝聚而成的巨型石像。' },
  { id: 'flame_sprite', name: '火焰精灵', description: '纯粹由火元素构成的灵体。' },
  { id: 'frost_ghost', name: '冰霜幽灵', description: '散发极寒气息的寒冰鬼魂。' },
  { id: 'dark_mage', name: '黑暗法师', description: '操控暗影与诅咒的法师。' },
  { id: 'berserk_boar', name: '狂暴野猪', description: '皮糙肉厚、冲击力惊人的野兽。' },
  { id: 'sky_hawk', name: '裂空鹰', description: '俯冲攻击的空中猛禽。' },
  { id: 'mountain_giant', name: '山岭巨人', description: '身躯如山峰般魁梧的远古巨人。' },
  { id: 'shadow_assassin', name: '暗影刺客', description: '潜行于暗处的无声杀手。' },
  { id: 'lava_demon', name: '熔岩魔', description: '由岩浆与硫磺中诞生的炎魔。' },
  { id: 'tide_siren', name: '潮汐海灵', description: '操控潮汐之力的海妖。' },
  { id: 'void_devourer', name: '虚空吞噬者', description: '来自异维度的未知恐惧。' },
  { id: 'twilight_drake', name: '暮光龙蜥', description: '兼具龙与爬行生物特征的亚龙。' },
];

const BOSSES: readonly BossConfig[] = [
  {
    id: 'howling_wolf_king',
    name: '啸月狼王',
    description: '统领狼群的传奇巨狼，据说能召唤月狼之力。',
  },
  {
    id: 'swamp_witch',
    name: '沼泽巫后',
    description: '栖息于腐沼深处的黑暗女巫，操控毒雾与疫病。',
  },
  {
    id: 'boulder_titan',
    name: '磐石巨灵',
    description: '沉睡于山岳深处的远古石灵，被惊醒后化作天灾。',
  },
  {
    id: 'inferno_demon',
    name: '炼狱炎魔',
    description: '从烈焰深渊中爬出的炎魔领主，焚尽一切。',
  },
  {
    id: 'abyss_black_dragon',
    name: '深渊黑龙',
    description: '古老而强大的巨龙，翼展遮天蔽日，喷吐毁灭吐息。',
  },
];

const BOSS_ORDER: readonly BossTypeId[] = [
  'howling_wolf_king',
  'swamp_witch',
  'boulder_titan',
  'inferno_demon',
  'abyss_black_dragon',
];

function getMonsterIdByStage(stage: number): MonsterTypeId {
  if (stage <= 5) return 'shadow_rat';
  if (stage <= 10) return 'forest_slime';
  if (stage <= 15) return 'cave_bat';
  if (stage <= 20) return 'river_fish';
  if (stage <= 30) return 'goblin';
  if (stage <= 40) return 'skeleton_warrior';
  if (stage <= 45) return 'poison_spider';
  if (stage <= 50) return 'wild_wolf';
  if (stage <= 55) return 'stone_golem';
  if (stage <= 60) return 'flame_sprite';
  if (stage <= 65) return 'frost_ghost';
  if (stage <= 70) return 'dark_mage';
  if (stage <= 75) return 'berserk_boar';
  if (stage <= 80) return 'sky_hawk';
  if (stage <= 85) return 'mountain_giant';
  if (stage <= 90) return 'shadow_assassin';
  if (stage <= 95) return 'lava_demon';
  if (stage <= 98) return 'tide_siren';
  return 'void_devourer';
}

function getBossIdByStage(stage: number): BossTypeId {
  const bossIndex = Math.floor(stage / 10 - 1) % BOSS_ORDER.length;
  return BOSS_ORDER[bossIndex];
}

function calculateMonsterHp(stage: number): number {
  const baseHp = 30;
  const growth = 1.14;
  return Math.floor(baseHp * Math.pow(growth, stage - 1));
}

function calculateMonsterGold(stage: number): number {
  const baseGold = 5;
  const factor = 1.5;
  return baseGold + Math.floor(stage * factor);
}

function calculateBossHp(stage: number): number {
  const baseHp = 600;
  const growth = 1.22;
  const cycleIndex = Math.floor(stage / 10 - 1);
  return Math.floor(baseHp * Math.pow(growth, cycleIndex));
}

function calculateBossGold(stage: number): number {
  const baseGold = 100;
  const factor = 1.0;
  return Math.floor(baseGold + stage * factor);
}

function calculateBossDuration(stage: number): number {
  if (stage <= 30) return 30;
  if (stage <= 60) return 28;
  if (stage <= 90) return 25;
  return 22;
}

function buildStages(): readonly StageConfig[] {
  const stages: StageConfig[] = [];
  for (let s = 1; s <= 100; s++) {
    const isBoss = s % 10 === 0;
    stages.push({
      stage: s,
      type: isBoss ? 'boss' : 'normal',
      monsterId: getMonsterIdByStage(s),
      bossId: isBoss ? getBossIdByStage(s) : null,
      monsterHp: calculateMonsterHp(s),
      monsterGold: calculateMonsterGold(s),
      bossHp: calculateBossHp(s),
      bossGold: calculateBossGold(s),
      bossDurationSeconds: calculateBossDuration(s),
    });
  }
  return Object.freeze(stages);
}

export const STAGE_CONFIG: Readonly<StageConfigTable> = Object.freeze({
  schemaVersion: 1,
  monsters: MONSTERS,
  bosses: BOSSES,
  stages: buildStages(),
});

export function getStageConfig(stage: number): StageConfig | null {
  if (stage < 1 || stage > 100) return null;
  return STAGE_CONFIG.stages[stage - 1];
}

export function isConfiguredStage(stage: number): boolean {
  return stage >= 1 && stage <= 100;
}

export function getBossTypeId(stage: number): BossTypeId {
  return getBossIdByStage(stage);
}

export function getMonsterTypeId(stage: number): MonsterTypeId {
  return getMonsterIdByStage(stage);
}

export { getBossIdByStage, getMonsterIdByStage };
