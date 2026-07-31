import { KeyValueStorage } from '../platform/PlatformAdapter';
import { createDefaultSaveData, SAVE_SCHEMA_VERSION, SaveData } from './SaveData';
import { SaveMigrator } from './SaveMigrator';

const SAVE_KEY = 'ashrealm.save.v1';
const TEMP_KEY = 'ashrealm.save.v1.tmp';
const BACKUP_KEY = 'ashrealm.save.v1.backup';
const CORRUPT_KEY = 'ashrealm.save.corrupt.latest';

export class SaveService {
  private current: SaveData;
  private readonly migrator = new SaveMigrator();

  public constructor(
    private readonly storage: KeyValueStorage,
    private readonly now: () => number,
  ) {
    this.current = createDefaultSaveData(this.now());
  }

  public load(): SaveData {
    const main = this.readValid(SAVE_KEY);
    if (main !== null) {
      this.current = main;
      this.storage.removeItem(TEMP_KEY);
      this.persistMigratedData(SAVE_KEY, main);
      return this.clone(main);
    }

    this.archiveIfCorrupted(SAVE_KEY);

    const temporary = this.readValid(TEMP_KEY);
    if (temporary !== null) {
      this.current = temporary;
      this.storage.setItem(SAVE_KEY, JSON.stringify(temporary));
      this.storage.removeItem(TEMP_KEY);
      return this.clone(temporary);
    }

    this.archiveIfCorrupted(TEMP_KEY);

    const backup = this.readValid(BACKUP_KEY);
    if (backup !== null) {
      this.current = backup;
      this.storage.setItem(SAVE_KEY, JSON.stringify(backup));
      this.storage.removeItem(TEMP_KEY);
      return this.clone(backup);
    }

    this.archiveIfCorrupted(BACKUP_KEY);
    this.current = createDefaultSaveData(this.now());
    this.storage.removeItem(TEMP_KEY);
    return this.clone(this.current);
  }

  public save(next: SaveData): SaveData {
    if (!this.isValid(next)) {
      throw new Error('Refusing to save invalid SaveData.');
    }

    const timestamp = this.now();
    const saved: SaveData = {
      ...this.clone(next),
      schemaVersion: SAVE_SCHEMA_VERSION,
      revision: this.current.revision + 1,
      createdAt: this.current.createdAt,
      updatedAt: timestamp,
      lastActiveAt: timestamp,
    };
    const serialized = JSON.stringify(saved);

    this.storage.setItem(TEMP_KEY, serialized);
    if (this.readValid(TEMP_KEY) === null) {
      this.storage.removeItem(TEMP_KEY);
      throw new Error('Temporary save verification failed.');
    }

    const previousMain = this.readValid(SAVE_KEY);
    if (previousMain !== null) {
      this.storage.setItem(BACKUP_KEY, JSON.stringify(previousMain));
    }

    this.storage.setItem(SAVE_KEY, serialized);
    if (this.readValid(SAVE_KEY) === null) {
      throw new Error('Main save verification failed.');
    }

    this.storage.removeItem(TEMP_KEY);
    this.current = saved;
    return this.clone(saved);
  }

  private readValid(key: string): SaveData | null {
    const serialized = this.storage.getItem(key);
    if (serialized === null) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(serialized);
      const migrated = this.migrator.migrate(parsed);
      return this.isValid(migrated) ? migrated : null;
    } catch {
      return null;
    }
  }

  private persistMigratedData(key: string, data: SaveData): void {
    const serialized = this.storage.getItem(key);
    if (serialized === null) {
      return;
    }

    try {
      const parsed = JSON.parse(serialized) as { schemaVersion?: unknown };
      if (parsed.schemaVersion !== SAVE_SCHEMA_VERSION) {
        this.storage.setItem(key, JSON.stringify(data));
      }
    } catch {
      // Invalid JSON is handled by the recovery path.
    }
  }

  private archiveIfCorrupted(key: string): void {
    const raw = this.storage.getItem(key);
    if (raw === null || this.readValid(key) !== null) {
      return;
    }

    this.storage.setItem(
      CORRUPT_KEY,
      JSON.stringify({
        capturedAt: this.now(),
        sourceKey: key,
        raw,
      }),
    );
  }

  private isValid(value: unknown): value is SaveData {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const data = value as Partial<SaveData>;
    return (
      data.schemaVersion === SAVE_SCHEMA_VERSION &&
      this.isNonNegativeInteger(data.revision) &&
      this.isFiniteNumber(data.createdAt) &&
      this.isFiniteNumber(data.updatedAt) &&
      this.isFiniteNumber(data.lastActiveAt) &&
      typeof data.player === 'object' &&
      data.player !== null &&
      this.isNonNegativeInteger(data.player.gold) &&
      this.isNonNegativeInteger(data.player.diamonds) &&
      typeof data.progress === 'object' &&
      data.progress !== null &&
      this.isPositiveInteger(data.progress.stage) &&
      this.isPositiveInteger(data.progress.chapter) &&
      Array.isArray(data.heroes) &&
      data.heroes.length > 0 &&
      data.heroes.every(
        (hero) =>
          typeof hero === 'object' &&
          hero !== null &&
          typeof hero.heroId === 'string' &&
          hero.heroId.length > 0 &&
          this.isPositiveInteger(hero.level) &&
          typeof hero.isDeployed === 'boolean',
      ) &&
      typeof data.claims === 'object' &&
      data.claims !== null &&
      !Array.isArray(data.claims) &&
      Object.values(data.claims).every((claimed) => typeof claimed === 'boolean')
    );
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private isNonNegativeInteger(value: unknown): value is number {
    return Number.isInteger(value) && Number(value) >= 0;
  }

  private isPositiveInteger(value: unknown): value is number {
    return Number.isInteger(value) && Number(value) > 0;
  }

  private clone(data: SaveData): SaveData {
    return JSON.parse(JSON.stringify(data)) as SaveData;
  }
}
