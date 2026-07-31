import { MAIN_HERO_CONFIG } from '../../config/HeroConfig';
import { EquipmentStats } from './EquipmentInventory';

export interface EquipmentCombatResult {
  readonly mainAttack: number;
  readonly totalDps: number;
  readonly autoAttackDamage: number;
  readonly autoAttackIntervalSeconds: number;
}

export class EquipmentCombatCalculator {
  public calculate(
    baseMainAttack: number,
    baseTotalDps: number,
    stats: EquipmentStats,
    isBoss: boolean,
    baseAutoAttackIntervalSeconds: number,
    maxAttackSpeedBonus: number,
  ): EquipmentCombatResult {
    const attackMultiplier = 1 + stats['attack-multiplier'];
    const attackSpeedMultiplier = 1 + Math.min(maxAttackSpeedBonus, stats['attack-speed']);
    const bossMultiplier = isBoss ? 1 + stats['boss-damage'] : 1;
    const baseCriticalMultiplier =
      1 + MAIN_HERO_CONFIG.criticalRate * (MAIN_HERO_CONFIG.criticalDamage - 1);
    const criticalRate = Math.min(1, MAIN_HERO_CONFIG.criticalRate + stats['critical-rate']);
    const criticalDamage = MAIN_HERO_CONFIG.criticalDamage + stats['critical-damage'];
    const criticalMultiplier = 1 + criticalRate * (criticalDamage - 1);
    const criticalRatio = criticalMultiplier / baseCriticalMultiplier;

    const autoAttackDamage =
      (baseTotalDps + stats['attack-flat']) *
      attackMultiplier *
      criticalRatio *
      bossMultiplier *
      baseAutoAttackIntervalSeconds;
    const autoAttackIntervalSeconds = baseAutoAttackIntervalSeconds / attackSpeedMultiplier;
    return {
      mainAttack: (baseMainAttack + stats['attack-flat']) * attackMultiplier * bossMultiplier,
      totalDps: autoAttackDamage / autoAttackIntervalSeconds,
      autoAttackDamage,
      autoAttackIntervalSeconds,
    };
  }
}
