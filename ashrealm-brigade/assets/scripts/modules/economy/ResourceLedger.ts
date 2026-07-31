import { PlayerSave, ResourceLedgerSave, ResourceTransactionSave } from '../../save/SaveData';

export type LedgerResource = 'gold' | 'equipment-essence';
export type ResourceSourceId =
  | 'battle-kill'
  | 'offline-reward'
  | 'task-reward'
  | 'hero-upgrade'
  | 'equipment-enhance'
  | 'equipment-star'
  | 'equipment-sell'
  | 'equipment-salvage';

export interface ResourceChangeSources {
  readonly gold?: ResourceSourceId;
  readonly equipmentEssence?: ResourceSourceId;
}

export const MAX_RESOURCE_LEDGER_ENTRIES = 100;
export const RESOURCE_SOURCE_IDS: readonly ResourceSourceId[] = [
  'battle-kill',
  'offline-reward',
  'task-reward',
  'hero-upgrade',
  'equipment-enhance',
  'equipment-star',
  'equipment-sell',
  'equipment-salvage',
];

export class ResourceLedger {
  private save: ResourceLedgerSave;

  public constructor(save: ResourceLedgerSave) {
    this.save = {
      nextSequence: save.nextSequence,
      entries: save.entries.map((entry) => ({ ...entry })),
    };
  }

  public recordChanges(
    before: PlayerSave,
    after: PlayerSave,
    sources: ResourceChangeSources,
    timestamp: number,
  ): readonly ResourceTransactionSave[] {
    if (after.gold < 0 || after.equipmentEssence < 0) {
      throw new Error('Resource balances must not be negative.');
    }
    const recorded: ResourceTransactionSave[] = [];
    this.record('gold', after.gold - before.gold, after.gold, sources.gold, timestamp, recorded);
    this.record(
      'equipment-essence',
      after.equipmentEssence - before.equipmentEssence,
      after.equipmentEssence,
      sources.equipmentEssence,
      timestamp,
      recorded,
    );
    return recorded;
  }

  public toSave(): ResourceLedgerSave {
    return {
      nextSequence: this.save.nextSequence,
      entries: this.save.entries.map((entry) => ({ ...entry })),
    };
  }

  private record(
    resource: LedgerResource,
    amount: number,
    balanceAfter: number,
    sourceId: ResourceSourceId | undefined,
    timestamp: number,
    recorded: ResourceTransactionSave[],
  ): void {
    if (amount === 0) {
      return;
    }
    if (sourceId === undefined) {
      throw new Error(`Missing ledger source for ${resource} change.`);
    }
    const entry: ResourceTransactionSave = {
      sequence: this.save.nextSequence,
      timestamp,
      resource,
      amount,
      balanceAfter,
      sourceId,
    };
    this.save = {
      nextSequence: this.save.nextSequence + 1,
      entries: [...this.save.entries, entry].slice(-MAX_RESOURCE_LEDGER_ENTRIES),
    };
    recorded.push({ ...entry });
  }
}
