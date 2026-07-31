export interface DamageInput {
  readonly attack: number;
  readonly multiplier?: number;
  readonly bonusMultiplier?: number;
  readonly criticalChance?: number;
  readonly criticalDamage?: number;
}

export interface DamageResult {
  readonly amount: number;
  readonly isCritical: boolean;
}

export type RandomSource = () => number;

export class DamageCalculator {
  public constructor(private readonly random: RandomSource = Math.random) {}

  public calculate(input: DamageInput): DamageResult {
    const attack = Math.max(0, input.attack);
    const multiplier = Math.max(0, input.multiplier ?? 1);
    const bonusMultiplier = Math.max(0, input.bonusMultiplier ?? 1);
    const criticalChance = this.clamp(input.criticalChance ?? 0, 0, 1);
    const criticalDamage = Math.max(1, input.criticalDamage ?? 1.5);
    const isCritical = this.random() < criticalChance;
    const criticalMultiplier = isCritical ? criticalDamage : 1;

    return {
      amount: Math.max(1, Math.floor(attack * multiplier * bonusMultiplier * criticalMultiplier)),
      isCritical,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
