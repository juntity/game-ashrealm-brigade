import { HERO_CONFIG, MAIN_HERO_ID } from '../config/HeroConfig';
import { SKILL_CONFIG } from '../config/SkillConfig';
import { EquipmentRarity, EquipmentSlot } from '../config/EquipmentConfig';

export const SAVE_SCHEMA_VERSION = 4;

export interface SaveData {
  readonly schemaVersion: number;
  readonly revision: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastActiveAt: number;
  readonly player: PlayerSave;
  readonly progress: ProgressSave;
  readonly heroes: HeroSave[];
  readonly skills: SkillSave;
  readonly equipment: EquipmentCollectionSave;
  readonly claims: Record<string, boolean>;
}

export interface PlayerSave {
  readonly gold: number;
  readonly diamonds: number;
}

export interface ProgressSave {
  readonly stage: number;
  readonly highestStage: number;
  readonly chapter: number;
}

export interface HeroSave {
  readonly heroId: string;
  readonly level: number;
  readonly isUnlocked: boolean;
  readonly isDeployed: boolean;
}

export interface SkillSave {
  readonly equippedSkillIds: string[];
}

export interface EquipmentAffixSave {
  readonly affixId: string;
  readonly value: number;
}

export interface EquipmentSave {
  readonly instanceId: string;
  readonly templateId: string;
  readonly rarity: EquipmentRarity;
  readonly level: number;
  readonly enhanceLevel: number;
  readonly affixes: EquipmentAffixSave[];
  readonly protected: boolean;
}

export interface EquipmentCollectionSave {
  readonly inventory: EquipmentSave[];
  readonly equippedBySlot: Partial<Record<EquipmentSlot, string>>;
}

export function createDefaultSaveData(now: number): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    revision: 0,
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
    player: {
      gold: 0,
      diamonds: 0,
    },
    progress: {
      stage: 1,
      highestStage: 1,
      chapter: 1,
    },
    heroes: HERO_CONFIG.heroes.map((hero) => ({
      heroId: hero.id,
      level: 1,
      isUnlocked: hero.id === MAIN_HERO_ID,
      isDeployed: hero.id === MAIN_HERO_ID,
    })),
    skills: {
      equippedSkillIds: SKILL_CONFIG.activeSkills.map((skill) => skill.id),
    },
    equipment: {
      inventory: [],
      equippedBySlot: {},
    },
    claims: {},
  };
}
