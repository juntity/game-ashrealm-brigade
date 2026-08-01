import { StageConfigTable } from './StageConfig';

export class StageConfigValidator {
  public validate(table: StageConfigTable): readonly string[] {
    const errors: string[] = [];

    if (table.schemaVersion !== 1) {
      errors.push('Stage config schemaVersion must be 1.');
    }

    if (table.monsters.length !== 20) {
      errors.push(`Stage config must contain exactly 20 monsters, got ${table.monsters.length}.`);
    }

    if (table.bosses.length !== 5) {
      errors.push(`Stage config must contain exactly 5 bosses, got ${table.bosses.length}.`);
    }

    if (table.stages.length !== 100) {
      errors.push(`Stage config must contain exactly 100 stages, got ${table.stages.length}.`);
    }

    const monsterIds = new Set<string>();
    for (const m of table.monsters) {
      if (monsterIds.has(m.id)) {
        errors.push(`Duplicate monster id: ${m.id}.`);
      }
      monsterIds.add(m.id);
      if (!m.id || m.name.trim().length === 0) {
        errors.push(`Monster id=${m.id} must have a non-empty name.`);
      }
    }

    const bossIds = new Set<string>();
    for (const b of table.bosses) {
      if (bossIds.has(b.id)) {
        errors.push(`Duplicate boss id: ${b.id}.`);
      }
      bossIds.add(b.id);
      if (!b.id || b.name.trim().length === 0) {
        errors.push(`Boss id=${b.id} must have a non-empty name.`);
      }
    }

    for (const stage of table.stages) {
      if (stage.stage < 1 || stage.stage > 100) {
        errors.push(`Stage number must be 1-100, got ${stage.stage}.`);
      }
      if (!monsterIds.has(stage.monsterId)) {
        errors.push(`Stage ${stage.stage}: unknown monster id "${stage.monsterId}".`);
      }
      if (stage.type === 'boss') {
        if (!stage.bossId || !bossIds.has(stage.bossId)) {
          errors.push(`Stage ${stage.stage}: boss type must reference a valid boss id.`);
        }
        if (stage.bossDurationSeconds <= 0) {
          errors.push(`Stage ${stage.stage}: bossDurationSeconds must be positive.`);
        }
        if (stage.bossHp <= 0) {
          errors.push(`Stage ${stage.stage}: bossHp must be positive.`);
        }
        if (stage.bossGold < 0) {
          errors.push(`Stage ${stage.stage}: bossGold must be non-negative.`);
        }
      } else if (stage.type === 'normal') {
        if (stage.bossId !== null) {
          errors.push(`Stage ${stage.stage}: normal stage must have bossId=null.`);
        }
        if (stage.monsterHp <= 0) {
          errors.push(`Stage ${stage.stage}: monsterHp must be positive.`);
        }
        if (stage.monsterGold < 0) {
          errors.push(`Stage ${stage.stage}: monsterGold must be non-negative.`);
        }
      }
    }

    for (let i = 0; i < table.stages.length; i++) {
      const s = table.stages[i];
      const expectedType = s.stage % 10 === 0 ? 'boss' : 'normal';
      if (s.type !== expectedType) {
        errors.push(`Stage ${s.stage}: type should be "${expectedType}" but got "${s.type}".`);
      }
    }

    return errors;
  }

  public validateReachability(table: StageConfigTable): readonly string[] {
    const errors: string[] = [];
    const bossHpValues: number[] = [];

    for (let s = 10; s <= 100; s += 10) {
      const cfg = table.stages[s - 1];
      bossHpValues.push(cfg.bossHp);
    }

    for (let i = 1; i < bossHpValues.length; i++) {
      if (bossHpValues[i] <= bossHpValues[i - 1]) {
        errors.push(
          `Boss HP at stage ${(i + 1) * 10} (${bossHpValues[i]}) should be greater than boss HP at stage ${i * 10} (${bossHpValues[i - 1]}).`,
        );
      }
    }

    return errors;
  }
}
