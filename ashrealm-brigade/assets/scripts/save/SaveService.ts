import { KeyValueStorage } from '../platform/PlatformAdapter';
import { createDefaultSaveData, SAVE_SCHEMA_VERSION, SaveData } from './SaveData';

const SAVE_KEY = 'ashrealm.save.v1';
const TEMP_KEY = 'ashrealm.save.v1.tmp';
const BACKUP_KEY = 'ashrealm.save.v1.backup';

export class SaveService {
  private current: SaveData;

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
      return this.clone(main);
    }

    const backup = this.readValid(BACKUP_KEY);
    if (backup !== null) {
      this.current = backup;
      this.storage.setItem(SAVE_KEY, JSON.stringify(backup));
      this.storage.removeItem(TEMP_KEY);
      return this.clone(backup);
    }

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
      return this.isValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
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
      typeof data.claims === 'object' &&
      data.claims !== null
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
