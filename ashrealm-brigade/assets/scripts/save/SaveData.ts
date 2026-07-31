export const SAVE_SCHEMA_VERSION = 1;

export interface SaveData {
  readonly schemaVersion: number;
  readonly revision: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastActiveAt: number;
  readonly player: PlayerSave;
  readonly progress: ProgressSave;
  readonly heroes: HeroSave[];
  readonly claims: Record<string, boolean>;
}

export interface PlayerSave {
  readonly gold: number;
  readonly diamonds: number;
}

export interface ProgressSave {
  readonly stage: number;
  readonly chapter: number;
}

export interface HeroSave {
  readonly heroId: string;
  readonly level: number;
  readonly isDeployed: boolean;
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
      chapter: 1,
    },
    heroes: [
      {
        heroId: 'hero_main',
        level: 1,
        isDeployed: true,
      },
    ],
    claims: {},
  };
}
