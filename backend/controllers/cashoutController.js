import betHistoryModel from '../models/betHistoryModel.js';
import betModel from '../models/betModel.js';
import SubAdmin from '../models/subAdminModel.js';
import {
  cachedData,
  sendBalanceUpdates,
  sendExposureUpdates,
  sendOpenBetsUpdates,
} from '../socket/bettingSocket.js';
import {
  calculateCashoutValue,
  calculateHedgeQuote,
  isBookmakerGameType,
  isCashoutEligible,
} from '../utils/cashoutUtils.js';

const PER_TEAM_MARKET_TYPES = [
  'Match Odds',
  'Winner',
  'Tied Match',
  'OVER_UNDER_05',
  'OVER_UNDER_15',
  'OVER_UNDER_25',
  'OVER_UNDER_35',
];
import { calculateAllExposure } from '../utils/exposureUtils.js';
import { updateAllUplines } from './admin/subAdminController.js';

//Helper function to extract best lay bet
export function getBestOddsForTeam(gameId, gameName, teamName) {
  let apitype = 'cricket';
  const lower = gameName?.toLowerCase() || '';
  if (lower.includes('tennis')) apitype = 'tennis';
  else if (lower.includes('soccer')) apitype = 'soccer';
  else if (lower.includes('horse')) apitype = 'horse-racing';

  const cacheKey = `${gameId}_${apitype}`;
  const cached = cachedData[cacheKey];

  if (!cached || !cached.data) {
    return { bestLay: null, bestBack: null };
  }

  const markets = Array.isArray(cached.data)
    ? cached.data
    : cached.data.data || cached.data;

  if (!Array.isArray(markets)) return { bestLay: null, bestBack: null };

  const teamLower = teamName.trim().toLowerCase();

  for (const market of markets) {
    if (!market.section || !Array.isArray(market.section)) continue;

    for (const runner of market.section) {
      const runnerName = (runner.nat || '').trim().toLowerCase();
      if (runnerName !== teamLower) continue;

      const odds = runner.odds;
      if (!Array.isArray(odds) || odds.length < 4) continue;
      const bestBack = odds[2]?.odds ? parseFloat(odds[2].odds) : null;
      const bestLay = odds[3]?.odds ? parseFloat(odds[3].odds) : null;

      // Only return valid odds (> 0)
      return {
        bestLay: bestLay && bestLay > 0 ? bestLay : null,
        bestBack: bestBack && bestBack > 0 ? bestBack : null,
      };
    }
  }

  return { bestLay: null, bestBack: null };
}

function getCachedMarkets(gameId, gameName) {
  let apitype = 'cricket';
  const lower = gameName?.toLowerCase() || '';
  if (lower.includes('tennis')) apitype = 'tennis';
  else if (lower.includes('soccer')) apitype = 'soccer';
  else if (lower.includes('horse')) apitype = 'horse-racing';

  const cacheKey = `${gameId}_${apitype}`;
  const cached = cachedData[cacheKey];
  if (!cached?.data) return [];

  const markets = Array.isArray(cached.data)
    ? cached.data
    : cached.data.data || cached.data;

  return Array.isArray(markets) ? markets : [];
}

function pickPrimaryOdd(oddsArr, otype) {
  if (!Array.isArray(oddsArr)) return null;
  const filtered = oddsArr.filter(
    (o) => o?.otype === otype && parseFloat(o?.odds) > 0
  );
  if (!filtered.length) return null;
  const primary =
    filtered.find((o) => o.tno === 0) ||
    (otype === 'back' ? filtered[filtered.length - 1] : filtered[0]);
  return parseFloat(primary.odds);
}

function resolveTeamOdds(gameId, gameName, teamName, gameType, teamOdds) {
  const fromClient = teamOdds?.find(
    (entry) =>
      entry?.team?.toLowerCase().trim() === teamName?.toLowerCase().trim()
  );
  if (fromClient && (fromClient.bestBack || fromClient.bestLay)) {
    return {
      bestBack: fromClient.bestBack ?? null,
      bestLay: fromClient.bestLay ?? null,
    };
  }
  return getMarketOddsForTeam(gameId, gameName, teamName, gameType);
}

