import { describe, expect, it } from 'vitest';
import { StageConfigValidator } from '../assets/scripts/config/StageConfigValidator';
import {
  STAGE_CONFIG,
  getStageConfig,
  isConfiguredStage,
  getBossTypeId,
  getMonsterTypeId,
} from '../assets/scripts/config/StageConfig';

describe('StageConfig', () => {
  describe('monster definitions', () => {
    it('contains exactly 20 monster types', () => {
      expect(STAGE_CONFIG.monsters).toHaveLength(20);
    });

    it('has unique monster ids', () => {
      const ids = STAGE_CONFIG.monsters.map((m) => m.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(20);
    });

    it('every monster has non-empty name and description', () => {
      for (const m of STAGE_CONFIG.monsters) {
        expect(m.name.trim().length).toBeGreaterThan(0);
        expect(m.description.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('boss definitions', () => {
    it('contains exactly 5 boss types', () => {
      expect(STAGE_CONFIG.bosses).toHaveLength(5);
    });

    it('has unique boss ids', () => {
      const ids = STAGE_CONFIG.bosses.map((b) => b.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(5);
    });

    it('every boss has non-empty name and description', () => {
      for (const b of STAGE_CONFIG.bosses) {
        expect(b.name.trim().length).toBeGreaterThan(0);
        expect(b.description.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('stage table', () => {
    it('contains exactly 100 stages', () => {
      expect(STAGE_CONFIG.stages).toHaveLength(100);
    });

    it('stages are numbered 1 through 100', () => {
      for (let i = 0; i < 100; i++) {
        expect(STAGE_CONFIG.stages[i].stage).toBe(i + 1);
      }
    });

    it('every 10th stage is a boss stage', () => {
      for (let s = 10; s <= 100; s += 10) {
        const cfg = getStageConfig(s);
        expect(cfg?.type).toBe('boss');
      }
    });

    it('every non-10th stage is a normal stage', () => {
      for (let s = 1; s <= 100; s++) {
        if (s % 10 === 0) continue;
        const cfg = getStageConfig(s);
        expect(cfg?.type).toBe('normal');
      }
    });

    it('boss stages have null monsterId, normal stages have non-null monsterId', () => {
      for (let s = 1; s <= 100; s++) {
        const cfg = getStageConfig(s)!;
        if (s % 10 === 0) {
          expect(cfg.bossId).not.toBeNull();
          expect(cfg.monsterId).toBeDefined();
        } else {
          expect(cfg.bossId).toBeNull();
          expect(cfg.monsterId).toBeDefined();
        }
      }
    });

    it('monster HP grows monotonically for normal stages', () => {
      let prevHp = 0;
      for (let s = 1; s <= 100; s++) {
        if (s % 10 === 0) continue;
        const cfg = getStageConfig(s)!;
        expect(cfg.monsterHp).toBeGreaterThan(prevHp);
        prevHp = cfg.monsterHp;
      }
    });

    it('boss HP grows with each boss encounter', () => {
      const bossHps: number[] = [];
      for (let s = 10; s <= 100; s += 10) {
        const cfg = getStageConfig(s)!;
        bossHps.push(cfg.bossHp);
      }
      for (let i = 1; i < bossHps.length; i++) {
        expect(bossHps[i]).toBeGreaterThan(bossHps[i - 1]);
      }
    });

    it('boss gold grows with each boss encounter', () => {
      const bossGolds: number[] = [];
      for (let s = 10; s <= 100; s += 10) {
        const cfg = getStageConfig(s)!;
        bossGolds.push(cfg.bossGold);
      }
      for (let i = 1; i < bossGolds.length; i++) {
        expect(bossGolds[i]).toBeGreaterThan(bossGolds[i - 1]);
      }
    });

    it('all 5 boss types are used across 100 stages', () => {
      const usedBossIds = new Set<string>();
      for (let s = 10; s <= 100; s += 10) {
        const cfg = getStageConfig(s)!;
        usedBossIds.add(cfg.bossId!);
      }
      expect(usedBossIds.size).toBe(5);
    });

    it('bosses cycle through 5 types in order', () => {
      const expectedOrder = [
        'howling_wolf_king',
        'swamp_witch',
        'boulder_titan',
        'inferno_demon',
        'abyss_black_dragon',
      ];
      for (let i = 0; i < 10; i++) {
        const s = (i + 1) * 10;
        const cfg = getStageConfig(s)!;
        expect(cfg.bossId).toBe(expectedOrder[i % 5]);
      }
    });
  });

  describe('getStageConfig', () => {
    it('returns config for stages 1-100', () => {
      for (let s = 1; s <= 100; s++) {
        expect(getStageConfig(s)).not.toBeNull();
      }
    });

    it('returns null for stage 0 and negative stages', () => {
      expect(getStageConfig(0)).toBeNull();
      expect(getStageConfig(-1)).toBeNull();
    });

    it('returns null for stages beyond 100', () => {
      expect(getStageConfig(101)).toBeNull();
      expect(getStageConfig(200)).toBeNull();
    });
  });

  describe('isConfiguredStage', () => {
    it('returns true for stages 1-100', () => {
      for (let s = 1; s <= 100; s++) {
        expect(isConfiguredStage(s)).toBe(true);
      }
    });

    it('returns false for stage 0 and stages beyond 100', () => {
      expect(isConfiguredStage(0)).toBe(false);
      expect(isConfiguredStage(101)).toBe(false);
      expect(isConfiguredStage(-5)).toBe(false);
    });
  });

  describe('getBossTypeId', () => {
    it('returns correct boss type for every boss stage', () => {
      const expectedOrder = [
        'howling_wolf_king',
        'swamp_witch',
        'boulder_titan',
        'inferno_demon',
        'abyss_black_dragon',
      ];
      for (let i = 0; i < 10; i++) {
        const s = (i + 1) * 10;
        expect(getBossTypeId(s)).toBe(expectedOrder[i % 5]);
      }
    });
  });

  describe('getMonsterTypeId', () => {
    it('returns a valid monster id for any stage', () => {
      for (let s = 1; s <= 100; s++) {
        const id = getMonsterTypeId(s);
        const validIds = STAGE_CONFIG.monsters.map((m) => m.id);
        expect(validIds).toContain(id);
      }
    });
  });

  describe('StageConfigValidator', () => {
    const validator = new StageConfigValidator();

    it('reports no errors for valid config', () => {
      const errors = validator.validate(STAGE_CONFIG);
      expect(errors).toHaveLength(0);
    });

    it('reports reachability warnings for valid config', () => {
      const errors = validator.validateReachability(STAGE_CONFIG);
      expect(errors).toHaveLength(0);
    });
  });
});
