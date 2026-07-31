import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_CONFIG,
  EQUIPMENT_SLOT_MAIN_STATS,
  EquipmentConfigTable,
} from '../assets/scripts/config/EquipmentConfig';
import { EquipmentConfigValidator } from '../assets/scripts/config/EquipmentConfigValidator';

describe('equipment configuration', () => {
  const validator = new EquipmentConfigValidator();

  it('defines six rarities and one valid graybox template for every slot', () => {
    expect(validator.validate(EQUIPMENT_CONFIG)).toEqual([]);
    expect(EQUIPMENT_CONFIG.rarities).toHaveLength(6);
    expect(EQUIPMENT_CONFIG.templates).toHaveLength(7);
    expect(new Set(EQUIPMENT_CONFIG.templates.map((template) => template.slot))).toEqual(
      new Set(Object.keys(EQUIPMENT_SLOT_MAIN_STATS)),
    );
  });

  it('protects epic and higher rarities and caps affixes at four', () => {
    for (const rarity of EQUIPMENT_CONFIG.rarities) {
      expect(rarity.autoProtect).toBe(rarity.rank >= 4);
      expect(rarity.maxAffixes).toBeLessThanOrEqual(4);
      expect(rarity.minAffixes).toBeLessThanOrEqual(rarity.maxAffixes);
    }
  });

  it('rejects duplicate slots and unknown affix references', () => {
    const invalid: EquipmentConfigTable = {
      ...EQUIPMENT_CONFIG,
      templates: [
        ...EQUIPMENT_CONFIG.templates.slice(0, 6),
        {
          ...EQUIPMENT_CONFIG.templates[6],
          id: 'equipment_invalid_ring',
          slot: 'weapon',
          mainStatType: 'attack-flat',
          affixIds: ['affix_unknown'],
        },
      ],
    };

    expect(validator.validate(invalid)).toEqual(
      expect.arrayContaining([
        'Duplicate equipment slot template: weapon.',
        'Template equipment_invalid_ring references unknown affix affix_unknown.',
        'Missing equipment template for slot ring.',
      ]),
    );
  });
});
