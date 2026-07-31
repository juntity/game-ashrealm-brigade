import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../assets/scripts/platform/MemoryStorage';
import { createDefaultSaveData } from '../assets/scripts/save/SaveData';
import { SaveService } from '../assets/scripts/save/SaveService';

describe('SaveService', () => {
  it('creates a default save when storage is empty', () => {
    const service = new SaveService(new MemoryStorage(), () => 1_000);

    expect(service.load()).toMatchObject({
      schemaVersion: 1,
      revision: 0,
      createdAt: 1_000,
      player: { gold: 0, diamonds: 0 },
      progress: { chapter: 1, stage: 1 },
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
      progress: { ...initial.progress, stage: 5 },
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
      player: { gold: 77, diamonds: 0 },
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
      schemaVersion: 1,
      revision: 4,
      player: { gold: 88, diamonds: 0 },
      progress: { stage: 9, chapter: 1 },
      heroes: [{ level: 8 }],
      claims: {},
    });
    expect(JSON.parse(storage.getItem('ashrealm.save.v1') ?? '{}').schemaVersion).toBe(1);
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
      progress: { chapter: 1, stage: 0 },
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
        heroes: [{ heroId: 'hero_main', level: 0, isDeployed: true }],
      }),
    ).toThrow('invalid SaveData');

    expect(() =>
      service.save({
        ...initial,
        claims: { daily_gold: 'yes' as unknown as boolean },
      }),
    ).toThrow('invalid SaveData');
  });
});
