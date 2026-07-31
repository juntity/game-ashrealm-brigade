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