/** Match Odds / Bookmaker odds from the correct market in live cache */
export function getMarketOddsForTeam(
  gameId,
  gameName,
  teamName,
  gameType
) {
  const markets = getCachedMarkets(gameId, gameName);
  const teamLower = teamName.trim().toLowerCase();
  const isBookmaker = isBookmakerGameType(gameType);

  for (const market of markets) {
    const mname = (market.mname || '').toUpperCase();
    if (isBookmaker) {
      if (mname !== 'BOOKMAKER' && mname !== 'BOOKMAKER IPL CUP') continue;
    } else if (
      gameType === 'Match Odds' ||
      gameType === 'MATCH_ODDS' ||
      gameType === 'Winner'
    ) {
      if (mname !== 'MATCH_ODDS' && mname !== 'TOURNAMENT_WINNER') continue;
    } else if (gameType === 'Tied Match') {
      if (mname !== 'TIED_MATCH') continue;
    } else {
      continue;
    }

    if (!market.section || !Array.isArray(market.section)) continue;

    for (const runner of market.section) {
      const runnerName = (runner.nat || '').trim().toLowerCase();
      if (runnerName !== teamLower) continue;

      if (isBookmaker) {
        const bestBack = pickPrimaryOdd(runner.odds, 'back');
        const bestLay = pickPrimaryOdd(runner.odds, 'lay');
        return { bestBack, bestLay };
      }

      const odds = runner.odds;
      if (!Array.isArray(odds) || odds.length < 4) continue;
      const bestBack = odds[2]?.odds ? parseFloat(odds[2].odds) : null;
      const bestLay = odds[3]?.odds ? parseFloat(odds[3].odds) : null;
      return {
        bestBack: bestBack && bestBack > 0 ? bestBack : null,
        bestLay: bestLay && bestLay > 0 ? bestLay : null,
      };
    }
  }

  return { bestBack: null, bestLay: null };
}

async function loadOpenMarketBets(userId, gameId, gameType) {
  // Include previous cashout-hedge bets: they are real, open positions and must
  // be counted so a second cashout sees the actual (already partly hedged) net
  // position instead of the original un-hedged exposure.
  const modelBets = await betModel
    .find({
      userId,
      gameId,
      gameType,
      status: 0,
      isCashedOut: { $ne: true },
    })
    .lean();

  if (PER_TEAM_MARKET_TYPES.includes(gameType)) {
    const historyBets = await betHistoryModel
      .find({
        userId,
        gameId,
        gameType,
        status: 0,
      })
      .lean();
    if (historyBets.length > 0) return historyBets;
  }

  return modelBets;
}

