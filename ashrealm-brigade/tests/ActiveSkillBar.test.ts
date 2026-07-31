import { describe, expect, it } from 'vitest';
import { SKILL_CONFIG } from '../assets/scripts/config/SkillConfig';
import { SkillConfigValidator } from '../assets/scripts/config/SkillConfigValidator';
import { ActiveSkillBar } from '../assets/scripts/modules/skill/ActiveSkillBar';

describe('active skill configuration', () => {
  it('contains four valid active skills', () => {
    expect(new SkillConfigValidator().validate(SKILL_CONFIG)).toEqual([]);
    expect(SKILL_CONFIG.activeSkills).toHaveLength(4);
  });
});

describe('ActiveSkillBar', () => {
  const skillIds = SKILL_CONFIG.activeSkills.map((skill) => skill.id);

  it('blocks locked skills and starts cooldown after a successful cast', () => {
    const skillBar = new ActiveSkillBar(skillIds);

    expect(skillBar.cast(1, 9).status).toBe('locked');
    expect(skillBar.cast(0, 1).status).toBe('cast');
    expect(skillBar.cast(0, 1).status).toBe('cooldown');
    expect(skillBar.getSnapshot(1)[0].cooldownRemaining).toBe(8);
  });

  it('reduces cooldown over time without going below zero', () => {
    const skillBar = new ActiveSkillBar(skillIds);
    skillBar.cast(0, 1);

    skillBar.tick(3.5);
    expect(skillBar.getSnapshot(1)[0].cooldownRemaining).toBe(4.5);
    skillBar.tick(10);
    expect(skillBar.getSnapshot(1)[0].cooldownRemaining).toBe(0);
    expect(skillBar.cast(0, 1).status).toBe('cast');
  });

  it('always exposes at most four slots', () => {
    const skillBar = new ActiveSkillBar([...skillIds, 'skill_extra']);
    expect(skillBar.getSnapshot(100)).toHaveLength(4);
  });
});
