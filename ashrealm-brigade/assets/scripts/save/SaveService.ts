import { KeyValueStorage } from '../platform/PlatformAdapter';
import { HERO_CONFIG, MAIN_HERO_ID } from '../config/HeroConfig';
import { MAX_ACTIVE_SKILL_SLOTS, SKILL_CONFIG } from '../config/SkillConfig';
import { EQUIPMENT_CONFIG, EquipmentSlot } from '../config/EquipmentConfig';
import { createDefaultSaveData, SAVE_SCHEMA_VERSION, SaveData } from './SaveData';
import { SaveMigrator } from './SaveMigrator';

const SAVE_KEY = 'ashrealm.save.v1';
const TEMP_KEY = 'ashrealm.save.v1.tmp';
const BACKUP_KEY = 'ashrealm.save.v1.backup';
const CORRUPT_KEY = 'ashrealm.save.corrupt.latest';

export interface SaveSlotDiagnostic {
  readonly present: boolean;
  readonly valid: boolean;
}

export interface SaveDiagnostics {
  readonly main: SaveSlotDiagnostic;
  readonly temporary: SaveSlotDiagnostic;
  readonly backup: SaveSlotDiagnostic;
  readonly hasCorruptSnapshot: boolean;
}

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

  public inspect(): SaveDiagnostics {
    return {
      main: this.inspectSlot(SAVE_KEY),
      temporary: this.inspectSlot(TEMP_KEY),
      backup: this.inspectSlot(BACKUP_KEY),
      hasCorruptSnapshot: this.storage.getItem(CORRUPT_KEY) !== null,
    };
  }

  public clearAll(): SaveData {
    this.storage.removeItem(SAVE_KEY);
    this.storage.removeItem(TEMP_KEY);
    this.storage.removeItem(BACKUP_KEY);
    this.storage.removeItem(CORRUPT_KEY);
    this.current = createDefaultSaveData(this.now());
    return this.clone(this.current);
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

  private inspectSlot(key: string): SaveSlotDiagnostic {
    const present = this.storage.getItem(key) !== null;
    return {
      present,
      valid: present && this.readValid(key) !== null,
    };
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
    const expectedHeroIds = new Set(HERO_CONFIG.heroes.map((hero) => hero.id));
    const savedHeroIds = new Set(
      Array.isArray(data.heroes)
        ? data.heroes.flatMap((hero) =>
            typeof hero === 'object' && hero !== null && typeof hero.heroId === 'string'
              ? [hero.heroId]
              : [],
          )
        : [],
    );
    const validSkillIds = new Set(SKILL_CONFIG.activeSkills.map((skill) => skill.id));
    const validTemplateIds = new Set(EQUIPMENT_CONFIG.templates.map((template) => template.id));
    const validRarityIds = new Set(EQUIPMENT_CONFIG.rarities.map((rarity) => rarity.id));
    const validAffixIds = new Set(EQUIPMENT_CONFIG.affixes.map((affix) => affix.id));
    const equipmentIds = new Set(
      Array.isArray(data.equipment?.inventory)
        ? data.equipment.inventory.flatMap((item) =>
            typeof item === 'object' && item !== null && typeof item.instanceId === 'string'
              ? [item.instanceId]
              : [],
          )
        : [],
    );
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
      this.isNonNegativeInteger(data.player.equipmentEssence) &&
      typeof data.progress === 'object' &&
      data.progress !== null &&
      this.isPositiveInteger(data.progress.stage) &&
      this.isPositiveInteger(data.progress.highestStage) &&
      data.progress.highestStage >= data.progress.stage &&
      this.isPositiveInteger(data.progress.chapter) &&
      Array.isArray(data.heroes) &&
      data.heroes.length === HERO_CONFIG.heroes.length &&
      savedHeroIds.size === expectedHeroIds.size &&
      [...expectedHeroIds].every((heroId) => savedHeroIds.has(heroId)) &&
      data.heroes.every(
        (hero) =>
          typeof hero === 'object' &&
          hero !== null &&
          typeof hero.heroId === 'string' &&
          hero.heroId.length > 0 &&
          this.isPositiveInteger(hero.level) &&
          typeof hero.isUnlocked === 'boolean' &&
          typeof hero.isDeployed === 'boolean',
      ) &&
      data.heroes.every((hero) => !hero.isDeployed || hero.isUnlocked) &&
      data.heroes.some(
        (hero) => hero.heroId === MAIN_HERO_ID && hero.isUnlocked && hero.isDeployed,
      ) &&
      data.heroes.filter((hero) => hero.heroId !== MAIN_HERO_ID && hero.isDeployed).length <= 3 &&
      typeof data.skills === 'object' &&
      data.skills !== null &&
      Array.isArray(data.skills.equippedSkillIds) &&
      data.skills.equippedSkillIds.length <= MAX_ACTIVE_SKILL_SLOTS &&
      new Set(data.skills.equippedSkillIds).size === data.skills.equippedSkillIds.length &&
      data.skills.equippedSkillIds.every(
        (skillId) => typeof skillId === 'string' && validSkillIds.has(skillId),
      ) &&
      typeof data.equipment === 'object' &&
      data.equipment !== null &&
      Array.isArray(data.equipment.inventory) &&
      equipmentIds.size === data.equipment.inventory.length &&
      data.equipment.inventory.every(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.instanceId === 'string' &&
          item.instanceId.length > 0 &&
          typeof item.templateId === 'string' &&
          validTemplateIds.has(item.templateId) &&
          validRarityIds.has(item.rarity) &&
          this.isPositiveInteger(item.level) &&
          this.isNonNegativeInteger(item.enhanceLevel) &&
          this.isNonNegativeInteger(item.starLevel) &&
          typeof item.protected === 'boolean' &&
          Array.isArray(item.affixes) &&
          new Set(item.affixes.map((affix) => affix.affixId)).size === item.affixes.length &&
          item.affixes.every(
            (affix) =>
              typeof affix === 'object' &&
              affix !== null &&
              typeof affix.affixId === 'string' &&
              validAffixIds.has(affix.affixId) &&
              this.isFiniteNumber(affix.value) &&
              affix.value > 0,
          ),
      ) &&
      typeof data.equipment.equippedBySlot === 'object' &&
      data.equipment.equippedBySlot !== null &&
      !Array.isArray(data.equipment.equippedBySlot) &&
      this.hasValidEquippedItems(data.equipment.equippedBySlot, data.equipment.inventory) &&
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

  private hasValidEquippedItems(
    equippedBySlot: Partial<Record<EquipmentSlot, string>>,
    inventory: SaveData['equipment']['inventory'],
  ): boolean {
    const validSlots = new Set(EQUIPMENT_CONFIG.templates.map((template) => template.slot));
    const equippedIds = Object.values(equippedBySlot);
    return (
      Object.entries(equippedBySlot).every(([slot, instanceId]) => {
        if (!validSlots.has(slot as EquipmentSlot) || typeof instanceId !== 'string') {
          return false;
        }
        const item = inventory.find((entry) => entry.instanceId === instanceId);
        const template = EQUIPMENT_CONFIG.templates.find((entry) => entry.id === item?.templateId);
        return item !== undefined && template?.slot === slot;
      }) && new Set(equippedIds).size === equippedIds.length
    );
  }

  private clone(data: SaveData): SaveData {
    return JSON.parse(JSON.stringify(data)) as SaveData;
  }
}