export const getCashoutHedgeQuote = async (req, res) => {
  try {
    const { gameId, gameType, gameName, teams, teamOdds } = req.body;
    const userId = req.id;

    if (!gameId || !gameType || !Array.isArray(teams) || teams.length < 2) {
      return res.status(400).json({
        cashoutAvailable: false,
        message: 'gameId, gameType and teams (2) are required',
      });
    }

    const openBets = await loadOpenMarketBets(userId, gameId, gameType);
    if (!openBets.length) {
      return res.json({
        cashoutAvailable: false,
        message: 'No open bets in this market',
      });
    }

    const eligible = openBets.some((b) => isCashoutEligible(b));
    if (!eligible) {
      return res.json({
        cashoutAvailable: false,
        message: 'Cashout not available for this market',
      });
    }

    const [teamA, teamB] = teams;
    const oddsA = resolveTeamOdds(
      gameId,
      gameName || 'Cricket Game',
      teamA,
      gameType,
      teamOdds
    );
    const oddsB = resolveTeamOdds(
      gameId,
      gameName || 'Cricket Game',
      teamB,
      gameType,
      teamOdds
    );

    const quote = calculateHedgeQuote(
      openBets,
      gameType,
      teamA,
      teamB,
      oddsA,
      oddsB
    );

    if (!quote || quote.hedgeOtype === null) {
      if (quote?.lockedPL !== undefined && !quote.hedgeOtype) {
        return res.json({
          cashoutAvailable: true,
          alreadyBalanced: true,
          lockedPL: quote.lockedPL,
          outcomeA: quote.outcomeA,
          outcomeB: quote.outcomeB,
        });
      }
      return res.json({
        cashoutAvailable: false,
        message: 'Cannot calculate hedge — no liquidity',
      });
    }

    const hedgeOdds = quote.hedgeOdds;
    const minOdds = isBookmakerGameType(gameType) ? 1 : 1.01;
    if (!hedgeOdds || hedgeOdds < minOdds) {
      return res.json({
        cashoutAvailable: false,
        message: 'No liquidity available',
      });
    }

    const primaryBet = openBets[0];

    return res.json({
      cashoutAvailable: true,
      hedgeOtype: quote.hedgeOtype,
      hedgeTeam: quote.hedgeTeam,
      hedgeOdds: quote.hedgeOdds,
      hedgeStake: quote.hedgeStake,
      lockedPL: quote.lockedPL,
      outcomeA: quote.outcomeA,
      outcomeB: quote.outcomeB,
      hedgedBetId: primaryBet._id?.toString(),
      gameType,
      marketName: primaryBet.marketName,
    });
  } catch (error) {
    console.error('Cashout hedge quote error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getCashoutQuote = async (req, res) => {
  try {
    const { betId } = req.body;
    const userId = req.id;

    if (!betId) {
      return res.status(400).json({ message: 'betId is required' });
    }

    const bet = await betModel.findOne({ _id: betId, userId, status: 0 });
    if (!bet) {
      return res
        .status(404)
        .json({ message: 'Bet not found or already settled' });
    }

    if (!isCashoutEligible(bet)) {
      return res.status(400).json({
        cashoutAvailable: false,
        message: 'Cashout not available for this bet type',
      });
    }

    const { bestLay, bestBack } = getBestOddsForTeam(
      bet.gameId,
      bet.gameName,
      bet.teamName
    );

    if (!bestLay || bestLay < 1.01) {
      return res.json({
        cashoutAvailable: false,
        message: 'No liquidity available',
      });
    }
    const cashoutValue = calculateCashoutValue([bet], bestLay, bestBack);

    if (cashoutValue === null) {
      return res.json({
        cashoutAvailable: false,
        message: 'Cannot calculate cashout',
      });
    }

    return res.json({
      cashoutAvailable: true,
      betId: bet._id.toString(),
      cashoutValue,
      currentOdds: bestLay,
    });
  } catch (error) {
    console.error('Cashout quote error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const executeCashout = async (req, res) => {
  try {
    const { betId } = req.body;
    const userId = req.id;

    if (!betId) {
      return res.status(400).json({ message: 'betId is required' });
    }

    // 1. Load the bet (must be open and not already cashed out)
    const bet = await betModel.findOne({
      _id: betId,
      userId,
      status: 0,
      isCashedOut: { $ne: true },
    });
    if (!bet) {
      return res
        .status(400)
        .json({ message: 'Bet already settled/cashed out or not found' });
    }

    if (!isCashoutEligible(bet)) {
      return res
        .status(400)
        .json({ message: 'Cashout not available for this bet' });
    }

    // 2. Get current live odds
    const { bestLay, bestBack } = getBestOddsForTeam(
      bet.gameId,
      bet.gameName,
      bet.teamName
    );

    // 3. Calculate cashout value (net guaranteed P/L)
    const cashoutValue = calculateCashoutValue([bet], bestLay, bestBack);
    if (cashoutValue === null) {
      return res
        .status(400)
        .json({ message: 'Cannot calculate cashout. No liquidity.' });
    }

    // 4. Mark bet as cashed out — status stays 0 (still pending/open)
    //    Settlement cron will use cashoutValue for P/L instead of match result
    const claimedBet = await betModel.findOneAndUpdate(
      { _id: betId, status: 0, isCashedOut: { $ne: true } },
      {
        $set: {
          isCashedOut: true,
          cashoutValue: cashoutValue,
          settledBy: 'cashout',
          settledAt: new Date(),
        },
      },
      { new: true }
    );

    if (!claimedBet) {
      return res
        .status(400)
        .json({ message: 'Bet already cashed out by another process' });
    }

    // 5. Recalculate exposure — cashed-out bets with negative cashoutValue
    //    contribute |cashoutValue| as exposure; positive cashout = 0 exposure
    //    Balance and bettingProfitLoss are NOT touched here — P/L is applied at settlement
    const allOpenBets = await betModel.find({
      userId,
      status: 0,
    });
    const newExposure = calculateAllExposure(allOpenBets);

    // 6. Update user exposure and avbalance
    const updatedUser = await SubAdmin.findByIdAndUpdate(
      userId,
      [
        {
          $set: {
            exposure: newExposure,
            avbalance: { $subtract: ['$balance', newExposure] },
          },
        },
      ],
      { new: true }
    );

    // 7. Push WebSocket updates
    sendBalanceUpdates(userId, updatedUser.avbalance);
    sendExposureUpdates(userId, newExposure);
    sendOpenBetsUpdates(userId, null);

    // 8. Update upline balances
    await updateAllUplines([userId]);

    console.log(
      `[CASHOUT] Bet ${betId} cashed out: value=${cashoutValue}, newBalance=${updatedUser.avbalance}, newExposure=${newExposure}`
    );

    return res.json({
      success: true,
      cashoutValue,
      newBalance: updatedUser.avbalance,
      newExposure,
      message: `Cashout successful: locked ₹${cashoutValue}`,
    });
  } catch (error) {
    console.error('Cashout execution error:', error);
    return res.status(500).json({ message: 'Server error during cashout' });
  }
};
