import { describe, expect, it } from 'vitest';

import {
  resolveSportsWinner,
  settleSportsBet,
} from '../services/sportsSettlementService.js';

describe('Tied Match settlement', () => {
  it('maps provider result 0 to No', () => {
    expect(resolveSportsWinner('0', 'Tied Match', 'Tied Match')).toBe('No');
    expect(resolveSportsWinner('1', 'Tied Match', 'TIED_MATCH')).toBe('Yes');
  });

  it('LAY on No loses when result is 0 (match not tied)', async () => {
    const bet = {
      teamName: 'NO',
      otype: 'lay',
      price: 125,
      betAmount: 100,
      gameType: 'Tied Match',
      marketName: 'Tied Match',
    };
    const result = await settleSportsBet(bet, {}, 'No');
    expect(result.success).toBe(true);
    expect(result.betUpdates.status).toBe(2); // loss
  });

  it('LAY on No wins when result is 1 (match tied)', async () => {
    const bet = {
      teamName: 'NO',
      otype: 'lay',
      price: 125,
      betAmount: 100,
      gameType: 'Tied Match',
      marketName: 'Tied Match',
    };
    const result = await settleSportsBet(bet, {}, 'Yes');
    expect(result.success).toBe(true);
    expect(result.betUpdates.status).toBe(1); // win
  });

  it('BACK on No wins when result is 0 (match not tied)', async () => {
    const bet = {
      teamName: 'NO',
      otype: 'back',
      price: 100,
      betAmount: 125,
      gameType: 'Tied Match',
      marketName: 'Tied Match',
    };
    const result = await settleSportsBet(bet, {}, 'No');
    expect(result.success).toBe(true);
    expect(result.betUpdates.status).toBe(1); // win
  });
});
