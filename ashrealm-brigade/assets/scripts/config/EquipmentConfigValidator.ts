import {
  AffixConfig,
  EQUIPMENT_CONFIG,
  EQUIPMENT_SLOT_MAIN_STATS,
  EquipmentConfigTable,
  EquipmentSlot,
} from './EquipmentConfig';

const EXPECTED_SLOTS = Object.keys(EQUIPMENT_SLOT_MAIN_STATS) as EquipmentSlot[];
const EXPECTED_RARITY_COUNT = 6;

export class EquipmentConfigValidator {
  public validate(table: EquipmentConfigTable): readonly string[] {
    const errors: string[] = [];
    const affixes = new Map<string, AffixConfig>();

    if (table.schemaVersion !== 1) {
      errors.push('Equipment config schemaVersion must be 1.');
    }
    if (table.rarities.length !== EXPECTED_RARITY_COUNT) {
      errors.push('Equipment config must contain exactly 6 rarities.');
    }
    if (table.templates.length !== EXPECTED_SLOTS.length) {
      errors.push('Equipment config must contain exactly one graybox template per slot.');
    }

    this.validateRarities(table, errors);
    this.validateAffixes(table, affixes, errors);
    this.validateTemplates(table, affixes, errors);
    return errors;
  }

  private validateRarities(table: EquipmentConfigTable, errors: string[]): void {
    const ids = new Set<string>();
    const ranks = new Set<number>();
    for (const rarity of table.rarities) {
      if (ids.has(rarity.id)) {
        errors.push(`Duplicate rarity id: ${rarity.id}.`);
      }
      if (ranks.has(rarity.rank)) {
        errors.push(`Duplicate rarity rank: ${rarity.rank}.`);
      }
      ids.add(rarity.id);
      ranks.add(rarity.rank);

      if (rarity.rank < 1 || rarity.rank > EXPECTED_RARITY_COUNT) {
        errors.push(`Rarity ${rarity.id} rank is out of range.`);
      }
      if (rarity.minAffixes < 0 || rarity.maxAffixes > 4 || rarity.minAffixes > rarity.maxAffixes) {
        errors.push(`Rarity ${rarity.id} affix count is invalid.`);
      }
      if (rarity.statMultiplier <= 0) {
        errors.push(`Rarity ${rarity.id} statMultiplier must be positive.`);
      }
      const shouldProtect = rarity.rank >= 4;
      if (rarity.autoProtect !== shouldProtect) {
        errors.push(`Rarity ${rarity.id} autoProtect must be ${String(shouldProtect)}.`);
      }
    }
  }

  private validateAffixes(
    table: EquipmentConfigTable,
    affixes: Map<string, AffixConfig>,
    errors: string[],
  ): void {
    for (const affix of table.affixes) {
      if (!/^affix_[a-z0-9_]+$/.test(affix.id)) {
        errors.push(`Invalid affix id: ${affix.id}.`);
      } else if (affixes.has(affix.id)) {
        errors.push(`Duplicate affix id: ${affix.id}.`);
      }
      affixes.set(affix.id, affix);

      if (
        !Number.isFinite(affix.minValue) ||
        affix.minValue <= 0 ||
        affix.maxValue < affix.minValue
      ) {
        errors.push(`Affix ${affix.id} value range is invalid.`);
      }
      if (
        affix.allowedSlots.length === 0 ||
        new Set(affix.allowedSlots).size !== affix.allowedSlots.length
      ) {
        errors.push(`Affix ${affix.id} allowedSlots is invalid.`);
      }
      if (affix.valueKind === 'percent' && affix.maxValue > 1) {
        errors.push(`Affix ${affix.id} percent value must not exceed 1.`);
      }
    }
  }

  private validateTemplates(
    table: EquipmentConfigTable,
    affixes: ReadonlyMap<string, AffixConfig>,
    errors: string[],
  ): void {
    const ids = new Set<string>();
    const slots = new Set<EquipmentSlot>();
    for (const template of table.templates) {
      if (!/^equipment_[a-z0-9_]+$/.test(template.id)) {
        errors.push(`Invalid equipment template id: ${template.id}.`);
      } else if (ids.has(template.id)) {
        errors.push(`Duplicate equipment template id: ${template.id}.`);
      }
      ids.add(template.id);
      if (slots.has(template.slot)) {
        errors.push(`Duplicate equipment slot template: ${template.slot}.`);
      }
      slots.add(template.slot);

      if (template.mainStatType !== EQUIPMENT_SLOT_MAIN_STATS[template.slot]) {
        errors.push(`Template ${template.id} has an invalid main stat for ${template.slot}.`);
      }
      const expectedValueKind = template.mainStatType === 'attack-flat' ? 'flat' : 'percent';
      if (template.mainStatValueKind !== expectedValueKind) {
        errors.push(`Template ${template.id} has an invalid main stat value kind.`);
      }
      if (template.baseMainStat <= 0 || template.mainStatPerLevel <= 0) {
        errors.push(`Template ${template.id} main stat growth must be positive.`);
      }
      if (new Set(template.affixIds).size !== template.affixIds.length) {
        errors.push(`Template ${template.id} contains duplicate affix references.`);
      }
      for (const affixId of template.affixIds) {
        const affix = affixes.get(affixId);
        if (affix === undefined) {
          errors.push(`Template ${template.id} references unknown affix ${affixId}.`);
        } else if (!affix.allowedSlots.includes(template.slot)) {
          errors.push(`Affix ${affixId} is not allowed on ${template.slot}.`);
        }
      }
    }
    for (const slot of EXPECTED_SLOTS) {
      if (!slots.has(slot)) {
        errors.push(`Missing equipment template for slot ${slot}.`);
      }
    }
  }
}

export function validateDefaultEquipmentConfig(): readonly string[] {
  return new EquipmentConfigValidator().validate(EQUIPMENT_CONFIG);
}
