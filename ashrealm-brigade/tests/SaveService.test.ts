import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../assets/scripts/platform/MemoryStorage';
import { createDefaultSaveData } from '../assets/scripts/save/SaveData';
import { SaveService } from '../assets/scripts/save/SaveService';

describe('SaveService', () => {
  it('creates a default save when storage is empty', () => {
    const service = new SaveService(new MemoryStorage(), () => 1_000);

    expect(service.load()).toMatchObject({
      schemaVersion: 8,
      revision: 0,
      createdAt: 1_000,
      player: { gold: 0, diamonds: 0 },
      progress: { chapter: 1, stage: 1, highestStage: 1 },
    });
  });

  it('saves and loads validated data with an incremented revision', () => {
    const storage = new MemoryStorage();
    let now = 1_000;
    const service = new SaveService(storage, () => now);
    const initial = service.load();
    now = 2_000;

    const saved = service.save({
      ...initial,
      player: { ...initial.player, gold: 42 },
      progress: { ...initial.progress, stage: 5, highestStage: 5 },
    });

    expect(saved).toMatchObject({
      revision: 1,
      createdAt: 1_000,
      updatedAt: 2_000,
      player: { gold: 42 },
      progress: { stage: 5 },
    });

    const reloaded = new SaveService(storage, () => 3_000).load();
    expect(reloaded).toEqual(saved);
  });

  it('restores the last valid backup when the main save is corrupted', () => {
    const storage = new MemoryStorage();
    let now = 1_000;
    const service = new SaveService(storage, () => now);
    const initial = service.load();

    now = 2_000;
    service.save({ ...initial, player: { ...initial.player, gold: 10 } });
    now = 3_000;
    service.save({
      ...service.load(),
      player: { ...initial.player, gold: 20 },
    });

    storage.setItem('ashrealm.save.v1', '{broken-json');
    const restored = new SaveService(storage, () => 4_000).load();
    expect(restored.player.gold).toBe(10);
    expect(storage.getItem('ashrealm.save.corrupt.latest')).toContain('{broken-json');
  });

  it('recovers a valid temporary save when the main save is corrupted', () => {
    const storage = new MemoryStorage();
    const temporary = {
      ...createDefaultSaveData(1_000),
      revision: 3,
      player: { gold: 77, diamonds: 0, equipmentEssence: 0 },
    };
    storage.setItem('ashrealm.save.v1', 'broken');
    storage.setItem('ashrealm.save.v1.tmp', JSON.stringify(temporary));

    const restored = new SaveService(storage, () => 2_000).load();

    expect(restored.player.gold).toBe(77);
    expect(storage.getItem('ashrealm.save.v1.tmp')).toBeNull();
    expect(storage.getItem('ashrealm.save.v1')).toBe(JSON.stringify(temporary));
  });

  it('migrates a version-zero save without losing progress', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'ashrealm.save.v1',
      JSON.stringify({
        schemaVersion: 0,
        revision: 4,
        createdAt: 1_000,
        updatedAt: 2_000,
        lastActiveAt: 2_000,
        player: { gold: 88 },
        progress: { stage: 9 },
        heroes: [{ heroId: 'hero_main', level: 8, isDeployed: true }],
      }),
    );

    const migrated = new SaveService(storage, () => 3_000).load();

    expect(migrated).toMatchObject({
      schemaVersion: 8,
      revision: 4,
      player: { gold: 88, diamonds: 0 },
      progress: { stage: 9, highestStage: 9, chapter: 1 },
      heroes: expect.arrayContaining([
        expect.objectContaining({ heroId: 'hero_main', level: 8, isUnlocked: true }),
      ]),
      claims: {},
    });
    expect(JSON.parse(storage.getItem('ashrealm.save.v1') ?? '{}').schemaVersion).toBe(8);
  });

  it('migrates version one through the complete hero and skill schemas', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'ashrealm.save.v1',
      JSON.stringify({
        schemaVersion: 1,
        revision: 7,
        createdAt: 1_000,
        updatedAt: 2_000,
        lastActiveAt: 2_000,
        player: { gold: 123, diamonds: 0 },
        progress: { stage: 11, chapter: 1 },
        heroes: [{ heroId: 'hero_main', level: 8, isDeployed: true }],
        claims: {},
      }),
    );

    const migrated = new SaveService(storage, () => 3_000).load();

    expect(migrated.schemaVersion).toBe(8);
    expect(migrated.progress.highestStage).toBe(11);
    expect(migrated.heroes).toHaveLength(8);
    expect(migrated.heroes[0]).toMatchObject({
      heroId: 'hero_main',
      level: 8,
      isUnlocked: true,
      isDeployed: true,
    });
    expect(migrated.heroes[1]).toMatchObject({
      heroId: 'hero_mage',
      isUnlocked: true,
      isDeployed: false,
    });
    expect(migrated.skills.equippedSkillIds).toHaveLength(4);
  });

  it('migrates version two by adding the default active skill slots', () => {
    const storage = new MemoryStorage();
    const versionTwo: Record<string, unknown> = { ...createDefaultSaveData(1_000) };
    delete versionTwo.skills;
    storage.setItem(
      'ashrealm.save.v1',
      JSON.stringify({
        ...versionTwo,
        schemaVersion: 2,
      }),
    );

    const migrated = new SaveService(storage, () => 2_000).load();

    expect(migrated.schemaVersion).toBe(8);
    expect(migrated.skills.equippedSkillIds).toEqual([
      'skill_ember_slash',
      'skill_meteor',
      'skill_arrow_rain',
      'skill_holy_judgment',
    ]);
  });

  it('migrates version three by adding an empty equipment collection', () => {
    const storage = new MemoryStorage();
    const versionThree: Record<string, unknown> = { ...createDefaultSaveData(1_000) };
    delete versionThree.equipment;
    storage.setItem(
      'ashrealm.save.v1',
      JSON.stringify({
        ...versionThree,
        schemaVersion: 3,
      }),
    );

    const migrated = new SaveService(storage, () => 2_000).load();

    expect(migrated.schemaVersion).toBe(8);
    expect(migrated.equipment).toEqual({ inventory: [], equippedBySlot: {} });
  });

  it('migrates version four by adding equipment essence and star levels', () => {
    const storage = new MemoryStorage();
    const versionFour: Record<string, unknown> = { ...createDefaultSaveData(1_000) };
    versionFour.player = { gold: 50, diamonds: 2 };
    versionFour.equipment = {
      inventory: [
        {
          instanceId: 'legacy_weapon',
          templateId: 'equipment_ash_blade',
          rarity: 'rare',
          level: 2,
          enhanceLevel: 3,
          affixes: [],
          protected: false,
        },
      ],
      equippedBySlot: { weapon: 'legacy_weapon' },
    };
    storage.setItem('ashrealm.save.v1', JSON.stringify({ ...versionFour, schemaVersion: 4 }));

    const migrated = new SaveService(storage, () => 2_000).load();

    expect(migrated.schemaVersion).toBe(8);
    expect(migrated.player.equipmentEssence).toBe(0);
    expect(migrated.equipment.inventory[0]).toMatchObject({
      instanceId: 'legacy_weapon',
      enhanceLevel: 3,
      starLevel: 0,
    });
  });

  it('migrates version five by adding empty task progress', () => {
    const storage = new MemoryStorage();
    const versionFive: Record<string, unknown> = { ...createDefaultSaveData(1_000) };
    delete versionFive.tasks;
    storage.setItem('ashrealm.save.v1', JSON.stringify({ ...versionFive, schemaVersion: 5 }));

    const migrated = new SaveService(storage, () => 2_000).load();

    expect(migrated.schemaVersion).toBe(8);
    expect(migrated.tasks).toEqual({
      dailyDateKey: '',
      dailyProgress: {},
      dailyClaimed: {},
      achievementProgress: {},
      achievementClaimed: {},
    });
  });

  it('migrates version six by adding persistent equipment pity counters', () => {
    const storage = new MemoryStorage();
    const versionSix: Record<string, unknown> = { ...createDefaultSaveData(1_000) };
    delete versionSix.equipmentDropPity;
    storage.setItem('ashrealm.save.v1', JSON.stringify({ ...versionSix, schemaVersion: 6 }));

    const migrated = new SaveService(storage, () => 2_000).load();

    expect(migrated.schemaVersion).toBe(8);
    expect(migrated.equipmentDropPity).toEqual({ normalMisses: 0, bossesSinceMythic: 0 });
  });

  it('migrates version seven by adding an empty resource ledger', () => {
    const storage = new MemoryStorage();
    const versionSeven: Record<string, unknown> = { ...createDefaultSaveData(1_000) };
    delete versionSeven.resourceLedger;
    storage.setItem('ashrealm.save.v1', JSON.stringify({ ...versionSeven, schemaVersion: 7 }));

    const migrated = new SaveService(storage, () => 2_000).load();

    expect(migrated.schemaVersion).toBe(8);
    expect(migrated.resourceLedger).toEqual({ nextSequence: 1, entries: [] });
  });

  it('uses a default save when every stored candidate is corrupted', () => {
    const storage = new MemoryStorage();
    storage.setItem('ashrealm.save.v1', 'broken-main');
    storage.setItem('ashrealm.save.v1.tmp', 'broken-temp');
    storage.setItem('ashrealm.save.v1.backup', 'broken-backup');

    const restored = new SaveService(storage, () => 5_000).load();

    expect(restored).toEqual(createDefaultSaveData(5_000));
    expect(storage.getItem('ashrealm.save.corrupt.latest')).toContain('broken-backup');
  });

  it('rejects invalid data without replacing the valid save', () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage, () => 1_000);
    const initial = service.load();
    service.save(initial);

    const invalid = {
      ...createDefaultSaveData(2_000),
      progress: { ...createDefaultSaveData(2_000).progress, stage: 0 },
    };

    expect(() => service.save(invalid)).toThrow('invalid SaveData');
    expect(new SaveService(storage, () => 3_000).load().progress.stage).toBe(1);
  });

  it('rejects malformed hero and claim records', () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage, () => 1_000);
    const initial = service.load();

    expect(() =>
      service.save({
        ...initial,
        heroes: initial.heroes.map((hero) =>
          hero.heroId === 'hero_main' ? { ...hero, level: 0 } : hero,
        ),
      }),
    ).toThrow('invalid SaveData');

    expect(() =>
      service.save({
        ...initial,
        claims: { daily_gold: 'yes' as unknown as boolean },
      }),
    ).toThrow('invalid SaveData');

    expect(() =>
      service.save({
        ...initial,
        heroes: [null, ...initial.heroes.slice(1)] as unknown as typeof initial.heroes,
      }),
    ).toThrow('invalid SaveData');
  });

  it('rejects unknown or duplicate equipped skill ids', () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage, () => 1_000);
    const initial = service.load();

    expect(() =>
      service.save({
        ...initial,
        skills: { equippedSkillIds: ['skill_unknown'] },
      }),
    ).toThrow('invalid SaveData');
    expect(() =>
      service.save({
        ...initial,
        skills: { equippedSkillIds: ['skill_ember_slash', 'skill_ember_slash'] },
      }),
    ).toThrow('invalid SaveData');
  });

  it('persists valid equipment and rejects broken equipped references', () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage, () => 1_000);
    const initial = service.load();
    const weapon = {
      instanceId: 'equipment_saved_weapon',
      templateId: 'equipment_ash_blade',
      rarity: 'rare' as const,
      level: 2,
      enhanceLevel: 0,
      starLevel: 0,
      affixes: [{ affixId: 'affix_attack_flat', value: 5 }],
      protected: false,
    };

    const saved = service.save({
      ...initial,
      equipment: {
        inventory: [weapon],
        equippedBySlot: { weapon: weapon.instanceId },
      },
    });
    expect(saved.equipment.equippedBySlot.weapon).toBe(weapon.instanceId);

    expect(() =>
      service.save({
        ...saved,
        equipment: {
          ...saved.equipment,
          equippedBySlot: { helmet: weapon.instanceId },
        },
      }),
    ).toThrow('invalid SaveData');
  });

  it('rejects unknown task progress and progress beyond its target', () => {
    const service = new SaveService(new MemoryStorage(), () => 1_000);
    const initial = service.load();

    expect(() =>
      service.save({
        ...initial,
        tasks: { ...initial.tasks, dailyProgress: { unknown_task: 1 } },
      }),
    ).toThrow('invalid SaveData');
    expect(() =>
      service.save({
        ...initial,
        tasks: { ...initial.tasks, dailyProgress: { daily_kill_10: 11 } },
      }),
    ).toThrow('invalid SaveData');
  });

  it('rejects malformed resource ledger entries', () => {
    const service = new SaveService(new MemoryStorage(), () => 1_000);
    const initial = service.load();

    expect(() =>
      service.save({
        ...initial,
        resourceLedger: {
          nextSequence: 2,
          entries: [
            {
              sequence: 1,
              timestamp: 1_000,
              resource: 'gold',
              amount: 10,
              balanceAfter: 10,
              sourceId: 'unknown-source',
            },
          ],
        },
      }),
    ).toThrow('invalid SaveData');
  });

  it('reports save slot health without modifying storage', () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage, () => 1_000);
    const initial = service.load();
    service.save(initial);
    storage.setItem('ashrealm.save.v1.tmp', 'broken-temp');

    expect(service.inspect()).toEqual({
      main: { present: true, valid: true },
      temporary: { present: true, valid: false },
      backup: { present: false, valid: false },
      hasCorruptSnapshot: false,
    });
    expect(storage.getItem('ashrealm.save.v1.tmp')).toBe('broken-temp');
  });

  it('clears every save slot and resets in-memory progress', () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage, () => 1_000);
    const initial = service.load();
    service.save({ ...initial, player: { ...initial.player, gold: 99 } });
    storage.setItem('ashrealm.save.v1.tmp', 'temp');
    storage.setItem('ashrealm.save.corrupt.latest', 'corrupt');

    const cleared = service.clearAll();

    expect(cleared).toEqual(createDefaultSaveData(1_000));
    expect(service.inspect()).toEqual({
      main: { present: false, valid: false },
      temporary: { present: false, valid: false },
      backup: { present: false, valid: false },
      hasCorruptSnapshot: false,
    });
  });
});
