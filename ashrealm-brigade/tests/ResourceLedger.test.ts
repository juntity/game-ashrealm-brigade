import { describe, expect, it } from 'vitest';
import {
  MAX_RESOURCE_LEDGER_ENTRIES,
  ResourceLedger,
} from '../assets/scripts/modules/economy/ResourceLedger';
import { PlayerSave } from '../assets/scripts/save/SaveData';

describe('ResourceLedger', () => {
  it('records gains and costs with resulting balances', () => {
    const ledger = new ResourceLedger({ nextSequence: 1, entries: [] });

    ledger.recordChanges(
      player(10, 5),
      player(25, 2),
      {
        gold: 'battle-kill',
        equipmentEssence: 'equipment-star',
      },
      1_000,
    );

    expect(ledger.toSave()).toEqual({
      nextSequence: 3,
      entries: [
        {
          sequence: 1,
          timestamp: 1_000,
          resource: 'gold',
          amount: 15,
          balanceAfter: 25,
          sourceId: 'battle-kill',
        },
        {
          sequence: 2,
          timestamp: 1_000,
          resource: 'equipment-essence',
          amount: -3,
          balanceAfter: 2,
          sourceId: 'equipment-star',
        },
      ],
    });
  });

  it('rejects negative balances and missing sources', () => {
    const ledger = new ResourceLedger({ nextSequence: 1, entries: [] });

    expect(() =>
      ledger.recordChanges(player(0, 0), player(-1, 0), { gold: 'hero-upgrade' }, 1),
    ).toThrow('must not be negative');
    expect(() => ledger.recordChanges(player(0, 0), player(1, 0), {}, 1)).toThrow(
      'Missing ledger source',
    );
  });

  it('retains only the latest bounded audit entries', () => {
    const ledger = new ResourceLedger({ nextSequence: 1, entries: [] });
    let balance = 0;
    for (let index = 0; index < MAX_RESOURCE_LEDGER_ENTRIES + 5; index += 1) {
      ledger.recordChanges(
        player(balance, 0),
        player(balance + 1, 0),
        { gold: 'battle-kill' },
        index,
      );
      balance += 1;
    }

    expect(ledger.toSave().entries).toHaveLength(MAX_RESOURCE_LEDGER_ENTRIES);
    expect(ledger.toSave().entries[0].sequence).toBe(6);
  });
});

function player(gold: number, equipmentEssence: number): PlayerSave {
  return { gold, diamonds: 0, equipmentEssence };
}
