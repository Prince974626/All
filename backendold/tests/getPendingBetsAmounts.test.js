import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getPendingBetsAmounts } from '../controllers/betController.js';
import betModel from '../models/betModel.js';
import betHistoryModel from '../models/betHistoryModel.js';

vi.mock('../models/betModel.js');
vi.mock('../models/betHistoryModel.js');
vi.mock('../models/subAdminModel.js');
vi.mock('../models/transtionHistoryModel.js');
vi.mock('../models/ResultLogModel.js');
vi.mock('axios');

describe('getPendingBetsAmounts - ab3/ab4 roundId match starting 13 characters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should match starting 13 characters of roundId for gameId ab3', async () => {
    const req = {
      id: 'user_123',
      query: {
        gameId: 'ab3',
        roundId: '174250902211301',
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    betModel.find = vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue([]),
    });

    await getPendingBetsAmounts(req, res);

    expect(betModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'ab3',
        $or: [
          expect.any(Object),
          expect.objectContaining({
            betType: 'casino',
            roundId: expect.objectContaining({
              $regex: '^1742509022113',
            }),
          }),
        ],
      })
    );
  });

  test('should match starting 13 characters of roundId for gameId ab4 (case-insensitive)', async () => {
    const req = {
      id: 'user_123',
      query: {
        gameId: 'AB4',
        roundId: '174250902211399',
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    betModel.find = vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue([]),
    });

    await getPendingBetsAmounts(req, res);

    expect(betModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'AB4',
        $or: [
          expect.any(Object),
          expect.objectContaining({
            betType: 'casino',
            roundId: expect.objectContaining({
              $regex: '^1742509022113',
            }),
          }),
        ],
      })
    );
  });

  test('should match exact roundId for other gameIds', async () => {
    const req = {
      id: 'user_123',
      query: {
        gameId: 'other_casino',
        roundId: '174250902211301',
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    betModel.find = vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue([]),
    });

    await getPendingBetsAmounts(req, res);

    expect(betModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'other_casino',
        $or: [
          expect.any(Object),
          expect.objectContaining({
            betType: 'casino',
            roundId: '174250902211301',
          }),
        ],
      })
    );
  });

  test('should match all casino bets when roundId is not provided', async () => {
    const req = {
      id: 'user_123',
      query: {
        gameId: 'ab3',
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    betModel.find = vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue([]),
    });

    await getPendingBetsAmounts(req, res);

    expect(betModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'ab3',
        $or: [
          expect.any(Object),
          expect.objectContaining({
            betType: 'casino',
          }),
        ],
      })
    );
  });
});
