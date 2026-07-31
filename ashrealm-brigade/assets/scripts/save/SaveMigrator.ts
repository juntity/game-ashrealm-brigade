import { HERO_CONFIG, MAIN_HERO_ID } from '../config/HeroConfig';
import { SKILL_CONFIG } from '../config/SkillConfig';
import { SAVE_SCHEMA_VERSION } from './SaveData';

type SaveMigration = (data: Record<string, unknown>) => unknown;

const MIGRATIONS: Readonly<Record<number, SaveMigration>> = {
  0: (data) => {
    const player = asRecord(data.player);
    const progress = asRecord(data.progress);

    return {
      ...data,
      schemaVersion: 1,
      player: {
        ...player,
        diamonds: player?.diamonds ?? 0,
      },
      progress: {
        ...progress,
        chapter: progress?.chapter ?? 1,
      },
      claims: asRecord(data.claims) ?? {},
    };
  },
  1: (data) => {
    const progress = asRecord(data.progress);
    const currentStage = toPositiveInteger(progress?.stage, 1);
    const legacyHeroes = Array.isArray(data.heroes) ? data.heroes : [];

    return {
      ...data,
      schemaVersion: 2,
      progress: {
        ...progress,
        highestStage: currentStage,
      },
      heroes: HERO_CONFIG.heroes.map((config) => {
        const legacy = legacyHeroes.map(asRecord).find((hero) => hero?.heroId === config.id);
        const isUnlocked = config.id === MAIN_HERO_ID || config.unlock.stage <= currentStage;
        return {
          heroId: config.id,
          level: toPositiveInteger(legacy?.level, 1),
          isUnlocked,
          isDeployed: config.id === MAIN_HERO_ID,
        };
      }),
    };
  },
  2: (data) => ({
    ...data,
    schemaVersion: 3,
    skills: {
      equippedSkillIds: SKILL_CONFIG.activeSkills.map((skill) => skill.id),
    },
  }),
};

export class SaveMigrator {
  public migrate(value: unknown): unknown {
    let current = asRecord(value);
    if (current === null) {
      return null;
    }

    let version = current.schemaVersion;
    if (!Number.isInteger(version) || Number(version) < 0) {
      return null;
    }

    while (Number(version) < SAVE_SCHEMA_VERSION) {
      const migration = MIGRATIONS[Number(version)];
      if (migration === undefined) {
        return null;
      }

      current = asRecord(migration(current));
      if (current === null || current.schemaVersion !== Number(version) + 1) {
        return null;
      }
      version = current.schemaVersion;
    }

    return version === SAVE_SCHEMA_VERSION ? current : null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function toPositiveInteger(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}
