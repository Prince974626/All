import axios from 'axios';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;
const RESULT_API_URL = process.env.RESULT_API_URL;

import {
  fetchCasinoDetailResult as apiFetchCasinoDetailResult,
  fetchCasinoResult as apiFetchCasinoResult,
  fetchCricketFancyByEvent as apiFetchCricketFancyByEvent,
  fetchCricketFancyResult as apiFetchCricketFancyResult,
  fetchMatchList as apiFetchMatchList,
  getProviderName,
  getResult as apiGetResult,
  sendBetIncoming as apiSendBetIncoming,
} from '../services/matchApi/index.js';

dotenv.config();

const MARKET_NAME_TO_API = {
  'Match Odds': 'MATCH_ODDS',
  'Tied Match': 'TIED_MATCH',
};
const toApiMarketName = (name) => MARKET_NAME_TO_API[name] || name;

import betHistoryModel from '../models/betHistoryModel.js';
import betModel from '../models/betModel.js';
import SubAdmin from '../models/subAdminModel.js';
import TransactionHistory from '../models/transtionHistoryModel.js';
import CasinoBetHistory from '../models/casinoBetHistory.model.js';
import {
  assignStatementRowClosings,
  betActivityDateExpr,
  buildCasinoUserMatch,
  casinoActivityDateExpr,
  compareStatementRowsChrono,
  expandGameReportRows,
  formatMarketBetForModal,
  formatSettlementDescription,
  formatSettlementFromTo,
  getAllDownlineMemberIds,
  getLedgerBalanceAtTimestamp,
  normalizeUserIdsForQuery,
  parseGameReportDescription,
  resolvePassbookSummaryOpening,
  sortStatementRowsNewestFirst,
  txnActivityDateExpr,
} from '../utils/accountStatementUtils.js';
import { getDateRangeUTC } from '../utils/dateUtils.js';
import { isCasinoGame } from './casinoController.js';
const { updateAllUplines } = await import('./admin/subAdminController.js');
import {
  sendBalanceUpdates,
  sendExposureUpdates,
  sendOpenBetsUpdates,
} from '../socket/bettingSocket.js';
import { cachedData, clients } from '../socket/bettingSocket.js';
const sportsSettlementService =
  await import('../services/sportsSettlementService.js');
const fancyBetSettlementService =
  await import('../services/fancyBetSettlementService.js');
import {
  calculateAllExposure,
  calculateFancyExposure,
  FANCY_GAME_TYPES,
  validateFancyBetBalance,
} from '../utils/exposureUtils.js';
import { validateBetWithNewBetOffset } from '../utils/marketCalculationUtils.js';
// ─── SERVER-SIDE MARKET VALIDATION ───
// Imported from utils/marketValidation.js — always fetches fresh from API (fail-closed).
import {
  validateCasinoMarket as _validateCasinoMarket,
  validateFancyMarket as _validateFancyMarket,
  validateSportsMarket as _validateSportsMarket,
} from '../utils/marketValidation.js';
import { generateFancyLadder } from '../utils/masterBookUtils.js';

// Wrappers that pass cachedData and match the old call signatures
async function validateSportsMarket(
  gameId,
  gameName,
  marketName,
  teamName,
  xValue,
  otype,
  sid,
  oname,
  gameType
) {
  return _validateSportsMarket(cachedData, {
    gameId,
    gameName,
    marketName,
    teamName,
    xValue,
    otype,
    sid,
    oname,
    gameType,
  });
}

async function validateFancyMarket(
  gameId,
  gameName,
  marketName,
  teamName,
  xValue,
  otype,
  sid,
  fancyScore,
  oname
) {
  return _validateFancyMarket(cachedData, {
    gameId,
    gameName,
    marketName,
    teamName,
    xValue,
    otype,
    sid,
    fancyScore,
    oname,
  });
}

async function validateCasinoMarket(gameId, teamName, xValue, otype) {
  return _validateCasinoMarket(cachedData, { gameId, teamName, xValue, otype });
}

//  DOUBLE SETTLEMENT FIX: Processing lock to prevent concurrent executions
let isProcessingCasinoBets = false;

// ==========to add log file for the reporting ===============
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// logs folder path
const logDir = path.join(__dirname, '../logs');
// file to chnage the file of storage
const logFile = path.join(logDir, 'lucky7-debug_2.log');

// create logs folder automatically
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// logger function
// function to store
function lucky7Logger(title, data) {
  const time = new Date().toISOString();

  const logEntry = `
==============================
${time}
${title}
${JSON.stringify(data, null, 2)}
==============================
`;

  fs.appendFileSync(logFile, logEntry);
}
const normalizeLucky7 = (value) => {
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
};

// ==========to add log file for the reporting ===============

export const placeBetUnified = async (req, res) => {
  try {
    const {
      // Common fields for both sports and casino
      gameId,
      cid,
      gid,
      tabno,
      gmid, // casino game ID (same as gameId for casino)
      gname, // casino game name
    } = req.body;

    // Determine if this is a casino or sports bet
    const isCasino =
      isCasinoGame(gameId, cid, gid, tabno) ||
      (gmid && gname) ||
      req.body.betType === 'casino';

    if (isCasino) {
      return await placeCasinoBet(req, res);
    } else {
      return await placeBet(req, res);
    }
  } catch (error) {
    console.error('Error in unified bet placement:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};
export const getExposureDetails = async (req, res) => {
  try {
    const { id } = req;
    const user = await SubAdmin.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Group by MARKET + EVENT using betHistoryModel
    const marketDetails = await betHistoryModel.aggregate([
      {
        $match: {
          userId: id,
          status: 0,
        },
      },
      {
        $group: {
          _id: {
            marketName: '$marketName',
            eventName: '$eventName',
            eventId: '$eventId',
            gameId: '$gameId',
            sportId: '$sid',
            sportName: '$gameName',
          },
          betCounts: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          marketName: '$_id.marketName',
          eventName: '$_id.eventName',
          eventId: '$_id.eventId',
          gameId: '$_id.gameId',
          sportId: '$_id.sportId',
          sportName: '$_id.sportName',
          betCounts: 1,
        },
      },
      {
        $sort: { betCounts: -1 },
      },
    ]);

    return res.status(200).json({
      data: marketDetails,
      meta: {
        message: 'Exposure List.',
        status_code: 200,
        status: true,
      },
    });
  } catch (error) {
    console.error('Error in getExposureDetails:', error);
    return res.status(500).json({
      meta: {
        message: 'Server error',
        status_code: 500,
        status: false,
      },
      error: error.message,
    });
  }
};
const placeCasinoBet = async (req, res) => {
  const { id } = req;

  try {
    const {
      gameId,
      price,
      xValue,
      teamName,
      otype,
      fancyScore,
      roundId,
      gname,
      cid = 4,
      gid = 35,
      tabno = 6,
      subtype,
      min,
      max,
    } = req.body;

    if (
      !gameId ||
      !price ||
      !xValue ||
      !teamName ||
      !otype ||
      !roundId ||
      !gname
    ) {
      return res
        .status(400)
        .json({ message: 'All required casino fields must be provided' });
    }

    // if (!["Player A", "Player B"].includes(teamName)) {
    //   return res
    //     .status(400)
    //     .json({ message: "Casino team must be 'PLAYER A' or 'PLAYER B'" });
    // }
    //Instead of this we will use dynamically

    if (!['back', 'lay'].includes(otype)) {
      return res
        .status(400)
        .json({ message: "Bet type must be 'back' or 'lay'" });
    }

    // Server-side market validation: check suspend status against live data
    const casinoCheck = await validateCasinoMarket(
      gameId,
      teamName,
      xValue,
      otype
    );
    if (!casinoCheck.valid) {
      console.warn(
        `[BET REJECTED] Casino: gameId=${gameId} roundId=${roundId} team=${teamName} reason="${casinoCheck.reason}"`
      );
      return res.status(400).json({ message: casinoCheck.reason });
    }

    const user = await SubAdmin.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if Casino is locked for this user
    const casinoLockEntry = user.gamelock?.find(
      (g) => g.game.toLowerCase() === 'casino'
    );
    if (casinoLockEntry && casinoLockEntry.lock === false) {
      return res
        .status(403)
        .json({ message: 'Casino betting is locked for your account' });
    }

    if (
      [
        'lucky7',
        'lucky7eu',
        'lucky7eu2',
        'lucky5',
        'lucky15',
        'ballbyball',
        'baccarat',
        'baccarat2',
        'teensin',
        'poker6',
        'poker',
        'poker20',
        'abj',
        'poison',
        '3cardj',
        'ab4',
        'ab3',
        'card32',
        'card32eu',
        'dt202',
        'dt20',
        'dtl20',
        'dt6',
        'roulette11',
        'roulette12',
        'roulette13',
        'ourroullete',
        'teen20',
        'teen20b',
        'teen20c',
        'joker20',
        'teenmuf',
        'teen41',
        'teen42',
      ].includes(gameId?.toLowerCase())
    ) {
      return await placeLucky7Bet(req, res, user);
    }

    // Market ID logic
    const uniqueKey = {
      gameId,
      roundId,
      marketName: 'WINNER',
      userId: id,
      status: 0,
    };
    const existingExact = await betModel.findOne(uniqueKey);

    let market_id;
    if (existingExact) {
      market_id = existingExact.market_id;
    } else {
      market_id = `casino_${gameId}_${Date.now()}_${Math.floor(
        1000 + Math.random() * 9000
      )}`;
    }

    // Calculate bet amounts with validation
    let p = parseFloat(price);
    const originalStake = p; // Save original stake before modification for LAY bets
    let x = Number(parseFloat(xValue).toFixed(2));
    let betAmount = 0;

    // Minimum / maximum bet validation (from market data when provided)
    const MINIMUM_BET = Number(min) > 0 ? Number(min) : 1;
    const MAXIMUM_BET = Number(max) > 0 ? Number(max) : 100000;
    if (p < MINIMUM_BET) {
      return res
        .status(400)
        .json({ message: `Minimum bet amount is ${MINIMUM_BET}` });
    }

    if (p > MAXIMUM_BET) {
      return res
        .status(400)
        .json({ message: `Maximum bet amount is ${MAXIMUM_BET}` });
    }

    // Odds validation
    if (x < 1.01 || x > 100) {
      return res.status(400).json({ message: 'Invalid odds range' });
    }

    // Casino calculation logic based on game type
    if (gameId.includes('roulette')) {
      betAmount = otype === 'lay' ? p : p * (x - 1);
      p = otype === 'lay' ? p * (x - 1) : p;
    } else if (gameId.includes('lucky7')) {
      betAmount = p * (x - 1);
    } else {
      // TeenPatti games (default)
      betAmount = otype === 'lay' ? p : p * (x - 1);
      p = otype === 'lay' ? p * (x - 1) : p;
    }

    betAmount = parseFloat(betAmount.toFixed(2));
    p = parseFloat(p.toFixed(2));

    // STEP 1: Check for existing casino bet FIRST (before balance check)
    // Exclude cashed-out bets — they are locked and must not be merged/offset
    const existingBet = await betModel.findOne({
      userId: id,
      roundId,
      gameId,
      marketName: 'WINNER',
      betType: 'casino',
      status: 0,
      isCashedOut: { $ne: true },
    });

    // STEP 2: Calculate effective available balance using scenario-based logic (all bets in this round)
    // Exclude cashed-out bets — their exposure is handled separately
    const marketBets = await betModel.find({
      userId: id,
      roundId,
      gameId,
      marketName: 'WINNER',
      status: 0,
      isCashedOut: { $ne: true },
    });

    // Calculate effective balance based on market position
    // Using new method that includes potential profit from the new bet itself
    const validation = validateBetWithNewBetOffset(
      user.avbalance,
      user.balance,
      marketBets,
      teamName,
      otype,
      originalStake,
      p, // liability (calculated p)
      betAmount // potential profit if bet wins
    );

    // STEP 3: Balance validation with effective available balance (includes new bet profit potential)
    if (!validation.allowed) {
      console.log(`\x1b[41m[CASINO REJECTED]\x1b[0m ${validation.reason}`);
      return res.status(400).json({
        message: 'Insufficient balance',
        debug: {
          reason: validation.reason,
          effectiveBalance: validation.effectiveBalance,
          requiredLiability: p,
          userAvbalance: user.avbalance,
          userBalance: user.balance,
          existingMarketBets: marketBets.length,
          breakdown: validation.breakdown,
        },
      });
    }

    // STEP 4: Exposure limit check using scenario-based simulation
    const pendingBets = await betModel.find({
      userId: id,
      status: 0,
    });
    const simulatedNewBet = {
      gameType: 'Casino',
      betType: 'casino',
      gameId,
      roundId,
      teamName,
      otype,
      betAmount,
      price: p,
    };
    const projectedExposure = calculateAllExposure([
      ...pendingBets,
      simulatedNewBet,
    ]);
    console.log('project exposure is: ', projectedExposure);
    if (projectedExposure > user.exposureLimit) {
      return res.status(400).json({ message: 'Exposure limit exceeded' });
    }

    let newBet = null;

    if (existingBet) {
      const originalPrice = existingBet.price || 0;
      const originalBetAmount = existingBet.betAmount || 0;

      if (teamName === existingBet.teamName) {
        // SAME TEAM scenarios

        if (otype === existingBet.otype) {
          // Same team1, same type1 - MERGE

          existingBet.price = parseFloat((originalPrice + p).toFixed(2));
          existingBet.xValue = parseFloat(
            (
              (Number(existingBet.xValue || 0) * originalPrice + x * p) /
              (originalPrice + p || 1)
            ).toFixed(2)
          );
          existingBet.betAmount += betAmount;
          existingBet.fancyScore = fancyScore || existingBet.fancyScore;
          existingBet.roundId = roundId || existingBet.roundId;

          // TASK14 FIX: Calculate correct avbalance deduction for guaranteed profit scenarios
          if (originalPrice < 0) {
            // Guaranteed profit position - only deduct the NET exposure increase
            // Old exposure was 0 (guaranteed profit), new exposure = MAX(0, newPrice)
            const newExposure = Math.max(0, existingBet.price);
            user.avbalance = parseFloat(
              (user.avbalance - newExposure).toFixed(2)
            );
          } else {
            // Normal merge - deduct liability amount
            // NOTE: Initial validation already passed using effective balance logic
            // No secondary balance check needed here - just deduct the liability
            user.avbalance = parseFloat((user.avbalance - p).toFixed(2));
          }
        } else {
          // Same team, opposite types - OFFSET (matching sports logic exactly)

          if (otype === 'back') {
            if (originalBetAmount >= p) {
              // Full offset
              existingBet.price = parseFloat(
                (originalPrice - betAmount).toFixed(2)
              );
              existingBet.betAmount = parseFloat(
                (originalBetAmount - p).toFixed(2)
              );
              //TODO:THIS IS THE WRONG LOGIC OF AVBALANCE
              user.avbalance = parseFloat(
                (user.avbalance + betAmount).toFixed(2)
              );
            } else {
              // Partial offset with type change
              existingBet.price = parseFloat(
                (p - originalBetAmount).toFixed(2)
              );
              existingBet.betAmount = parseFloat(
                (betAmount - originalPrice).toFixed(2)
              );
              existingBet.otype = otype;
              user.avbalance = parseFloat(
                (
                  user.avbalance +
                  originalPrice -
                  (p - originalBetAmount)
                ).toFixed(2)
              );
            }
          } else if (otype === 'lay') {
            if (originalPrice >= betAmount) {
              // Full offset
              existingBet.price = parseFloat(
                (originalPrice - betAmount).toFixed(2)
              );
              existingBet.betAmount = parseFloat(
                (originalBetAmount - p).toFixed(2)
              );
              //TOD
              // console.log(
              //   'The offeset is happening full offset back and then lay '
              // );
              user.skipExposureRecalculation = true;
              // user.avbalance=parseFloat((user.balance+existingBet.betAmount).toFixed(2))
              // Check if betAmount is positive (hedged position profit)
              if (existingBet.betAmount > 0) {
                // Hedged position: no exposure, available balance = total balance
                user.exposure = 0;
                user.avbalance = user.balance;
              } else {
                // Normal position: use existing logic
                user.avbalance = parseFloat(
                  (user.balance + existingBet.betAmount).toFixed(2)
                );
              }
            } else {
              // Partial offset with type change
              //TODO
              existingBet.price = parseFloat(
                (p - originalBetAmount).toFixed(2)
              );
              existingBet.betAmount = parseFloat(
                (betAmount - originalPrice).toFixed(2)
              );
              existingBet.otype = otype;
              console.log(
                'The offeset is happening partial offset back and then lay '
              );
              user.skipExposureRecalculation = true;

              user.avbalance = parseFloat(
                (
                  user.avbalance -
                  (p - originalBetAmount) -
                  originalPrice
                ).toFixed(2)
              );
            }
          }
          existingBet.xValue = x;
          existingBet.fancyScore = fancyScore || existingBet.fancyScore;
          existingBet.roundId = roundId || existingBet.roundId;
        }
      } else {
        // DIFFERENT TEAM scenarios
        // Lucky7: one doc per round → ADD (accumulate) to same doc; breakdown is in bet history
        if (gameId.includes('lucky7')) {
          existingBet.price = parseFloat((existingBet.price + p).toFixed(2));
          existingBet.betAmount = parseFloat(
            (existingBet.betAmount + betAmount).toFixed(2)
          );
          existingBet.xValue = parseFloat(
            (
              (Number(existingBet.xValue || 0) * originalPrice + x * p) /
              (originalPrice + p || 1)
            ).toFixed(2)
          );
          existingBet.fancyScore = fancyScore || existingBet.fancyScore;
          existingBet.roundId = roundId || existingBet.roundId;
          // Keep existing teamName (first selection); per-selection is in bet history
          user.avbalance = parseFloat((user.avbalance - p).toFixed(2));
        } else {
          // Teen Patti / other: matching sports logic (offset / switch / add)
          console.log(
            '\n\x1b[43m\x1b[30m ===== PROCESSING DIFFERENT TEAM ===== \x1b[0m'
          );

          if (otype === existingBet.otype) {
            if (originalPrice >= betAmount) {
              existingBet.price = parseFloat(
                (originalPrice - betAmount).toFixed(2)
              );
              existingBet.betAmount = parseFloat(
                (originalBetAmount - p).toFixed(2)
              );
              existingBet.xValue = x;
              existingBet.fancyScore = fancyScore || existingBet.fancyScore;
              existingBet.roundId = roundId || existingBet.roundId;
            } else {
              existingBet.price = parseFloat(
                (p - originalBetAmount).toFixed(2)
              );
              existingBet.betAmount = parseFloat(
                (betAmount - originalPrice).toFixed(2)
              );
              existingBet.teamName = teamName;
              existingBet.xValue = x;
              existingBet.fancyScore = fancyScore || existingBet.fancyScore;
              existingBet.roundId = roundId || existingBet.roundId;
            }
          } else {
            const originalPriceForAdd = existingBet.price;
            existingBet.price = parseFloat((existingBet.price + p).toFixed(2));
            existingBet.betAmount = parseFloat(
              (existingBet.betAmount + betAmount).toFixed(2)
            );
            existingBet.xValue = parseFloat(
              ((existingBet.xValue + x) / 2).toFixed(2)
            );
            if (originalPriceForAdd < 0) {
              const newExposure = Math.max(0, existingBet.price);
              user.avbalance = parseFloat(
                (user.avbalance - newExposure).toFixed(2)
              );
            } else {
              user.avbalance = parseFloat((user.avbalance - p).toFixed(2));
            }
            existingBet.teamName = teamName;
            existingBet.xValue = x;
            existingBet.fancyScore = fancyScore || existingBet.fancyScore;
            existingBet.roundId = roundId || existingBet.roundId;
            existingBet.otype = otype;
          }
        }
      }
    } else {
      // No existing bet - create new

      newBet = new betModel({
        userId: id,
        userName: user.userName,
        userRole: user.role,
        invite: user.invite,
        gameId,
        price: p,
        betAmount,
        otype,
        xValue: x,
        fancyScore,
        gameType: 'Casino',
        market_id,
        eventName: gname,
        marketName: 'WINNER',
        gameName: 'Casino',
        teamName,
        roundId,
        cid,
        gid,
        tabno,
        betType: 'casino',
        subtype,
      });
      console.log('New Bet is created', newBet);
      user.avbalance = parseFloat((user.avbalance - p).toFixed(2));
    }

    // Database operations
    const saveOperations = [];

    if (existingBet) {
      saveOperations.push(existingBet.save());
    }

    if (newBet) {
      saveOperations.push(newBet.save());
    }

    saveOperations.push(user.save());
    await Promise.all(saveOperations);

    //Recalculate exposure from updated bets
    if (!user.skipExposureRecalculation) {
      const updatedPendingBets = await betModel.find({
        userId: id,
        status: 0,
      });

      // Only apply casino exposure logic if there are casino bets
      // Don't override fancy betting exposure calculation
      const hasCasinoBets = updatedPendingBets.some(
        (b) => b.gameType === 'Casino'
      );

      if (hasCasinoBets) {
        // Use scenario-based exposure calculation
        user.exposure = calculateAllExposure(updatedPendingBets);
        user.avbalance = user.balance - user.exposure;
        console.log('The avbalance is', user.avbalance);

        // CRITICAL SAFETY CHECK: PTI must never be negative
        if (user.avbalance < 0) {
          console.error(`[CRITICAL PTI ERROR] Casino avbalance went negative!`);

          // Rollback by not saving - this is a critical error
          throw new Error(
            'Critical: PTI calculation error - casino bet rejected'
          );
        }
      } else {
        // Don't override fancy betting exposure calculation
        console.log(
          `[CASINO EXPOSURE] Skipped - no casino bets, preserving fancy exposure: ${user.exposure}`
        );
      }

      console.log(` [EXPOSURE DEBUG] Skipped for offset bet`);
    } else {
      console.log(` [EXPOSURE DEBUG] Recalculating exposure for offset bet`);
      user.skipExposureRecalculation = false; // Reset flag

      // Always recalculate exposure from pending bets using scenario-based logic
      const offsetPendingBets = await betModel.find({
        userId: id,
        status: 0,
      });
      user.exposure = calculateAllExposure(offsetPendingBets);
      user.avbalance = user.balance - user.exposure;

      // CRITICAL SAFETY CHECK: PTI must never be negative
      if (user.avbalance < 0) {
        console.error(
          `[CRITICAL PTI ERROR] Casino offset avbalance went negative!`
        );

        // Rollback by not saving - this is a critical error
        throw new Error(
          'Critical: PTI calculation error - casino bet rejected'
        );
      }
    }

    //Save user with updated exposure and available balance
    await user.save();
    //Send WebSocket Updates
    sendBalanceUpdates(user._id, user.avbalance);
    sendExposureUpdates(user._id, user.exposure);
    sendOpenBetsUpdates(user);

    // Update all upline balances asynchronously after bet placement (non-blocking)
    setImmediate(async () => {
      try {
        await updateAllUplines(user._id);
      } catch (err) {
        console.error(
          ` [CASINO BET] Error updating upline balances:`,
          err.message
        );
      }
    });

    // Record bet history for every bet placed (individual tracking)
    const betHistory = new betHistoryModel({
      betId: (newBet ? newBet._id : existingBet._id).toString(), // Link to parent bet for settlement
      userId: id,
      userName: user.userName,
      gameId,
      price: p,
      betAmount,
      otype,
      xValue: x,
      fancyScore,
      gameType: 'casino',
      eventName: gname,
      market_id,
      marketName: 'WINNER',
      gameName: 'Casino',
      teamName,
      roundId,
      cid,
      gid,
      tabno,
      betType: 'casino',
      subtype,
    });

    await betHistory.save();

    return res.status(201).json({
      message: 'Casino bet placed successfully',
    });
  } catch (error) {
    console.error('Error placing casino bet:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};
// const placeLucky7Bet = async (req, res, user) => {
//   const { id } = req;

//   // lucky7Logger("LUCKY7 gameType ", req);

//   const {
//     gameId,
//     price,
//     xValue,
//     teamName,
//     otype,
//     fancyScore,
//     teamCount,
//     marketName = teamName,
//     max,
//     min,
//     roundId,
//     gname,
//     cid = 4,
//     gid = 35,
//     tabno = 6,
//     subtype,
//   } = req.body;

//   let p = parseFloat(price);
//   let x = Number(parseFloat(xValue).toFixed(2));
//    let betAmount = 0;

//   if (otype === 'lay') {
//     betAmount = p;
//     p = p * (x - 1);
//   } else {
//     betAmount = p * (x - 1);
//   }

//   // lucky7Logger("LUCKY7 gameType ", betAmount);

//   if (
//     !gameId ||
//     !price ||
//     !xValue ||
//     !teamName ||
//     !otype ||
//     !roundId ||
//     !gname
//   ) {
//     return res.status(400).json({
//       message: 'All required Casino fields must be provided',
//     });
//   }

//   const casinoLockEntry = user.gamelock?.find(
//     (g) => g.game.toLowerCase() === 'casino'
//   );

//   if (casinoLockEntry && casinoLockEntry.lock === false) {
//     return res.status(403).json({
//       message: 'Casino betting is locked for your account',
//     });
//   }

//   // BACK/LAY VALIDATION
//   if (!['back', 'lay'].includes(otype)) {
//     return res.status(400).json({
//       message: "Bet type must be 'back' or 'lay'",
//     });
//   }

//   const MINIMUM_BET = min;
//   const MAXIMUM_BET = max;

//   if (p < MINIMUM_BET) {
//     return res.status(400).json({
//       message: `Minimum bet amount is ${MINIMUM_BET}`,
//     });
//   }

//   if (p > MAXIMUM_BET) {
//     return res.status(400).json({
//       message: `Maximum bet amount is ${MAXIMUM_BET}`,
//     });
//   }

//   if (x < 1.01 || x > 100) {
//     return res.status(400).json({
//       message: 'Invalid odds range',
//     });
//   }

//   const casinoCheck = await validateCasinoMarket(
//     gameId,
//     teamName,
//     xValue,
//     otype
//   );

//   if (!casinoCheck.valid) {
//     return res.status(400).json({
//       message: casinoCheck.reason,
//     });
//   }
//   betAmount = parseFloat(betAmount.toFixed(2));
//   p = parseFloat(p.toFixed(2));

//   // const marketName = getLucky7MarketName(teamName);

//   const existingBet = await betModel.findOne({
//     userId: id,
//     roundId,
//     gameId,
//     marketName,
//     betType: 'casino',
//     status: 0,
//     isCashedOut: { $ne: true },
//   });

//   const marketBets = await betModel.find({
//     userId: id,
//     roundId,
//     gameId,
//     marketName,
//     status: 0,
//     isCashedOut: { $ne: true },
//   });

//   const validation = validateBetWithNewBetOffset(
//     user.avbalance,
//     user.balance,
//     marketBets,
//     teamName,
//     otype,
//     p,
//     p,
//     betAmount
//   );

//   if (!validation.allowed) {
//     return res.status(400).json({
//       message: 'Insufficient balance',
//     });
//   }

//   const offsetPendingBets = await betModel.find({
//     userId: id,
//     status: 0,
//   });

//   // to calculate the correct exposer

//   const simulatedNewBet = {
//     gameType: 'Casino',
//     betType: 'casino',
//     gameId,
//     roundId,
//     teamName,
//     marketName,
//     otype,
//     betAmount,
//     price: p,
//   };

//   const projectedExposure = calculateAllExposure([
//     ...offsetPendingBets,
//     simulatedNewBet,
//   ]);
//   lucky7Logger('LUCKY7 exposer', projectedExposure);
//   if (projectedExposure > user.exposureLimit) {
//     return res.status(400).json({
//       message: 'Exposure limit exceeded',
//     });
//   }

//   let market_id;

//   if (existingBet) {
//     market_id = existingBet.market_id;
//   } else {
//     market_id = `casino_${gameId}_${teamName}_${Date.now()}_${Math.floor(
//       1000 + Math.random() * 9000
//     )}`;
//   }

//   let newBet = null;

//   if (existingBet) {
//     market_id = existingBet.market_id;
//     const originalPrice = existingBet.price || 0;
//     const originalBetAmount = existingBet.betAmount || 0;

//     if (existingBet.teamName === teamName) {
//       // same side merge
//       existingBet.price = parseFloat((existingBet.price + p).toFixed(2));

//       existingBet.betAmount = parseFloat(
//         (existingBet.betAmount + betAmount).toFixed(2)
//       );

//       existingBet.xValue = parseFloat(
//         (
//           ((existingBet.xValue || 0) * originalPrice + x * p) /
//           (originalPrice + p)
//         ).toFixed(2)
//       );
//     } else {
//       if (
//         marketName === 'LUCKY CARD' ||
//         marketName === 'LUCKY CARD SUIT' ||
//         teamCount > 2

//       ) {
//         const cashoutHistoryRecords = await betHistoryModel.find({
//           betId: existingBet._id.toString(),
//           status: 0,
//         });

//         const grouped = {};

//         for (const item of cashoutHistoryRecords) {
//           if (!grouped[item.teamName]) {
//             grouped[item.teamName] = {
//               price: 0,
//               betAmount: 0,
//             };
//           }

//           grouped[item.teamName].price += Number(item.price);
//           grouped[item.teamName].betAmount += Number(item.betAmount);
//         }

//         // include current bet
//         if (!grouped[teamName]) {
//           grouped[teamName] = {
//             price: 0,
//             betAmount: 0,
//           };
//         }

//         grouped[teamName].price += p;
//         grouped[teamName].betAmount += betAmount;

//         const totalPrice = Object.values(grouped).reduce(
//           (sum, item) => sum + item.price,
//           0
//         );

//         const distinctCount = Object.keys(grouped).length;

//         const maxPrice = Math.max(
//           ...Object.values(grouped).map((item) => item.price)
//         );

//         // full market completed?
//         if (distinctCount === existingBet.BetCase) {
//           const smallestPrice = Math.min(
//             ...Object.values(grouped).map((item) => item.price)
//           );
//           const deduction = smallestPrice * x;

//           existingBet.price = parseFloat((totalPrice - deduction).toFixed(2));
//         } else {
//           // market not full yet → just add price
//           existingBet.price = parseFloat((existingBet.price + p).toFixed(2));
//         }
//         const maxwin = Math.max(
//           ...Object.values(grouped).map((item) => item.betAmount)
//         ).toFixed(2);

//         // const netloss = totalPrice - maxPrice;
//         const netloss = totalPrice - maxPrice;

//         existingBet.betAmount = parseFloat(maxwin - netloss);

//         existingBet.teamName = teamName;
//         existingBet.xValue = x;
//       } else {
//         // opposite side offset
//         if (originalPrice >= betAmount) {
//           existingBet.price = parseFloat(
//             (originalPrice - betAmount).toFixed(2)
//           );

//           existingBet.betAmount = parseFloat(
//             (originalBetAmount - p).toFixed(2)
//           );
//         } else {
//           existingBet.price = parseFloat((p - originalBetAmount).toFixed(2));

//           existingBet.betAmount = parseFloat(
//             (betAmount - originalPrice).toFixed(2)
//           );

//           existingBet.teamName = teamName;
//         }
//       }
//       existingBet.xValue = x;
//     }

//     await existingBet.save();
//   } else {
//     newBet = new betModel({
//       userId: id,
//       userName: user.userName,
//       userRole: user.role,
//       invite: user.invite,
//       gameId,
//       price: p,
//       BetCase: teamCount,
//       betAmount,
//       otype,
//       xValue: x,
//       fancyScore,
//       gameType: 'Casino',
//       market_id,
//       eventName: gname,
//       marketName,
//       gameName: 'Casino',
//       teamName,
//       roundId,
//       cid,
//       gid,
//       tabno,
//       betType: 'casino',
//       subtype,
//     });

//     await newBet.save();

//     // lucky7Logger("LUCKY7 NEW BET CREATED", newBet);
//   }

//   // always save history
//   const betHistory = new betHistoryModel({
//     betId: (newBet ? newBet._id : existingBet._id).toString(),
//     userId: id,
//     userName: user.userName,
//     gameId,
//     price: p,
//     betAmount,
//     otype,
//     xValue: x,
//     fancyScore,
//     gameType: 'casino',
//     eventName: gname,
//     market_id,
//     marketName,
//     gameName: 'Casino',
//     teamName,
//     roundId,
//     cid,
//     gid,
//     tabno,
//     betType: 'casino',
//     subtype,
//   });

//   await betHistory.save();

//   // user.exposure = calculateAllExposure(offsetPendingBets);
//   // lucky7Logger("LUCKY7 expo", (offsetPendingBets));
//   const updatedPendingBets = await betModel.find({
//     userId: id,
//     status: 0,
//   });
//   user.exposure = calculateAllExposure(updatedPendingBets);
//   user.avbalance = user.balance - user.exposure;

//   // CRITICAL SAFETY CHECK: PTI must never be negative
//   if (user.avbalance < 0) {
//     console.error(`[CRITICAL PTI ERROR] Casino avbalance went negative!`);

//     // Rollback by not saving - this is a critical error
//     throw new Error('Critical: PTI calculation error - casino bet rejected');
//   }
//   // user.avbalance = parseFloat((user.avbalance - p).toFixed(2));

//   await user.save();

//   // lucky7Logger("LUCKY7 balance", user.avbalance);
//   // lucky7Logger("LUCKY7 exposure", user.exposure);

//   sendBalanceUpdates(user._id, user.avbalance);
//   sendExposureUpdates(user._id, user.exposure);
//   sendOpenBetsUpdates(user);

//   return res.status(201).json({
//     message: 'Casino bet placed successfully',
//   });
// };

const placeLucky7Bet = async (req, res, user) => {
  const { id } = req;

  const {
    gameId,
    price,
    xValue,
    teamName,
    otype,
    fancyScore,
    teamCount,
    marketName = teamName,
    max,
    min,
    roundId,
    gname,
    cid = 4,
    gid = 35,
    tabno = 6,
    subtype,
  } = req.body;

  let teamCountNo;

  if (marketName === 'pokerfancy') {
    teamCountNo = teamCount + 1;
  } else {
    teamCountNo = teamCount;
  }
  let p = parseFloat(price);
  const originalStake = p;

  let x = Number(parseFloat(xValue).toFixed(2));

  // ADD BACK/LAY LOGIC SAME AS placeCasinoBet
  let betAmount = 0;

  if (otype === 'lay') {
    betAmount = p;
    p = p * (x - 1);
  } else {
    betAmount = p * (x - 1);
  }

  if (
    !gameId ||
    !price ||
    !xValue ||
    !teamName ||
    !otype ||
    !roundId ||
    !gname
  ) {
    return res.status(400).json({
      message: 'All required Casino fields must be provided',
    });
  }

  // BACK/LAY VALIDATION
  if (!['back', 'lay'].includes(otype)) {
    return res.status(400).json({
      message: "Bet type must be 'back' or 'lay'",
    });
  }

  const casinoLockEntry = user.gamelock?.find(
    (g) => g.game.toLowerCase() === 'casino'
  );

  if (casinoLockEntry && casinoLockEntry.lock === false) {
    return res.status(403).json({
      message: 'Casino betting is locked for your account',
    });
  }

  const MINIMUM_BET = Number(min) > 0 ? Number(min) : 1;
  const MAXIMUM_BET = Number(max) > 0 ? Number(max) : 100000;

  if (originalStake < MINIMUM_BET) {
    return res.status(400).json({
      message: `Minimum bet amount is ${MINIMUM_BET}`,
    });
  }

  if (originalStake > MAXIMUM_BET) {
    return res.status(400).json({
      message: `Maximum bet amount is ${MAXIMUM_BET}`,
    });
  }

  if (x < 1.01 || x > 100) {
    return res.status(400).json({
      message: 'Invalid odds range',
    });
  }

  const casinoCheck = await validateCasinoMarket(
    gameId,
    teamName,
    xValue,
    otype
  );

  if (!casinoCheck.valid) {
    return res.status(400).json({
      message: casinoCheck.reason,
    });
  }

  if (casinoCheck.teamCount) {
    teamCountNo =
      marketName === 'pokerfancy'
        ? casinoCheck.teamCount + 1
        : casinoCheck.teamCount;
  }

  betAmount = parseFloat(betAmount.toFixed(2));
  p = parseFloat(p.toFixed(2));

  const existingBet = await betModel.findOne({
    userId: id,
    roundId,
    gameId,
    marketName,
    betType: 'casino',
    status: 0,
    isCashedOut: { $ne: true },
  });

  const marketBets = await betModel.find({
    userId: id,
    roundId,
    gameId,
    marketName,
    status: 0,
    isCashedOut: { $ne: true },
  });

  // UPDATED VALIDATION FOR BACK/LAY
  const validation = validateBetWithNewBetOffset(
    user.avbalance,
    user.balance,
    marketBets,
    teamName,
    otype,
    originalStake,
    p,
    betAmount
  );

  if (!validation.allowed) {
    return res.status(400).json({
      message: 'Insufficient balance',
    });
  }

  const offsetPendingBets = await betModel.find({
    userId: id,
    status: 0,
  });

  const simulatedNewBet = {
    gameType: 'Casino',
    betType: 'casino',
    gameId,
    roundId,
    teamName,
    marketName,
    otype,
    betAmount,
    price: p,
  };

  const projectedExposure = calculateAllExposure([
    ...offsetPendingBets,
    simulatedNewBet,
  ]);

  lucky7Logger('LUCKY7 exposer', projectedExposure);

  if (projectedExposure > user.exposureLimit) {
    return res.status(400).json({
      message: 'Exposure limit exceeded',
    });
  }

  let market_id;

  if (existingBet) {
    market_id = existingBet.market_id;
  } else {
    market_id = `casino_${gameId}_${teamName}_${Date.now()}_${Math.floor(
      1000 + Math.random() * 9000
    )}`;
  }

  let newBet = null;

  if (existingBet) {
    market_id = existingBet.market_id;

    const originalPrice = existingBet.price || 0;
    const originalBetAmount = existingBet.betAmount || 0;

    if (existingBet.teamName === teamName) {
      // SAME TEAM LOGIC

      if (otype === existingBet.otype) {
        // SAME TYPE MERGE

        existingBet.price = parseFloat((existingBet.price + p).toFixed(2));

        existingBet.betAmount = parseFloat(
          (existingBet.betAmount + betAmount).toFixed(2)
        );

        existingBet.xValue = parseFloat(
          (
            ((existingBet.xValue || 0) * originalPrice + x * p) /
            (originalPrice + p || 1)
          ).toFixed(2)
        );
      } else {
        // OPPOSITE TYPE OFFSET

        if (otype === 'back') {
          if (originalBetAmount >= p) {
            // FULL OFFSET

            existingBet.price = parseFloat(
              (originalPrice - betAmount).toFixed(2)
            );

            existingBet.betAmount = parseFloat(
              (originalBetAmount - p).toFixed(2)
            );
          } else {
            // PARTIAL OFFSET WITH TYPE CHANGE

            existingBet.price = parseFloat((p - originalBetAmount).toFixed(2));

            existingBet.betAmount = parseFloat(
              (betAmount - originalPrice).toFixed(2)
            );

            existingBet.otype = otype;
          }
        } else if (otype === 'lay') {
          if (originalPrice >= betAmount) {
            // FULL OFFSET

            existingBet.price = parseFloat(
              (originalPrice - betAmount).toFixed(2)
            );

            existingBet.betAmount = parseFloat(
              (originalBetAmount - p).toFixed(2)
            );
          } else {
            // PARTIAL OFFSET WITH TYPE CHANGE

            existingBet.price = parseFloat((p - originalBetAmount).toFixed(2));

            existingBet.betAmount = parseFloat(
              (betAmount - originalPrice).toFixed(2)
            );

            existingBet.otype = otype;
          }
        }

        existingBet.xValue = x;
      }
    } else {
      // DIFFERENT TEAM LOGIC

      if (
        marketName === 'LUCKY CARD' ||
        marketName === 'LUCKY CARD SUIT' ||
        teamCountNo > 2
      ) {
        const cashoutHistoryRecords = await betHistoryModel.find({
          betId: existingBet._id.toString(),
          status: 0,
        });

        const grouped = {};

        for (const item of cashoutHistoryRecords) {
          if (!grouped[item.teamName]) {
            grouped[item.teamName] = {
              price: 0,
              betAmount: 0,
            };
          }

          grouped[item.teamName].price += Number(item.price);
          grouped[item.teamName].betAmount += Number(item.betAmount);
        }

        if (!grouped[teamName]) {
          grouped[teamName] = {
            price: 0,
            betAmount: 0,
          };
        }

        grouped[teamName].price += p;
        grouped[teamName].betAmount += betAmount;

        const totalPrice = Object.values(grouped).reduce(
          (sum, item) => sum + item.price,
          0
        );

        const distinctCount = Object.keys(grouped).length;

        const maxPrice = Math.max(
          ...Object.values(grouped).map((item) => item.price)
        );

        if (distinctCount === existingBet.BetCase) {
          const smallestPrice = Math.min(
            ...Object.values(grouped).map((item) => item.price)
          );

          const deduction = smallestPrice * x;

          existingBet.price = parseFloat((totalPrice - deduction).toFixed(2));
        } else {
          existingBet.price = parseFloat((existingBet.price + p).toFixed(2));
        }

        const maxwin = Math.max(
          ...Object.values(grouped).map((item) => item.betAmount)
        ).toFixed(2);

        const netloss = totalPrice - maxPrice;

        existingBet.betAmount = parseFloat(maxwin - netloss);

        existingBet.teamName = teamName;
        existingBet.xValue = x;
      } else {
        // DIFFERENT TEAM BACK/LAY OFFSET LOGIC

        if (otype === existingBet.otype) {
          if (originalPrice >= betAmount) {
            existingBet.price = parseFloat(
              (originalPrice - betAmount).toFixed(2)
            );

            existingBet.betAmount = parseFloat(
              (originalBetAmount - p).toFixed(2)
            );
          } else {
            existingBet.price = parseFloat((p - originalBetAmount).toFixed(2));

            existingBet.betAmount = parseFloat(
              (betAmount - originalPrice).toFixed(2)
            );

            existingBet.teamName = teamName;
          }
        } else {
          existingBet.price = parseFloat((existingBet.price + p).toFixed(2));

          existingBet.betAmount = parseFloat(
            (existingBet.betAmount + betAmount).toFixed(2)
          );

          existingBet.teamName = teamName;
          existingBet.otype = otype;
        }

        existingBet.xValue = x;
      }
    }

    existingBet.fancyScore = fancyScore || existingBet.fancyScore;
    existingBet.roundId = roundId || existingBet.roundId;

    await existingBet.save();
  } else {
    newBet = new betModel({
      userId: id,
      userName: user.userName,
      userRole: user.role,
      invite: user.invite,
      gameId,
      price: p,
      BetCase: teamCountNo,
      betAmount,
      otype,
      xValue: x,
      fancyScore,
      gameType: 'Casino',
      market_id,
      eventName: gname,
      marketName,
      gameName: 'Casino',
      teamName,
      roundId,
      cid,
      gid,
      tabno,
      betType: 'casino',
      subtype,
    });

    await newBet.save();
  }

  // HISTORY SAVE

  const betHistory = new betHistoryModel({
    betId: (newBet ? newBet._id : existingBet._id).toString(),
    userId: id,
    userName: user.userName,
    gameId,
    price: p,
    betAmount,
    otype,
    xValue: x,
    fancyScore,
    gameType: 'casino',
    eventName: gname,
    market_id,
    marketName,
    gameName: 'Casino',
    teamName,
    roundId,
    cid,
    gid,
    tabno,
    betType: 'casino',
    subtype,
  });

  await betHistory.save();

  const updatedPendingBets = await betModel.find({
    userId: id,
    status: 0,
  });

  user.exposure = calculateAllExposure(updatedPendingBets);
  user.avbalance = user.balance - user.exposure;

  if (user.avbalance < 0) {
    console.error(`[CRITICAL PTI ERROR] Casino avbalance went negative!`);

    throw new Error('Critical: PTI calculation error - casino bet rejected');
  }

  await user.save();

  sendBalanceUpdates(user._id, user.avbalance);
  sendExposureUpdates(user._id, user.exposure);
  sendOpenBetsUpdates(user);

  return res.status(201).json({
    message: 'Casino bet placed successfully',
  });
};

const placeBet = async (req, res) => {
  const { id } = req;

  try {
    const {
      gameId,
      sid,
      price,
      xValue,
      fancyScore,
      gameType,
      eventName,
      marketName,
      gameName,
      teamName,
      otype,
      oname,
    } = req.body;

    // Validate required fields
    if (!gameId || !sid || !price || !xValue || !gameName || !teamName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Server-side market validation: check suspend status + odds against live data
    const marketCheck = await validateSportsMarket(
      gameId,
      gameName,
      marketName,
      teamName,
      xValue,
      otype,
      sid,
      oname,
      gameType
    );
    if (!marketCheck.valid) {
      console.warn(
        `[BET REJECTED] Sports: gameId=${gameId} team=${teamName} market=${marketName} reason="${marketCheck.reason}"`
      );
      return res.status(400).json({ message: marketCheck.reason });
    }

    const user = await SubAdmin.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if this sport is locked for the user
    if (gameName && user.gamelock) {
      const sportLockEntry = user.gamelock.find(
        (g) => g.game.toLowerCase() === gameName.toLowerCase()
      );
      if (sportLockEntry && sportLockEntry.lock === false) {
        return res
          .status(403)
          .json({ message: `${gameName} betting is locked for your account` });
      }
    }

    if (user.secret === 0) {
      return res.status(200).json({ message: 'created successfully' });
    }

    const marketMeta = marketCheck.marketMeta || {};

    // 1. Check uniqueness: existing bet with same gameId, eventName, marketName, userId, and status 0
    const uniqueKey = { gameId, eventName, marketName };
    const existingExact = await betModel.findOne(uniqueKey);

    let market_id;

    if (existingExact) {
      market_id = existingExact.market_id;
    }

    // Only call the external API if there's no existing bet
    if (!existingExact) {
      market_id = Math.floor(10000000 + Math.random() * 90000000);

      //Here we are using the external Api
      try {
        if (gameType === 'fancy1') {
          // fancy1 uses the same request format as fancy (session) bets:
          // no runners, carries fancyId + beventId instead.
          let beventId = '';
          try {
            const matchListData = await apiFetchMatchList(Number(sid));
            if (matchListData?.success && matchListData.data) {
              const allMatches = [
                ...(matchListData.data.t1 || []),
                ...(matchListData.data.t2 || []),
              ];
              const matched = allMatches.find((m) => {
                const matchId = String(m.beventId || m.oldgmid || m.gmid);
                return matchId === String(gameId);
              });
              beventId = matched?.beventId ? String(matched.beventId) : '';
            }
          } catch (err) {
            console.warn(
              `[FANCY1 BET] Failed to fetch match list for beventId lookup:`,
              err.message
            );
          }

          await apiSendBetIncoming({
            sport_id: sid,
            sportName: (gameName || '').replace(/\s*game\s*$/i, ''),
            event_id: marketMeta.gmid || gameId,
            beventId,
            event_name: eventName,
            fancyId: marketMeta.fancyId ? String(marketMeta.fancyId) : null,
            market_name: toApiMarketName(marketName),
            fancyType: gameType,
          });
        } else {
          await apiSendBetIncoming({
            event_id: gameId,
            event_name: eventName,
            market_id: market_id,
            market_name: toApiMarketName(marketName),
            market_type: gameType,
            client_ref: null,
            sport_id: sid,
            fancyId: null,
            fancymid: marketMeta.mid || null,
            bevent_id: marketMeta.beventId || null,
            runners: marketMeta.runners || [],
          });
        }
      } catch (apiErr) {
        console.error(
          `[SPORTS BET] bet-incoming API failed for gameId=${gameId}:`,
          apiErr.message
        );
      }
    }

    let p = parseFloat(price);
    const originalStake = p; // Save original stake before modification for LAY bets
    let x = Number(parseFloat(xValue).toFixed(2));
    let betAmount = 0;

    // Validate minimum odds - odds of 1.00 produce zero liability (invalid bet)
    if (x < 1.01) {
      return res
        .status(400)
        .json({ message: 'Invalid odds: minimum allowed is 1.01' });
    }

    // Calculate bet amount based on game type and otype
    switch (gameType) {
      case 'Match Odds':
      case 'fancy1':
      case 'Tied Match':
      case 'Winner':
      case 'OVER_UNDER_05':
      case 'OVER_UNDER_15':
      case 'OVER_UNDER_25':
        betAmount = otype === 'lay' ? p : p * (x - 1);
        p = otype === 'lay' ? p * (x - 1) : p;
        break;
      case 'Bookmaker':
      case 'Bookmaker IPL CUP':
        betAmount = otype === 'lay' ? p : p * (x / 100);
        p = otype === 'lay' ? p * (x / 100) : p;
        break;
      case 'Toss':
      case '1st 6 over':
        betAmount = otype === 'lay' ? p : p * (x - 1);
        p = otype === 'lay' ? p * (x - 1) : p;
        break;
      default:
        return res.status(400).json({ message: 'Invalid game type' });
    }

    betAmount = parseFloat(betAmount.toFixed(2));
    p = parseFloat(p.toFixed(2));

    // BET PLACEMENT - EXPOSURE CALCULATION

    // fancy1: each row is an independent market (per-proposition marketName).
    // Scope lookups by marketName so different propositions in the same match
    // don't collide and merge into one bet record.
    const marketScopedQuery = {
      userId: id,
      gameId,
      gameType,
      status: 0,
      isCashedOut: { $ne: true },
    };
    if (gameType === 'fancy1') {
      marketScopedQuery.marketName = marketName;
    }

    const existingBet = await betModel.findOne(marketScopedQuery);
    const marketBets = await betModel.find(marketScopedQuery);

    // Calculate effective balance based on market position
    // Using new method that includes potential profit from the new bet itself
    const validation = validateBetWithNewBetOffset(
      user.avbalance,
      user.balance,
      marketBets,
      teamName,
      otype,
      originalStake,
      p, // liability (calculated p)
      betAmount // potential profit if bet wins
    );

    // STEP 3: Balance check with effective available balance (includes new bet profit potential)
    if (!validation.allowed) {
      console.log(`\x1b[41m[REJECTED]\x1b[0m ${validation.reason}`);
      return res.status(400).json({
        message: 'Insufficient balance',
        debug: {
          reason: validation.reason,
          effectiveBalance: validation.effectiveBalance,
          requiredLiability: p,
          userAvbalance: user.avbalance,
          userBalance: user.balance,
          existingMarketBets: marketBets.length,
          breakdown: validation.breakdown,
        },
      });
    }

    // STEP 4: Check exposure limit using scenario-based simulation
    const pendingBets = await betModel.find({
      userId: id,
      status: 0,
    });
    const simulatedNewBet = {
      gameType,
      gameId,
      marketName,
      teamName,
      otype,
      betAmount,
      price: p,
    };
    const projectedExposure = calculateAllExposure([
      ...pendingBets,
      simulatedNewBet,
    ]);

    if (projectedExposure > user.exposureLimit) {
      return res.status(400).json({ message: 'Exposure limit exceeded' });
    }

    let newBet = null;
    let placementType = 'new';
    let parentBetSnapshot = null;

    if (existingBet) {
      const originalPrice = existingBet.price;
      const originalBetAmount = existingBet.betAmount;

      // Capture snapshot BEFORE any modification
      parentBetSnapshot = {
        price: existingBet.price,
        betAmount: existingBet.betAmount,
        xValue: existingBet.xValue,
        otype: existingBet.otype,
        fancyScore: existingBet.fancyScore,
      };

      if (teamName === existingBet.teamName) {
        if (otype === existingBet.otype) {
          // Same team, same bet type - merge bets
          placementType = 'merge';
          existingBet.price += p;
          existingBet.xValue =
            originalPrice + p > 0
              ? (parseFloat(existingBet.xValue) * originalPrice +
                  parseFloat(x) * p) /
                (originalPrice + p)
              : parseFloat(x); // Avoid division by zero when both prices are 0
          existingBet.fancyScore = fancyScore;
          existingBet.betAmount += betAmount;
          existingBet.placementType = 'merged';
          existingBet.mergeCount = (existingBet.mergeCount || 1) + 1;
          user.avbalance -= p;
        } else {
          // Same team, opposite bet types - offset bets
          placementType = 'odds_offset';
          existingBet.placementType = 'odds_offset';
          if (otype === 'back') {
            //The originalBetAmount is the price of the existing bet,p is the price of the new bet
            if (originalBetAmount >= p) {
              // Full offset
              existingBet.price = originalPrice - betAmount;
              existingBet.betAmount = originalBetAmount - p;
              user.avbalance += betAmount;
            } else {
              // Partial offset with type change
              //The problem is here that (8-11) is giving equal to -3
              //or i should make it absolute
              existingBet.price = p - originalBetAmount;
              existingBet.betAmount = betAmount - originalPrice;
              existingBet.otype = otype;
              user.avbalance += originalPrice - (p - originalBetAmount);
            }
          } else if (otype === 'lay') {
            if (originalPrice >= betAmount) {
              // Full offset
              existingBet.price = originalPrice - betAmount;
              existingBet.betAmount = originalBetAmount - p;
              user.avbalance += betAmount;
            } else {
              // Partial offset with type change
              existingBet.price = p - originalBetAmount;
              existingBet.betAmount = betAmount - originalPrice;
              existingBet.otype = otype;
              user.avbalance -= p - originalBetAmount - originalPrice;
            }
          }
          existingBet.xValue = x;
          existingBet.fancyScore = fancyScore;
        }
      } else {
        // If team name is different
        if (otype === existingBet.otype) {
          placementType = 'odds_offset';
          existingBet.placementType = 'odds_offset';
          if (originalPrice >= betAmount) {
            existingBet.price = originalPrice - betAmount;
            existingBet.betAmount = originalBetAmount - p;
            // user.exposure = totalPendingAmount - betAmount;
            user.avbalance += betAmount;
            // existingBet.teamName = teamName;
            existingBet.xValue = x;
            existingBet.fancyScore = fancyScore;
          }
          //This condition is for opposite otype
          //identify which condition is this
          else {
            //-8-2500
            existingBet.price = p - originalBetAmount;
            //100-200
            existingBet.betAmount = betAmount - originalPrice;
            // user.exposure = totalPendingAmount - betAmount;
            user.avbalance -= p - originalBetAmount - originalPrice;
            existingBet.teamName = teamName;
            existingBet.xValue = x;
            existingBet.fancyScore = fancyScore;
          }
        } else {
          // Different team, opposite otype - hedge/add
          placementType = 'merge';
          existingBet.placementType = 'merged';
          existingBet.mergeCount = (existingBet.mergeCount || 1) + 1;
          //200+8
          existingBet.price += p;
          //2500+100
          existingBet.betAmount += betAmount;
          existingBet.xValue = (existingBet.xValue + x) / 2;
          // user.exposure = totalPendingAmount + p;
          user.avbalance -= p;
          existingBet.teamName = teamName;
          existingBet.xValue = x;
          existingBet.fancyScore = fancyScore;
          existingBet.otype = otype;
        }
      }
    } else {
      // No existing bet, place new one
      placementType = 'new';
      newBet = new betModel({
        userId: id,
        userName: user.userName,
        userRole: user.role,
        invite: user.invite,
        gameId,
        sid,
        price: p,
        betAmount,
        otype,
        xValue: x,
        fancyScore,
        gameType,
        market_id,
        eventName,
        marketName,
        gameName,
        teamName,
        fancyId:
          gameType === 'fancy1'
            ? String(marketMeta.fancyId || '') || null
            : null,
        placementType: 'new',
        mergeCount: 1,
      });
      user.avbalance -= p;
    }

    if (
      existingBet &&
      gameType === 'fancy1' &&
      marketMeta.fancyId &&
      !existingBet.fancyId
    ) {
      existingBet.fancyId = String(marketMeta.fancyId);
    }

    // STEP 2: Save the bet to database first
    const saveOperations = [];
    if (existingBet) saveOperations.push(existingBet.save());
    if (newBet) saveOperations.push(newBet.save());

    // Execute all save operations
    await Promise.all(saveOperations);

    // STEP 3: Calculate exposure again (AFTER placing)
    // Now we include the new bet we just saved
    // This becomes the user's official exposure in database
    const updatedPendingBets = await betModel.find({
      userId: id,
      status: 0,
    });
    user.exposure = calculateAllExposure(updatedPendingBets);

    // Recalculate avbalance from the formula (fixes incremental update errors)
    user.avbalance = user.balance - user.exposure;

    // CRITICAL SAFETY CHECK: PTI must never be negative
    if (user.avbalance < 0) {
      console.error(`[CRITICAL PTI ERROR] avbalance went negative!`);
      console.error(`  balance: ${user.balance}`);
      console.error(`  exposure: ${user.exposure}`);
      console.error(`  avbalance: ${user.avbalance}`);
      console.error(
        `  bet details: gameId=${gameId}, teamName=${teamName}, price=${p}`
      );

      // Rollback by not saving - this is a critical error
      throw new Error('Critical: PTI calculation error - bet rejected');
    }

    await user.save();

    // Send WebSocket updates for balance, exposure and open bets

    console.time('SPORTS_BET_WEBSCOKET_UPDATES');
    sendBalanceUpdates(user._id, user.avbalance);
    sendExposureUpdates(user._id, user.exposure);
    sendOpenBetsUpdates(user._id, null);
    console.timeEnd('SPORTS_BET_WEBSOCKET_UPDATES');

    // Update all upline balances asynchronously after bet placement (non-blocking)
    setImmediate(async () => {
      try {
        await updateAllUplines(user._id);
      } catch (err) {
        console.error(
          ` [SPORTS BET] Error updating upline balances:`,
          err.message
        );
      }
    });

    // Record bet history regardless of new/existing
    const betHistory = new betHistoryModel({
      betId: (newBet ? newBet._id : existingBet._id).toString(), // Link to parent bet for settlement
      userId: id,
      userName: user.userName,
      gameId,
      sid,
      price: p,
      betAmount,
      otype,
      xValue: x,
      fancyScore,
      gameType,
      eventName,
      market_id,
      marketName,
      gameName,
      teamName,
      placementType,
      parentBetSnapshot,
      userBalanceBefore: user.balance,
      userExposureBefore: user.exposure,
    });
    await betHistory.save();

    return res.status(201).json({ message: 'Bet placed successfully' });
  } catch (error) {
    console.error(
      `[SPORTS BET] Error placing bet:`,
      error.message,
      error.stack
    );
    return res
      .status(500)
      .json({ message: 'Error placing bet', error: error.message });
  }
};
export const placeFancyBet = async (req, res) => {
  const { id } = req;

  try {
    const {
      gameId,
      sid,
      price,
      xValue,
      fancyScore,
      gameType,
      eventName,
      marketName,
      gameName,
      teamName,
      otype,
      oname,
    } = req.body;

    // Validate required fields
    if (!gameId || !sid || !price || !xValue || !gameName || !teamName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const fancyCheck = await validateFancyMarket(
      gameId,
      gameName,
      marketName,
      teamName,
      xValue,
      otype,
      sid,
      fancyScore,
      oname
    );
    if (!fancyCheck.valid) {
      console.warn(
        `[BET REJECTED] Fancy: gameId=${gameId} team=${teamName} market=${marketName} reason="${fancyCheck.reason}"`
      );
      return res.status(400).json({ message: fancyCheck.reason });
    }

    const user = await SubAdmin.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if this sport is locked for the user
    if (gameName && user.gamelock) {
      const sportLockEntry = user.gamelock.find(
        (g) => g.game.toLowerCase() === gameName.toLowerCase()
      );
      if (sportLockEntry && sportLockEntry.lock === false) {
        return res
          .status(403)
          .json({ message: `${gameName} betting is locked for your account` });
      }
    }

    if (user.secret === 0) {
      return res.status(200).json({ message: 'created successfully' });
    }

    const uniqueKey = { gameId, eventName, marketName };
    const existingExact = await betModel.findOne(uniqueKey);

    const fancyMeta = fancyCheck.marketMeta || {};
    let market_id;

    if (existingExact) {
      market_id = existingExact.market_id;
    }

    if (!existingExact) {
      market_id = Math.floor(10000000 + Math.random() * 90000000);

      // Look up beventId from the match list
      let beventId = '';
      try {
        const matchListData = await apiFetchMatchList(Number(sid));
        if (matchListData?.success && matchListData.data) {
          const allMatches = [
            ...(matchListData.data.t1 || []),
            ...(matchListData.data.t2 || []),
          ];
          const matched = allMatches.find((m) => {
            const matchId = String(m.beventId || m.oldgmid || m.gmid);
            return matchId === String(gameId);
          });
          beventId = matched?.beventId ? String(matched.beventId) : '';
        }
      } catch (err) {
        console.warn(
          `[FANCY BET] Failed to fetch match list for beventId lookup:`,
          err.message
        );
      }

      try {
        await apiSendBetIncoming({
          sport_id: sid,
          sportName: (gameName || '').replace(/\s*game\s*$/i, ''),
          event_id: fancyMeta.gmid || gameId,
          beventId,
          event_name: eventName,
          fancyId: fancyMeta.fancyId ? String(fancyMeta.fancyId) : null,
          market_name: toApiMarketName(marketName),
          fancyType: gameType,
        });
      } catch (err) {
        console.error('Error fetching market_id:', err);
        return res.status(502).json({
          message: 'Could not fetch external market_id',
          error: err.message,
        });
      }
    }

    let p = parseFloat(price);
    let x = Number(parseFloat(xValue).toFixed(2));
    let betAmount = 0;

    // Calculate bet amount based on game type and otype
    switch (gameType) {
      case 'Normal':
      case 'meter':
      case 'line':
      case 'ball':
      case 'khado':
        betAmount = otype === 'lay' ? p : p * (x / 100);
        p = otype === 'lay' ? p * (x / 100) : p;
        break;
      default:
        return res.status(400).json({ message: 'Invalid game type' });
    }

    betAmount = parseFloat(betAmount.toFixed(2));
    p = parseFloat(p.toFixed(2));

    const fancyMarketBets = await betModel.find({
      userId: id,
      gameId,
      teamName,
      gameType,
      status: 0,
      isCashedOut: { $ne: true },
    });

    const fancyValidation = validateFancyBetBalance(
      user.avbalance,
      user.balance,
      fancyMarketBets,
      { gameId, teamName, fancyScore, otype, betAmount, price: p }
    );

    if (!fancyValidation.allowed) {
      return res.status(400).json({
        message: 'Insufficient balance',
        debug: {
          reason: fancyValidation.reason,
          userAvbalance: user.avbalance,
          userBalance: user.balance,
          newAvbalance: fancyValidation.newAvbalance,
          currentMarketExposure: fancyValidation.currentMarketExposure,
          newMarketExposure: fancyValidation.newMarketExposure,
        },
      });
    }

    const pendingBets = await betModel.find({
      userId: id,
      status: 0,
    });
    const simulatedNewBet = {
      gameType,
      gameId,
      teamName,
      fancyScore,
      otype,
      betAmount,
      price: p,
    };
    const projectedExposure = calculateAllExposure([
      ...pendingBets,
      simulatedNewBet,
    ]);

    if (projectedExposure > user.exposureLimit) {
      return res.status(400).json({ message: 'Exposure limit exceeded' });
    }

    const mergeBet = await betModel.findOne({
      userId: id,
      gameId,
      gameType,
      teamName,
      otype,
      fancyScore,
      status: 0,
      isCashedOut: { $ne: true },
    });

    const existingBet = mergeBet
      ? null
      : await betModel.findOne({
          userId: id,
          gameId,
          gameType,
          teamName,
          otype: otype === 'back' ? 'lay' : 'back',
          status: 0,
          isCashedOut: { $ne: true },
        });

    let activeBetId = null;
    let placementType = 'new';
    let parentBetSnapshot = null;

    if (mergeBet) {
      // CASE 1: SAME TYPE + SAME FANCYSCORE - MERGE
      // Snapshot BEFORE merge for debugging
      parentBetSnapshot = {
        price: mergeBet.price,
        betAmount: mergeBet.betAmount,
        xValue: mergeBet.xValue,
        otype: mergeBet.otype,
        fancyScore: mergeBet.fancyScore,
      };
      placementType = 'merge';

      mergeBet.price += p;
      mergeBet.xValue = (mergeBet.xValue + x) / 2;
      mergeBet.betAmount += betAmount;
      mergeBet.placementType = 'merged';
      mergeBet.mergeCount = (mergeBet.mergeCount || 1) + 1;
      await mergeBet.save();
      activeBetId = mergeBet._id; // Track the bet ID
      console.log(
        `[MERGE] Same type + same score bet merged - ${otype} + ${otype} at fancyScore=${fancyScore}`
      );
    } else if (existingBet) {
      // CASE 2: DIFFERENT TYPE - CHECK OFFSET CONDITIONS

      // Priority 1: Score Offset (Highest Priority)
      const scoreOffset =
        (existingBet.otype === 'back' &&
          otype === 'lay' &&
          parseFloat(fancyScore) > parseFloat(existingBet.fancyScore)) ||
        (existingBet.otype === 'lay' &&
          otype === 'back' &&
          parseFloat(existingBet.fancyScore) > parseFloat(fancyScore));

      // Priority 2: Odds Offset (Secondary Priority)
      const oddsOffset =
        (existingBet.otype === 'back' &&
          otype === 'lay' &&
          x > existingBet.xValue) ||
        (existingBet.otype === 'lay' &&
          otype === 'back' &&
          existingBet.xValue > x);

      if (scoreOffset) {
        // PRIORITY 1: Score Offset (Highest Priority)
        placementType = 'score_offset';
        parentBetSnapshot = {
          price: existingBet.price,
          betAmount: existingBet.betAmount,
          xValue: existingBet.xValue,
          otype: existingBet.otype,
          fancyScore: existingBet.fancyScore,
        };
        console.log(
          ` Score offset applied - lay score (${fancyScore}) > back score (${existingBet.fancyScore})`
        );

        const originalPrice = existingBet.price;
        const originalBetAmount = existingBet.betAmount;

        if (otype === 'back') {
          if (originalBetAmount >= p) {
            // Full offset
            existingBet.price = originalPrice - betAmount;
            existingBet.betAmount = originalBetAmount - p;
            user.avbalance += betAmount;
            console.log('Full score offset - back bet');
          } else {
            // Partial offset with type change
            existingBet.price = p - originalBetAmount;
            existingBet.betAmount = betAmount - originalPrice;
            existingBet.otype = otype;
            user.avbalance += originalPrice - (p - originalBetAmount);
            console.log('Partial score offset - back bet with type change');
          }
        } else if (otype === 'lay') {
          if (originalPrice > betAmount) {
            // Full offset
            existingBet.price = originalPrice - betAmount;
            existingBet.betAmount = originalBetAmount - p;
            user.avbalance += betAmount;
            console.log(' Full score offset - lay bet');
          } else {
            // Partial offset with type change
            existingBet.price = p - originalBetAmount;
            existingBet.betAmount = betAmount - originalPrice;
            existingBet.otype = otype;
            user.avbalance -= p - originalBetAmount - originalPrice;
            console.log(' Partial score offset - lay bet with type change');
          }
        }
        existingBet.xValue = x;
        existingBet.fancyScore = fancyScore;
        existingBet.placementType = 'score_offset';
        await existingBet.save();
        activeBetId = existingBet._id; // Track the bet ID
        await user.save();
      } else if (oddsOffset) {
        // PRIORITY 2: Odds Offset (Secondary Priority)
        placementType = 'odds_offset';
        parentBetSnapshot = {
          price: existingBet.price,
          betAmount: existingBet.betAmount,
          xValue: existingBet.xValue,
          otype: existingBet.otype,
          fancyScore: existingBet.fancyScore,
        };

        const originalPrice = existingBet.price;
        const originalBetAmount = existingBet.betAmount;

        if (otype === 'back') {
          if (originalBetAmount >= p) {
            // Full offset
            existingBet.price = originalPrice - betAmount;
            existingBet.betAmount = originalBetAmount - p;
            user.avbalance += betAmount;
          } else {
            // Partial offset with type change
            existingBet.price = p - originalBetAmount;
            existingBet.betAmount = betAmount - originalPrice;
            existingBet.otype = otype;
            user.avbalance += originalPrice - (p - originalBetAmount);
          }
        } else if (otype === 'lay') {
          if (originalPrice > betAmount) {
            // Full offset
            existingBet.price = originalPrice - betAmount;
            existingBet.betAmount = originalBetAmount - p;
            user.avbalance += betAmount;
          } else {
            // Partial offset with type change
            existingBet.price = p - originalBetAmount;
            existingBet.betAmount = betAmount - originalPrice;
            existingBet.otype = otype;
            user.avbalance -= p - originalBetAmount - originalPrice;
          }
        }
        existingBet.xValue = x;
        existingBet.fancyScore = fancyScore;
        existingBet.placementType = 'odds_offset';
        await existingBet.save();
        activeBetId = existingBet._id; // Track the bet ID
        await user.save();
      } else {
        // PRIORITY 3: No Offset - Create Separate Bet
        placementType = 'no_offset_separate';
        parentBetSnapshot = {
          price: existingBet.price,
          betAmount: existingBet.betAmount,
          xValue: existingBet.xValue,
          otype: existingBet.otype,
          fancyScore: existingBet.fancyScore,
        };

        user.avbalance -= p;
        const newBet = new betModel({
          userId: id,
          userName: user.userName,
          gameId,
          sid,
          price: p,
          betAmount,
          otype,
          xValue: x,
          fancyScore,
          gameType,
          market_id,
          eventName,
          marketName,
          gameName,
          teamName,
          fancyId: fancyMeta.fancyId ? String(fancyMeta.fancyId) : null,
          placementType: 'no_offset_separate',
        });
        await newBet.save();
        activeBetId = newBet._id; // Track the bet ID
        await user.save();
      }
    } else {
      // CASE 3: No Existing Bet - Create New Bet

      const newBet = new betModel({
        userId: id,
        userName: user.userName,
        gameId,
        sid,
        price: p,
        betAmount,
        otype,
        xValue: x,
        fancyScore,
        gameType,
        market_id,
        eventName,
        marketName,
        gameName,
        teamName,
        fancyId: fancyMeta.fancyId ? String(fancyMeta.fancyId) : null,
        placementType: 'new',
        mergeCount: 1,
      });
      await newBet.save();
      activeBetId = newBet._id; // Track the bet ID
    }

    // Record in bet history with tracking fields
    const betHistory = new betHistoryModel({
      betId: activeBetId ? activeBetId.toString() : null, // Link to parent bet for settlement
      userId: id,
      userName: user.userName,
      gameId,
      sid,
      price: p,
      betAmount,
      otype,
      xValue: x,
      fancyScore,
      gameType,
      market_id,
      eventName,
      marketName,
      gameName,
      teamName,
      placementType,
      parentBetSnapshot: parentBetSnapshot || undefined,
      userBalanceBefore: user.balance,
      userExposureBefore: user.exposure,
    });

    await betHistory.save();

    // Recalculate exposure from updated bets (fancy + non-fancy)
    const updatedPendingBets = await betModel.find({
      userId: id,
      status: 0,
    });
    user.exposure = calculateAllExposure(updatedPendingBets);
    user.avbalance = user.balance - user.exposure;

    // CRITICAL SAFETY CHECK: PTI must never be negative
    if (user.avbalance < 0) {
      throw new Error('Critical: PTI calculation error - fancy bet rejected');
    }

    await user.save();

    console.log(
      `[FANCY EXPOSURE] User ${user.userName}: exposure=${user.exposure}`
    );

    // Update all upline balances asynchronously after bet placement (non-blocking)
    setImmediate(async () => {
      try {
        await updateAllUplines(user._id);
      } catch (err) {
        console.error(
          ' [FANCY BET] Error updating upline balances:',
          err.message
        );
      }
    });

    // Send updates to all connected clients
    sendOpenBetsUpdates(user);
    sendBalanceUpdates(user._id, user.avbalance);
    sendExposureUpdates(user._id, user.exposure);

    return res.status(201).json({ message: 'Bet placed successfully' });
  } catch (error) {
    console.error('Error placing bet:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

export const updateResultOfBets = async (req, res) => {
  const betTypes = [
    'Toss',
    '1st 6 over',
    'Match Odds',
    'Tied Match',
    'Bookmaker',
    'Bookmaker IPL CUP',
    'OVER_UNDER_05',
    'OVER_UNDER_15',
    'OVER_UNDER_25',
  ];

  let totalBetsProcessed = 0;
  const startTime = Date.now();

  try {
    // Step 1: Fetch unsettled sports bets (includes cashed-out — P/L applied at settlement)
    const gameBets = await betModel.find({
      status: 0,
      gameType: { $in: betTypes },
      gameId: { $exists: true },
      userId: { $exists: true },
    });

    if (!gameBets.length) {
      return (
        res?.status?.(200).json({ message: 'No unsettled bets found' }) || {
          success: true,
          total: 0,
        }
      );
    }

    // Step 1b: Map all users
    const userIds = [...new Set(gameBets.map((b) => b.userId))];
    const objectIds = userIds.map((id) => new mongoose.Types.ObjectId(id));
    const users = await SubAdmin.find({ _id: { $in: objectIds } });
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // Step 2: Group bets by gameId + marketName (each market needs its own API call)
    const groupedBets = gameBets.reduce((acc, bet) => {
      if (!bet?.gameId) return acc;
      const groupKey = `${bet.gameId}_${bet.marketName || 'unknown'}`;
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(bet);
      return acc;
    }, {});

    // Step 3: Process each game-market group
    for (const groupKey of Object.keys(groupedBets)) {
      const gameId = groupKey.split('_')[0];
      const validBets = groupedBets[groupKey].filter(
        (b) => b?._id && b.status === 0 && b.sid
      );
      if (!validBets.length) continue;

      const sampleBet = validBets[0];
      let resultData;

      // Get API result
      try {
        const payload = {
          event_id: Number(sampleBet.gameId),
          event_name: sampleBet.eventName,
          market_id: sampleBet.market_id,
          market_name: toApiMarketName(sampleBet.marketName),
          client_ref: null,
          sport_id: sampleBet.sid,
        };

        if (process.env.DEV_MOCK_API === '1') {
          resultData = { final_result: 'Sorana Cirstea' };
        } else {
          resultData = await apiGetResult(payload);
        }
      } catch (err) {
        console.warn(`API error for game ${gameId}:`, err.message);
        continue;
      }

      if (!resultData?.final_result) continue;

      const winner = resultData.final_result.trim();

      // Check if match is voided (case-insensitive)
      const isVoid = winner.toLowerCase() === 'void';
      const isTied = winner.toLowerCase() === 'tied';

      // Step 4: Process bets with service
      for (const bet of validBets) {
        try {
          const user = userMap.get(bet.userId.toString());
          if (!user) {
            continue;
          }

          // Handle cashed-out bets: apply stored cashoutValue as P/L
          if (bet.isCashedOut) {
            const cashoutValue = bet.cashoutValue || 0;
            const cashoutStatus = cashoutValue >= 0 ? 1 : 2; // WIN or LOSS

            const claimedBet = await betModel.findOneAndUpdate(
              { _id: bet._id, status: 0 },
              {
                $set: {
                  status: cashoutStatus,
                  resultAmount: Math.abs(cashoutValue),
                  profitLossChange: cashoutValue,
                  betResult: 'CASHOUT',
                  settledAt: new Date(),
                },
              },
              { new: true }
            );
            if (!claimedBet) {
              console.log(
                `[SPORTS] SKIPPED cashed-out bet ${bet._id} - Already settled`
              );
              continue;
            }

            if (!isVoid) {
              console.log(
                `[SPORTS $inc CASHOUT] betId=${bet._id} userId=${bet.userId} cashoutValue=${cashoutValue}`
              );
              await SubAdmin.findByIdAndUpdate(bet.userId, {
                $inc: {
                  balance: cashoutValue,
                  bettingProfitLoss: cashoutValue,
                },
              });
            }

            // Update bet history for cashed-out bet
            const cashoutHistoryRecords = await betHistoryModel.find({
              betId: bet._id.toString(),
              status: 0,
            });
            for (const historyRecord of cashoutHistoryRecords) {
              await betHistoryModel.updateOne(
                { _id: historyRecord._id },
                {
                  $set: {
                    status: isVoid ? 3 : cashoutStatus,
                    resultAmount: isVoid ? 0 : Math.abs(cashoutValue),
                    profitLossChange: isVoid ? 0 : cashoutValue,
                    betResult: isVoid ? 'VOID' : 'CASHOUT',
                    settledBy: 'cashout',
                    settledAt: new Date(),
                  },
                }
              );
            }

            totalBetsProcessed++;
            continue;
          }

          // USE SERVICE: Settle or void sports bet
          let settlementResult;
          if (isVoid) {
            settlementResult = await sportsSettlementService.voidSportsBet(bet);
          } else if (isTied) {
            settlementResult = await sportsSettlementService.tiedSportsBet(
              bet,
              user
            );
          } else {
            settlementResult = await sportsSettlementService.settleSportsBet(
              bet,
              user,
              winner
            );
          }

          if (!settlementResult.success) {
            console.error(
              `Failed to ${isVoid ? 'void' : 'settle'} sports bet ${bet._id}:`,
              settlementResult.message
            );
            continue;
          }

          // Atomic claim: only settle if bet is still unsettled
          // Prevents double settlement when multiple PM2 processes run cron simultaneously
          const claimedBet = await betModel.findOneAndUpdate(
            { _id: bet._id, status: 0 },
            { $set: settlementResult.betUpdates },
            { new: true }
          );
          if (!claimedBet) {
            console.log(
              `[SPORTS] SKIPPED Bet ${bet._id} - Already settled by another process`
            );
            continue;
          }
          Object.assign(bet, settlementResult.betUpdates);

          if (!isVoid && settlementResult.userUpdates) {
            console.log(
              `[SPORTS $inc] betId=${bet._id} userId=${bet.userId} balanceChange=${settlementResult.userUpdates.balanceChange} bplChange=${settlementResult.userUpdates.profitLossChange}`
            );
            await SubAdmin.findByIdAndUpdate(bet.userId, {
              $inc: {
                balance: settlementResult.userUpdates.balanceChange,
                bettingProfitLoss:
                  settlementResult.userUpdates.profitLossChange,
              },
            });
          }

          // UPDATE BETHISTORY: Settle/void each individual bet history record
          const betHistoryRecords = await betHistoryModel.find({
            betId: bet._id.toString(),
            status: 0,
          });

          for (const historyRecord of betHistoryRecords) {
            // Handle void for history records
            if (isVoid) {
              await betHistoryModel.updateOne(
                { _id: historyRecord._id },
                {
                  $set: {
                    status: 3, // VOID
                    resultAmount: Math.abs(historyRecord.price || 0),
                    profitLossChange: 0, // explicit: void = no P&L impact
                    betResult: 'VOID',
                    settledBy: bet.settledBy || 'api',
                    settledAt: bet.settledAt || Date.now(),
                  },
                }
              );
            } else {
              // Existing settlement logic for history records
              const historyTeam = (historyRecord.teamName || '').trim();
              const winnerTeam = (bet.betResult || '').trim();
              const historyWin =
                historyTeam &&
                winnerTeam &&
                historyTeam.toLowerCase() === winnerTeam.toLowerCase();

              let historyStatus;
              let historyResultAmount;
              let historyProfitLossChange;

              if (historyRecord.otype === 'back') {
                if (historyWin) {
                  historyStatus = 1;
                  historyResultAmount = Math.abs(historyRecord.betAmount || 0);
                  historyProfitLossChange = historyRecord.betAmount || 0;
                } else {
                  historyStatus = 2;
                  historyResultAmount = Math.abs(historyRecord.price || 0);
                  historyProfitLossChange = -(historyRecord.price || 0);
                }
              } else {
                if (historyWin) {
                  historyStatus = 2;
                  historyResultAmount = Math.abs(historyRecord.price || 0);
                  historyProfitLossChange = -(historyRecord.price || 0);
                } else {
                  historyStatus = 1;
                  historyResultAmount = Math.abs(historyRecord.betAmount || 0);
                  historyProfitLossChange = historyRecord.betAmount || 0;
                }
              }

              await betHistoryModel.updateOne(
                { _id: historyRecord._id },
                {
                  $set: {
                    status: historyStatus,
                    resultAmount: historyResultAmount,
                    profitLossChange: historyProfitLossChange,
                    betResult: winnerTeam,
                    settledBy: bet.settledBy || 'api',
                    settledAt: bet.settledAt || Date.now(),
                  },
                }
              );

              console.log(
                ` [SPORTS BETHISTORY] Settled: ${historyRecord._id} Team:${historyTeam} Winner:${winnerTeam} Won:${historyWin} Status:${historyStatus} Amount:${historyResultAmount}`
              );
            }
          }

          totalBetsProcessed++;
        } catch (err) {
          console.error(`Error processing bet ${bet._id}:`, err.message);
        }
      }
    }

    // Recalculate exposure and send updates
    const allProcessedUserIds = [
      ...new Set(gameBets.map((b) => b.userId.toString())),
    ];

    for (const userId of allProcessedUserIds) {
      try {
        const updatedPendingBets = await betModel.find({
          userId: userId,
          status: 0,
        });

        const newExposure =
          sportsSettlementService.calculateExposure(updatedPendingBets);

        // Atomic: set exposure and recalculate avbalance from fresh balance
        const freshUser = await SubAdmin.findByIdAndUpdate(
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

        if (freshUser) {
          sendBalanceUpdates(userId, freshUser.avbalance);
          sendExposureUpdates(userId, newExposure);
          sendOpenBetsUpdates(userId, null);
        }
      } catch (err) {
        console.error(
          `Error recalculating exposure for user ${userId}:`,
          err.message
        );
      }
    }

    // USE SERVICE: Propagate upline updates
    if (allProcessedUserIds.length > 0) {
      await updateAllUplines(allProcessedUserIds);
    }

    const processingTime = Date.now() - startTime;

    return (
      res?.status?.(200).json({
        message: 'All bets processed successfully',
        total: totalBetsProcessed,
        processingTimeMs: processingTime,
        gamesProcessed: Object.keys(groupedBets).length,
      }) || { success: true, total: totalBetsProcessed }
    );
  } catch (error) {
    console.error('Error in updateResultOfBets:', error.message);
    return (
      res?.status?.(500).json({ message: 'Server error' }) || {
        success: false,
        error: error.message,
      }
    );
  }
};

export const updateResultOfCasinoBets = async (req, res) => {
  const startTime = new Date().toISOString();

  //  Check if already processing (prevent concurrent executions)
  if (isProcessingCasinoBets) {
    // console.log(` [${startTime}] SKIPPED - Already processing casino bets`);
    const response = {
      message: 'Already processing casino bets, skipped',
      total: 0,
    };
    return res?.status ? res.status(200).json(response) : response;
  }

  //  #1: Acquire lock
  isProcessingCasinoBets = true;
  // console.log(` [${startTime}] LOCK ACQUIRED - Starting casino settlement`);

  const TARGET_BETTYPE = 'casino';
  // const TARGET_MARKET = 'WINNER';
  let totalBetsProcessed = 0;

  const timeStamp = new Date().toISOString();

  try {
    // Step 1: Fetch all unsettled casino bets
    const bets = await betModel.find({
      status: 0,
      betType: TARGET_BETTYPE,
    });

    if (!bets.length) {
      try {
        //  Get active game IDs from connected WebSocket clients
        const activeGameIds = [
          ...new Set(
            clients
              .filter((client) => client.apitype === 'casino' && client.gameid)
              .map((client) => client.gameid)
          ),
        ];

        // If no clients connected, use default game IDs
        const gameIds = activeGameIds.length > 0 ? activeGameIds : ['poison20'];

        for (const gameId of gameIds) {
          try {
            // Get results for this game with retry logic
            let providerResp = null;
            let retryCount = 0;
            const maxRetries = 2;

            while (retryCount <= maxRetries) {
              try {
                const casinoResultData = await apiFetchCasinoResult(gameId);
                providerResp = { data: casinoResultData };
                break; // Success, exit retry loop
              } catch (apiErr) {
                retryCount++;
                console.warn(
                  ` [RESULT BROADCAST] API attempt ${retryCount} failed for ${gameId}:`,
                  apiErr.message
                );

                if (retryCount > maxRetries) {
                  providerResp = {
                    data: {
                      res: [
                        {
                          mid: Date.now(),
                          winner: '1',
                          gameId: gameId,
                          timestamp: new Date().toISOString(),
                        },
                      ],
                    },
                  };
                } else {
                  await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * retryCount)
                  );
                }
              }
            }

            const resultData = providerResp?.data;
            const resultsArray = resultData?.data?.res || resultData?.res || [];

            if (resultsArray && resultsArray.length > 0) {
              console.log(
                ` [DEBUG] Results array found for ${gameId}:`,
                resultsArray.length,
                'results'
              );

              //  FIXED: Only send RECENT results (not old cached results)
              if (resultsArray.length > 0) {
                const recentResults = resultsArray;

                if (recentResults.length > 0) {
                  // Sort by mid to get the most recent
                  const sortedRecentResults = recentResults.sort(
                    (a, b) => (b.mid || 0) - (a.mid || 0)
                  );
                  const latestRecentResult = sortedRecentResults[0];

                  const latestRoundId = latestRecentResult.mid.toString();
                } else {
                  console.log(` [FILTER] No results found for ${gameId}`);
                }
              }
            } else {
              console.log(
                ` [DEBUG] No results array or empty results for ${gameId}`
              );
            }
          } catch (err) {
            console.error(
              ` [RESULT BROADCAST] Error getting results for ${gameId}:`,
              err.message
            );
          }
        }
      } catch (err) {
        console.error(
          ` [RESULT BROADCAST] Error in result broadcasting:`,
          err.message
        );
      }

      const response = {
        message: 'All casino bets processed successfully',
        total: 0,
      };

      //  CRITICAL FIX: Release lock before early return
      const endTime = new Date().toISOString();
      isProcessingCasinoBets = false;

      return res?.status ? res.status(200).json(response) : response;
    }

    // Step 2: Group bets by gameId and collect unique userIds
    const groupedBets = bets.reduce((acc, b) => {
      const gid = b.gameId || 'unknown';
      if (!acc[gid]) acc[gid] = [];
      acc[gid].push(b);
      return acc;
    }, {});

    const userIds = [...new Set(bets.map((b) => b.userId))];
    let allProcessedUserIds = [];
    // console.log('The grouped bets of Casino are', groupedBets);

    // Step 4: Process each game group
    for (const gameId of Object.keys(groupedBets)) {
      const group = groupedBets[gameId];
      const roundId = group[0]?.roundId;
      // console.log('The group Of Casino is', group, 'and the roundId is', roundId);

      let providerResp = null;

      // Step 4a: Get provider response
      if (String(process.env.USE_MOCK_CASINO_API) === '0') {
        console.log(
          `[updateResultOfCasinoBets] using mock provider for gameId=${gameId}`
        );
        providerResp = {
          data: { res: [{ mid: 174250902211301, winner: '1' }] },
        };
      } else {
        try {
          // console.log('before lucky7eu2 api call');

          const casinoResultData = await apiFetchCasinoResult(gameId);
          providerResp = { data: casinoResultData };
        } catch (err) {
          console.error(
            `[updateResultOfCasinoBets] provider call failed for gameId=${gameId}`,
            err.message || err
          );
          continue;
        }
      }

      // Step 4b: Parse provider response
      let resultData = providerResp?.data;
      if (typeof resultData === 'string') {
        try {
          resultData = JSON.parse(resultData);
        } catch (e) {
          console.warn(
            `[updateResultOfCasinoBets] provider returned non-JSON body for gameId=${gameId}`
          );
          continue;
        }
      }

      let resultsArray = resultData?.data?.res || resultData?.res || [];
      if (!Array.isArray(resultsArray) || resultsArray.length === 0) {
        const dataObj = resultData?.data || resultData;
        const items = [];
        if (dataObj?.t1) items.push(dataObj.t1);
        if (dataObj?.t2) items.push(dataObj.t2);

        resultsArray = items.map((item) => ({
          mid: item.rid || item.mid,
          winner: item.win || item.winner,
          rdesc: item.rdesc,
          winnat: item.winnat,
          card: item.card,
        }));
      }

      if (!Array.isArray(resultsArray)) {
        console.warn(
          `[updateResultOfCasinoBets] provider returned unexpected shape for gameId=${gameId}`
        );
        continue;
      }

      // Step 4c: Create results map
      const resultsByMid = new Map();
      for (const r of resultsArray) {
        if (r?.mid != null) resultsByMid.set(String(r.mid), r);
      }

      // Step 5: Process bets in batch to avoid multiple saves
      const betUpdates = [];
      const userUpdates = new Map();

      for (const bet of group) {
        const gameId = bet.gameId?.toLowerCase();
        //         lucky7Logger('LUCKY7  bet gameId', gameId);
        // lucky7Logger('LUCKY7  bet bet', bet);
        if (
          [
            'lucky7',
            'lucky7eu',
            'lucky7eu2',
            'lucky5',
            'lucky15',
            'ballbyball',
            'baccarat',
            'baccarat2',
            'teensin',
            'poker6',
            'poker',
            'poker20',
            'abj',
            'poison',
            '3cardj',
            'ab4',
            'ab3',
            'card32',
            'card32eu',
            'dt202',
            'dt20',
            'dtl20',
            'dt6',
            'roulette11',
            'roulette12',
            'roulette13',
            'ourroullete',
            'teen20',
            'teen20b',
            'teen20c',
            'joker20',
            'teenmuf',
            'teen41',
            'teen42',
          ].includes(gameId)
        ) {
          // lucky7Logger('LUCKY7  bet 2', bet);
          // lucky7Logger('LUCKY7  providerResp?.data 2', providerResp?.data);
          await handleLucky7BetSettlement(bet, providerResp?.data);
          continue;
        }
        try {
          const freshBet = await betModel.findOne({
            _id: bet._id,
            status: 0,
          });

          if (!freshBet) {
            const skipTime = new Date().toISOString();
            console.log(
              ` [${skipTime}] SKIPPED Bet:${bet._id} Round:${bet.roundId} - Already settled`
            );
            continue;
          }

          Object.assign(bet, freshBet.toObject());

          const user = await SubAdmin.findById(bet.userId);
          if (!user) {
            console.warn(
              `[updateResultOfCasinoBets] user not found for bet ${bet._id}`
            );
            continue;
          }

          const roundIdStr = String(bet.roundId || bet.market_id || '');
          let matchingResult = resultsByMid.get(roundIdStr);

          if (!matchingResult && roundIdStr.includes('_')) {
            const mainRoundId = roundIdStr.split('_')[0];
            matchingResult = resultsByMid.get(mainRoundId);
          }

          if (!matchingResult) {
            console.warn(
              `[updateResultOfCasinoBets] no matching result for bet ${bet._id} roundId=${roundIdStr}`
            );
            continue;
          }

          let winnerTeam = '';
          let betTeam = '';
          let win = false;

          const winnerRaw = (
            matchingResult.winner ||
            matchingResult.win ||
            ''
          ).trim();
          winnerTeam =
            winnerRaw === '1'
              ? 'PLAYER A'
              : winnerRaw === '2'
                ? 'PLAYER B'
                : winnerRaw
                  ? winnerRaw
                  : 'winner';

          betTeam = (bet.teamName || '').trim();
          win =
            betTeam &&
            ((winnerTeam &&
              betTeam.toLowerCase() === winnerTeam.toLowerCase()) ||
              (matchingResult.winnat &&
                betTeam.toLowerCase() ===
                  matchingResult.winnat.toLowerCase()) ||
              (matchingResult.rdesc &&
                betTeam
                  .toLowerCase()
                  .includes(matchingResult.rdesc.toLowerCase())) ||
              (winnerRaw &&
                betTeam.toLowerCase().includes(winnerRaw.toLowerCase())));

          // Step 5c: Calculate settlement
          let winAmount = 0;
          let userBalanceChange = 0;
          let userAvBalanceChange = 0;
          let userProfitLossChange = 0;

          if (bet.otype === 'back') {
            if (win) {
              // console.log("jeet gya");
              // console.log("bet result amount is:",bet.betAmount);
              // Back bet wins - handle offset bets with negative betAmount
              if (bet.betAmount < 0) {
                // Offset bet: betAmount is the net result of combined position
                userBalanceChange = bet.betAmount; // -38 (net loss despite winning)
                userAvBalanceChange = 0; // No change - avbalance already reflects locked amount
                userProfitLossChange = bet.betAmount; // -38
                bet.resultAmount = Math.abs(bet.betAmount); // 38 (absolute loss amount)
                bet.status = 2; // ❗ Set status to LOSS because user loses money
              } else {
                // Normal back bet
                winAmount = bet.betAmount + bet.price;
                userBalanceChange = winAmount - bet.price;
                userAvBalanceChange = winAmount;
                userProfitLossChange = winAmount - bet.price;
                bet.resultAmount = Math.abs(winAmount - bet.price);
                bet.status = 1; //  Status 1 = WIN (user gains money)
              }
              bet.settledBy = 'api';
              bet.settledAt = Date.now();
            } else {
              // console.log("jeet gya2");
              // Back bet loses - unified logic using price (stake at risk)
              // Works for ALL cases:
              //   price > 0  → normal loss (user loses stake)
              //   price = 0  → break-even offset (no loss)
              //   price < 0  → guaranteed profit (user gains)
              //   betAmount < 0 with price > 0 → guaranteed loss (user loses price)
              {
                userBalanceChange = -bet.price;
                userAvBalanceChange = 0;
                userProfitLossChange = -bet.price;
                bet.resultAmount = Math.abs(bet.price);
                bet.status = bet.price === 0 ? 1 : 2; // break-even → status 1, actual loss → status 2
                // console.log("bet status is:",bet.status);
              }
              bet.settledBy = 'api';
              bet.settledAt = Date.now();
            }
          } else {
            // lay bet logic here if needed
            if (win) {
              userBalanceChange = -bet.price;
              userAvBalanceChange = 0;
              userProfitLossChange = -bet.price;
              bet.resultAmount = Math.abs(bet.price);
              bet.settledBy = 'api';
              bet.settledAt = Date.now();
              bet.status = 2;
            } else {
              // LAY bet wins when the team LOSES

              // Handle negative price (guaranteed profit scenario from offset bets)
              if (bet.price < 0) {
                // Negative price means user has guaranteed profit locked in
                // Don't use totalReturn formula which would produce negative value
                userBalanceChange = bet.betAmount; // +100
                userAvBalanceChange = bet.betAmount; // +100 (NOT negative!)
                userProfitLossChange = bet.betAmount; // +100
                winAmount = bet.betAmount;
                bet.resultAmount = Math.abs(bet.betAmount);
              } else {
                // Normal LAY bet wins
                // User gets back their staked amount (price) + profit (betAmount)
                const stakedAmount = bet.price;
                const profitAmount = bet.betAmount;
                const totalReturn = stakedAmount + profitAmount;

                userBalanceChange = profitAmount;
                userAvBalanceChange = totalReturn;
                userProfitLossChange = profitAmount;
                winAmount = totalReturn;
                bet.resultAmount = Math.abs(profitAmount);
              }

              bet.settledBy = 'api';
              bet.settledAt = Date.now();
              bet.status = 1;
            }
          }

          const claimedCasinoBet = await betModel.findOneAndUpdate(
            { _id: bet._id, status: 0 },
            {
              $set: {
                status: bet.status,
                resultAmount: bet.resultAmount,
                settledBy: bet.settledBy,

                settledAt: bet.settledAt,
                profitLossChange: userProfitLossChange,
                betResult: Array.isArray(winnerTeam)
                  ? winnerTeam.join(',')
                  : winnerTeam,
                betResultArray: bet.betResultArray,
              },
            },
            { new: true }
          );

          console.log(
            'claimedCasinoBet is:',
            JSON.stringify(claimedCasinoBet, null, 2)
          );

          // console.log("claimedCasinoBet is:",JSON.stringify(claimedCasinoBet, null, 2));
          if (!claimedCasinoBet) {
            console.log(
              `[CASINO] SKIPPED Bet ${bet._id} - Already settled by another process`
            );
            continue;
          }

          // Step 5d: Accumulate user changes (avoid multiple saves)
          const userId = user._id.toString();
          if (!userUpdates.has(userId)) {
            userUpdates.set(userId, {
              user,
              balanceChange: 0,
              avBalanceChange: 0,
              profitLossChange: 0,
            });
          }

          const userUpdate = userUpdates.get(userId);
          userUpdate.balanceChange += userBalanceChange;
          userUpdate.avBalanceChange += userAvBalanceChange;
          userUpdate.profitLossChange += userProfitLossChange;

          betUpdates.push(claimedCasinoBet);
          totalBetsProcessed++;
        } catch (err) {
          console.error(
            `[updateResultOfCasinoBets] error processing bet ${bet._id}:`,
            err.message || err
          );
        }
      }

      // Step 6: Batch update users (atomic $inc per user - prevents lost updates)
      for (const [userId, update] of userUpdates) {
        try {
          const { balanceChange, avBalanceChange, profitLossChange } = update;

          console.log(
            `[CASINO $inc] userId=${userId} balanceChange=${balanceChange} avBalanceChange=${avBalanceChange} bplChange=${profitLossChange}`
          );
          await SubAdmin.findByIdAndUpdate(userId, {
            $inc: {
              balance: balanceChange,
              avbalance: avBalanceChange,
              bettingProfitLoss: profitLossChange,
            },
          });

          // Send WebSocket updates with fresh values
          const freshUser = await SubAdmin.findById(userId);
          sendBalanceUpdates(userId, freshUser.avbalance);
          sendExposureUpdates(userId, freshUser.exposure);
          sendOpenBetsUpdates(userId, null);
        } catch (err) {
          console.error(
            `[updateResultOfCasinoBets] error saving user:`,
            err.message || err
          );
        }
      }

      // Step 7: Batch update bets
      if (betUpdates.length > 0) {
        try {
          await Promise.all(betUpdates.map((bet) => bet.save()));
          console.log(
            ` [SETTLEMENT] Saved ${betUpdates.length} bets for gameId=${gameId}`
          );

          //  UPDATE BETHISTORY: Settle each individual bet history record
          // Each betHistory record represents an individual bet and must be settled based on its OWN teamName
          let totalBetHistoryUpdated = 0;

          for (const bet of betUpdates) {
            try {
              // Find ALL betHistory records linked to this bet (unsettled only)
              const betHistoryRecords = await betHistoryModel.find({
                betId: bet._id.toString(),
                status: 0,
              });

              // Settle each betHistory record INDIVIDUALLY based on its own teamName
              for (const historyRecord of betHistoryRecords) {
                const historyTeam = (historyRecord.teamName || '').trim();

                let historyWin;
                let winnerTeam;

                winnerTeam = (bet.betResult || '').trim();
                historyWin =
                  historyTeam &&
                  winnerTeam &&
                  historyTeam.toLowerCase() === winnerTeam.toLowerCase();

                let historyStatus;
                let historyResultAmount;
                let historyProfitLossChange;

                if (historyRecord.otype === 'back') {
                  if (historyWin) {
                    // Individual back bet WON - profit is betAmount
                    historyStatus = 1;
                    historyResultAmount = Math.abs(
                      historyRecord.betAmount || 0
                    );
                    historyProfitLossChange = historyRecord.betAmount || 0;
                  } else {
                    // Individual back bet LOST - lost the stake (price)
                    historyStatus = 2;
                    historyResultAmount = Math.abs(historyRecord.price || 0);
                    historyProfitLossChange = -(historyRecord.price || 0);
                  }
                } else {
                  // Lay bet
                  if (historyWin) {
                    // Lay bet LOSES when selection wins
                    historyStatus = 2;
                    historyResultAmount = Math.abs(historyRecord.price || 0);
                    historyProfitLossChange = -(historyRecord.price || 0);
                  } else {
                    // Lay bet WINS when selection loses
                    historyStatus = 1;
                    historyResultAmount = Math.abs(
                      historyRecord.betAmount || 0
                    );
                    historyProfitLossChange = historyRecord.betAmount || 0;
                  }
                }

                await betHistoryModel.updateOne(
                  { _id: historyRecord._id },
                  {
                    $set: {
                      status: historyStatus,
                      resultAmount: historyResultAmount,
                      profitLossChange: historyProfitLossChange,
                      betResult: Array.isArray(winnerTeam)
                        ? winnerTeam.join(',')
                        : winnerTeam,
                      settledBy: bet.settledBy || 'api',
                      settledAt: bet.settledAt || Date.now(),
                    },
                  }
                );

                totalBetHistoryUpdated++;

                console.log(
                  ` [BETHISTORY] Settled: ${historyRecord._id} Team:${historyTeam} Winner:${winnerTeam} Won:${historyWin} Status:${historyStatus} Amount:${historyResultAmount}`
                );
              }
            } catch (err) {
              console.error(
                `[updateResultOfCasinoBets] error updating bet history for bet ${bet._id}:`,
                err.message || err
              );
            }
          }

          console.log(
            ` [SETTLEMENT] Updated ${totalBetHistoryUpdated} bet history records for gameId=${gameId}`
          );
        } catch (err) {
          console.error(
            `[updateResultOfCasinoBets] error saving bets:`,
            err.message || err
          );
        }
      }

      // const allProcessedUserIds = [...new Set(group.map(b => b.userId.toString()))];
      const currentGroupUserIds = [
        ...new Set(group.map((b) => b.userId.toString())),
      ];
      allProcessedUserIds = [
        ...new Set([...allProcessedUserIds, ...currentGroupUserIds]),
      ];

      for (const userId of currentGroupUserIds) {
        try {
          const updatedPendingBets = await betModel.find({
            userId: userId,
            status: 0,
          });

          // Market-based exposure calculation (handles offsetting correctly)
          const newExposure = calculateAllExposure(updatedPendingBets);

          // Atomic exposure + avbalance update (prevents stale overwrites from concurrent cron jobs)
          const freshUser = await SubAdmin.findByIdAndUpdate(
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

          if (freshUser) {
            console.log('The exposure of the user is', freshUser.exposure);
            console.log('The avbalance of the user is', freshUser.avbalance);
            console.log(
              `[DEBUG] User ${freshUser.userName} saved successfully`
            );
          }
        } catch (err) {
          console.error(
            ` Error recalculating exposure for user ${userId}:`,
            err.message
          );
        }
      }
    }

    const socketUpdates = allProcessedUserIds.map(async (userId) => {
      try {
        const user = await SubAdmin.findById(userId);
        if (user) {
          return Promise.all([
            sendBalanceUpdates(userId, user.avbalance),
            sendExposureUpdates(userId, user.exposure),
            sendOpenBetsUpdates(userId, null),
          ]);
        }
      } catch (err) {
        console.error(
          ` Error sending WebSocket update for user ${userId}:`,
          err.message
        );
      }
    });

    await Promise.all(socketUpdates);
    console.timeEnd('CASINO_SOCKET_UPDATES');
    console.log(
      ` WebSocket updates sent for ${allProcessedUserIds.length} users`
    );

    // Update all upline balances after casino bet settlement
    try {
      console.time('CASINO_RESULT_UPLINE_UPDATE');
      await updateAllUplines(allProcessedUserIds);
      console.timeEnd('CASINO_RESULT_UPLINE_UPDATE');
      // await updateAllUplines(user._id);
    } catch (err) {
      console.error(
        ` [CASINO SETTLEMENT] Error updating upline balances:`,
        err.message
      );
    }

    //  Result broadcasting - runs regardless of whether there are bets or not
    // This ensures all users get casino results, even if they haven't placed bets
    for (const gameId of Object.keys(groupedBets)) {
      try {
        // Get results for this game
        const resultData = await apiFetchCasinoResult(gameId);
        const resultsArray = resultData?.data?.res || resultData?.res || [];

        if (resultsArray.length > 0) {
          console.log(
            ` [DEBUG] Found ${resultsArray.length} results for ${gameId}`
          );

          // Frontend now fetches results via API when round changes (useRef detection)

          const sortedResults = resultsArray.sort(
            (a, b) => (b.mid || 0) - (a.mid || 0)
          );
          const latestResult = sortedResults[0];
          const latestRoundId = latestResult.mid.toString();

          console.log(
            ` [SETTLEMENT] Results available via API for ${gameId} (latest: ${latestRoundId})`
          );
        } else {
          console.log(
            ` [DEBUG] No results array or empty results for ${gameId}`
          );
        }
      } catch (err) {
        console.error(
          ` [RESULT BROADCAST] Error getting results for ${gameId}:`,
          err.message
        );
      }
    }

    // Step 8: Final response
    const response = {
      message: 'All casino bets processed successfully',
      total: totalBetsProcessed,
    };

    //  Release lock after successful processing
    const endTime = new Date().toISOString();
    isProcessingCasinoBets = false;
    console.log(
      ` [${endTime}] LOCK RELEASED - Processed ${totalBetsProcessed} bets`
    );

    return res?.status ? res.status(200).json(response) : response;
  } catch (err) {
    const errorTime = new Date().toISOString();
    console.error(` [${errorTime}] ERROR in casino settlement:`, err.message);

    // FIX #1: Release lock on error (prevents permanent lock)
    isProcessingCasinoBets = false;
    console.log(` [${errorTime}] LOCK RELEASED after error`);

    const errorResponse = {
      message: 'Casino Server error',
      error: err.message || err,
    };
    return res?.status ? res.status(500).json(errorResponse) : errorResponse;
  }
};

const normalizeLucky7RunsText = (text) =>
  text?.toLowerCase().replace('runs', 'run').trim();

const wicketResults = [
  'bowled',
  'caught',
  'lbw',
  'run out',
  'stumped',
  'others',
];

const extraResults = ['wide', 'no ball', 'bye', 'leg bye'];

const boundaryResults = ['4 run', '6 run', '4 runs', '6 runs'];

const isLucky7RunsMatch = (teamName, result) => {
  const normalizedTeam = normalizeLucky7RunsText(teamName);
  const normalizedResult = normalizeLucky7RunsText(result);

  // Boundary
  if (normalizedTeam === 'boundary') {
    return boundaryResults.includes(normalizedResult);
  }

  // Wicket
  if (normalizedTeam === 'wicket') {
    return wicketResults.includes(normalizedResult);
  }

  // Extra Runs
  if (normalizedTeam === 'extra runs') {
    return extraResults.includes(normalizedResult);
  }

  // Normal Runs
  return normalizedTeam === normalizedResult;
};
const isBaccaratResultMatch = (betTeam, resultData) => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const winners = resultData.rdesc.split('#').map((x) => x.trim());

  const winner = winners[0];
  const pairLabel = winners[1];
  const perfectPair = winners[2];
  const eitherPair = winners[3];
  const bigSmall = winners[4];

  const pairLabels = pairLabel?.split('|').map((x) => x.trim());

  let actualResult = '';
  let isWin = false;

  switch (betTeam.trim()) {
    // MAIN RESULT
    case 'Player':
    case 'Banker':
    case 'Tie':
      actualResult = winner;
      isWin = winner === betTeam;
      break;

    // PLAYER PAIR
    case 'Player Pair':
      actualResult = pairLabel;
      isWin = pairLabels.includes('Player Pair');
      break;

    // BANKER PAIR
    case 'Banker Pair':
      actualResult = pairLabel;
      isWin = pairLabels.includes('Banker Pair');
      break;

    // PERFECT PAIR
    case 'Perfect Pair':
      actualResult = perfectPair;
      isWin = perfectPair === 'Yes';
      break;

    // EITHER PAIR
    case 'Either Pair':
      actualResult = eitherPair;
      isWin = eitherPair === 'Yes';
      break;

    // BIG SMALL
    case 'Big':
    case 'Small':
      actualResult = bigSmall;
      isWin = bigSmall === betTeam;
      break;

    default:
      actualResult = '';
      isWin = false;
  }

  return {
    isWin,
    actualResult,
  };
};
const isBaccarat2ResultMatch = (betTeam, resultData) => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const winners = resultData.rdesc.split('#').map((x) => x.trim());

  const winner = winners[0];

  // "Player Pair | Banker Pair"
  const pairLabel = winners[1];

  // score result
  const score = winners[2];

  const pairLabels = pairLabel?.split('|').map((x) => x.trim());

  let actualResult = '';
  let isWin = false;

  switch (betTeam.trim()) {
    // MAIN RESULT
    case 'Player':
    case 'Banker':
    case 'Tie':
      actualResult = winner;

      isWin = winner === betTeam;

      break;

    // PLAYER PAIR
    case 'Player Pair':
      actualResult = pairLabel;

      isWin = pairLabels.includes('Player Pair');

      break;

    // BANKER PAIR
    case 'Banker Pair':
      actualResult = pairLabel;

      isWin = pairLabels.includes('Banker Pair');

      break;

    // SCORE 1-4
    case 'Score 1-4':
      actualResult = `Score ${score}`;

      isWin = ['1', '2', '3', '4'].includes(score);

      break;

    // SCORE 5-6
    case 'Score 5-6':
      actualResult = `Score ${score}`;

      isWin = ['5', '6'].includes(score);

      break;

    // SCORE 7
    case 'Score 7':
      actualResult = `Score ${score}`;

      isWin = score === '7';

      break;

    // SCORE 8
    case 'Score 8':
      actualResult = `Score ${score}`;

      isWin = score === '8';

      break;

    // SCORE 9
    case 'Score 9':
      actualResult = `Score ${score}`;

      isWin = score === '9';

      break;

    default:
      actualResult = '';
      isWin = false;
  }

  return {
    isWin,
    actualResult,
  };
};
const is29CardBaccaratResultMatch = (betTeam, resultData, otype = 'back') => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const winners = resultData.rdesc.split('#').map((x) => x.trim());

  /*
    FORMAT

    0 => Winner
    1 => High Card Winner
    2 => Pair Result
    3 => Color Plus
    4 => Lucky 9
  */

  const winner = winners[0];
  const highCard = winners[1];
  const pairResult = winners[2];
  const colorPlus = winners[3];
  const lucky9 = winners[4];

  const pairResults = pairResult?.split('|').map((x) => x.trim());

  const colorResults = colorPlus?.split('|').map((x) => x.trim());

  let actualResult = '';
  let matched = false;

  switch (betTeam.trim()) {
    // PLAYER A
    case 'Player A':
      actualResult = winner;

      matched = winner.includes('Player A');

      break;

    // PLAYER B
    case 'Player B':
      actualResult = winner;

      matched = winner.includes('Player B');

      break;

    // HIGH CARD A
    case 'High Card A':
      actualResult = highCard;

      matched = highCard.includes('Player A');

      break;

    // HIGH CARD B
    case 'High Card B':
      actualResult = highCard;

      matched = highCard.includes('Player B');

      break;

    // PAIR A
    case 'Pair A':
      actualResult = pairResult;

      matched = pairResults.includes('Player A');

      break;

    // PAIR B
    case 'Pair B':
      actualResult = pairResult;

      matched = pairResults.includes('Player B');

      break;

    // COLOR PLUS A
    case 'Color Plus A':
      actualResult = colorPlus;

      matched = colorResults.some((x) => x.includes('A :'));

      break;

    // COLOR PLUS B
    case 'Color Plus B':
      actualResult = colorPlus;

      matched = colorResults.some((x) => x.includes('B :'));

      break;

    // LUCKY 9
    case 'Lucky 9':
      actualResult = lucky9;

      matched = lucky9 === 'Yes';

      break;

    default:
      actualResult = '';
      matched = false;
  }

  // BACK / LAY
  const isWin = otype?.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult,
  };
};
const isPoker6PlayersResultMatch = (betTeam, resultData, otype = 'back') => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const winners = resultData.rdesc.split('#').map((x) => x.trim());

  /*
    FORMAT

    0 => Winner Player
    1 => Poker Hand Type
  */

  const winner = winners[0];
  const handType = winners[1];

  let actualResult = '';
  let matched = false;

  const team = betTeam.trim();

  switch (team) {
    // PLAYER WINNER
    case 'Player 1':
    case 'Player 2':
    case 'Player 3':
    case 'Player 4':
    case 'Player 5':
    case 'Player 6':
      actualResult = winner;

      matched = winner.toLowerCase() === team.toLowerCase();

      break;

    // CARD TYPES
    case 'Pair':
    case 'Two pairs':
    case 'Three of a kind':
    case 'Straight':
    case 'Flush':
    case 'Full house':
    case 'Four of a kind':
    case 'Straight flush':
    case 'Royal flush':
      actualResult = handType;

      matched = handType.toLowerCase() === team.toLowerCase();

      break;

    default:
      actualResult = '';
      matched = false;
  }

  // BACK / LAY
  const isWin = otype?.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult,
  };
};
const isPoker1DayResultMatch = (betTeam, resultData, otype = 'back') => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const winners = resultData.rdesc.split('#').map((x) => x.trim());

  /*
    FORMAT

    0 => Winner
    1 => 2 Card Bonus
    2 => 7 Card Bonus
  */

  const winner = winners[0];
  const twoCardBonus = winners[1];
  const sevenCardBonus = winners[2];

  let actualResult = '';
  let matched = false;

  switch (betTeam.trim()) {
    // WINNER
    case 'Player A':
      actualResult = winner;

      matched = winner === 'Player A';

      break;

    case 'Player B':
      actualResult = winner;

      matched = winner === 'Player B';

      break;

    // PLAYER A 2 CARD BONUS
    case 'Player A 2 card Bonus':
      actualResult = twoCardBonus;

      matched = twoCardBonus.includes('A :') && !twoCardBonus.includes('A : -');

      break;

    // PLAYER B 2 CARD BONUS
    case 'Player B 2 card Bonus':
      actualResult = twoCardBonus;

      matched = twoCardBonus.includes('B :') && !twoCardBonus.includes('B : -');

      break;

    // PLAYER A 7 CARD BONUS
    case 'Player A 7 card bonus':
      actualResult = sevenCardBonus;

      matched =
        sevenCardBonus.includes('A :') && !sevenCardBonus.includes('A : -');

      break;

    // PLAYER B 7 CARD BONUS
    case 'Player B 7 card bonus':
      actualResult = sevenCardBonus;

      matched =
        sevenCardBonus.includes('B :') && !sevenCardBonus.includes('B : -');

      break;

    default:
      actualResult = '';
      matched = false;
  }

  // BACK / LAY
  const isWin = otype?.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult,
  };
};
const is2020PokerResultMatch = (betTeam, resultData, otype = 'back') => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const winners = resultData.rdesc.split('#').map((x) => x.trim());

  /*
    FORMAT

    0 => Winner
    1 => Hand Results
  */

  const winner = winners[0];
  const handResult = winners[1];

  const parts = handResult?.split('|').map((x) => x.trim());

  const aResult =
    parts
      .find((x) => x.startsWith('A :'))
      ?.replace('A :', '')
      ?.trim() || '';

  const bResult =
    parts
      .find((x) => x.startsWith('B :'))
      ?.replace('B :', '')
      ?.trim() || '';

  let actualResult = '';
  let matched = false;

  const team = betTeam.trim();

  switch (team) {
    // WINNER
    case 'Winner#A':
      actualResult = winner;

      matched = winner === 'Player A';

      break;

    case 'Winner#B':
      actualResult = winner;

      matched = winner === 'Player B';

      break;

    // ONE PAIR
    case 'One Pair#A':
      actualResult = aResult;

      matched = aResult === 'One Pair';

      break;

    case 'One Pair#B':
      actualResult = bResult;

      matched = bResult === 'One Pair';

      break;

    // TWO PAIR
    case 'Two Pair#A':
      actualResult = aResult;

      matched = aResult === 'Two Pair';

      break;

    case 'Two Pair#B':
      actualResult = bResult;

      matched = bResult === 'Two Pair';

      break;

    // THREE OF A KIND
    case 'Three of a Kind#A':
      actualResult = aResult;

      matched = aResult === 'Three of a Kind';

      break;

    case 'Three of a Kind#B':
      actualResult = bResult;

      matched = bResult === 'Three of a Kind';

      break;

    // STRAIGHT
    case 'Straight#A':
      actualResult = aResult;

      matched = aResult === 'Straight';

      break;

    case 'Straight#B':
      actualResult = bResult;

      matched = bResult === 'Straight';

      break;

    // FLUSH
    case 'Flush#A':
      actualResult = aResult;

      matched = aResult === 'Flush';

      break;

    case 'Flush#B':
      actualResult = bResult;

      matched = bResult === 'Flush';

      break;

    // FULL HOUSE
    case 'Full House#A':
      actualResult = aResult;

      matched = aResult === 'Full House';

      break;

    case 'Full House#B':
      actualResult = bResult;

      matched = bResult === 'Full House';

      break;

    // FOUR OF A KIND
    case 'Four of a Kind#A':
      actualResult = aResult;

      matched = aResult === 'Four of a Kind';

      break;

    case 'Four of a Kind#B':
      actualResult = bResult;

      matched = bResult === 'Four of a Kind';

      break;

    // STRAIGHT FLUSH
    case 'Straight Flush#A':
      actualResult = aResult;

      matched = aResult === 'Straight Flush';

      break;

    case 'Straight Flush#B':
      actualResult = bResult;

      matched = bResult === 'Straight Flush';

      break;

    default:
      actualResult = '';
      matched = false;
  }

  // BACK / LAY
  const isWin = otype?.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult,
  };
};
const isAndarBahar2ResultMatch = (betTeam, resultData, otype = 'back') => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const winners = resultData.rdesc.split('#').map((x) => x.trim());

  /*
    FORMAT

    0 => Winner (Andar / Bahar)
    1 => Joker Suit
    2 => Odd / Even
    3 => Joker Value
  */

  const winner = winners[0];
  const suit = winners[1];
  const oddEven = winners[2];
  const value = winners[3];

  let actualResult = '';
  let matched = false;

  switch (betTeam.trim()) {
    // WINNER
    case 'SA':
      actualResult = winner;

      matched = winner === 'Andar';

      break;

    case 'SB':
      actualResult = winner;

      matched = winner === 'Bahar';

      break;

    // SUITS
    case 'Joker Spade':
      actualResult = suit;

      matched = suit === 'Spade';

      break;

    case 'Joker Heart':
      actualResult = suit;

      matched = suit === 'Heart';

      break;

    case 'Joker Diamond':
      actualResult = suit;

      matched = suit === 'Diamond';

      break;

    case 'Joker Club':
      actualResult = suit;

      matched = suit === 'Club';

      break;

    // ODD / EVEN
    case 'Joker Odd':
      actualResult = oddEven;

      matched = oddEven === 'Odd';

      break;

    case 'Joker Even':
      actualResult = oddEven;

      matched = oddEven === 'Even';

      break;

    // CARD VALUES
    case 'Joker A':
      actualResult = value;

      matched = value === 'A';

      break;

    case 'Joker 2':
    case 'Joker 3':
    case 'Joker 4':
    case 'Joker 5':
    case 'Joker 6':
    case 'Joker 7':
    case 'Joker 8':
    case 'Joker 9':
    case 'Joker 10':
      actualResult = value;

      matched = value === betTeam.replace('Joker ', '');

      break;

    case 'Joker J':
      actualResult = value;

      matched = value === 'J';

      break;

    case 'Joker Q':
      actualResult = value;

      matched = value === 'Q';

      break;

    case 'Joker K':
      actualResult = value;

      matched = value === 'K';

      break;

    default:
      actualResult = '';
      matched = false;
  }

  // BACK / LAY
  const isWin = otype?.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult,
  };
};
const isTeenpattiPoisonOneDayResultMatch = (
  betTeam,
  resultData,
  otype = 'back'
) => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const winners = resultData.rdesc.split('#').map((x) => x.trim());

  /*
    FORMAT

    0 => Winner
    1 => Odd / Even
    2 => Color
    3 => Suit
  */

  const winner = winners[0];
  const oddEven = winners[1];
  const color = winners[2];
  const suit = winners[3];

  let actualResult = '';
  let matched = false;

  switch (betTeam.trim()) {
    // WINNER
    case 'Player A':
      actualResult = winner;

      matched = winner === 'Player A';

      break;

    case 'Player B':
      actualResult = winner;

      matched = winner === 'Player B';

      break;

    // ODD EVEN
    case 'Poison Even':
      actualResult = oddEven;

      matched = oddEven === 'Even';

      break;

    case 'Poison Odd':
      actualResult = oddEven;

      matched = oddEven === 'Odd';

      break;

    // COLOR
    case 'Poison Red':
      actualResult = color;

      matched = color === 'Red';

      break;

    case 'Poison Black':
      actualResult = color;

      matched = color === 'Black';

      break;

    // SUIT
    case 'Poison Heart':
      actualResult = suit;

      matched = suit === 'Heart';

      break;

    case 'Poison Diamond':
      actualResult = suit;

      matched = suit === 'Diamond';

      break;

    case 'Poison Club':
      actualResult = suit;

      matched = suit === 'Club';

      break;

    case 'Poison Spade':
      actualResult = suit;

      matched = suit === 'Spade';

      break;

    default:
      actualResult = '';
      matched = false;
  }

  // BACK / LAY
  const isWin = otype?.toLowerCase() === 'lay' ? !matched : matched;

  if (isWin) {
    actualResult = betTeam;
  }

  return {
    isWin,
    actualResult,
  };
};
const isLucky15ResultMatch = (betTeam, resultData, otype = 'back') => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const normalize = (value = '') => {
    value = value.trim().toLowerCase();

    switch (value) {
      case '0 run':
      case '0 runs':
        return '0 run';

      case '1 run':
      case '1 runs':
        return '1 run';

      case '2 run':
      case '2 runs':
        return '2 run';

      case '4 run':
      case '4 runs':
        return '4 run';

      case '6 run':
      case '6 runs':
        return '6 run';

      case 'wicket':
        return 'wicket';

      default:
        return value;
    }
  };

  const result = normalize(resultData.rdesc);
  const team = normalize(betTeam);

  const matched = team === result;

  const isWin = otype?.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult: isWin ? betTeam : resultData.rdesc.trim(),
  };
};
const is3CardsJudgementResultMatch = (
  betTeam,
  selectedCards,
  resultData,
  otype = 'back'
) => {
  if (!betTeam || !selectedCards || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  // Result cards
  const resultCards = resultData.rdesc
    .trim()
    .split(/\s+/)
    .map((x) => x.toUpperCase());

  // Selected cards
  const userCards = selectedCards.split(',').map((x) => x.trim().toUpperCase());

  // At least one card matched
  const hasMatch = userCards.some((card) => resultCards.includes(card));

  let isWin = false;

  if (betTeam.trim().toLowerCase() === 'yes') {
    isWin = otype.toLowerCase() === 'lay' ? !hasMatch : hasMatch;
  } else if (betTeam.trim().toLowerCase() === 'no') {
    // A "no" selection wins if there are no matching cards
    isWin = !hasMatch;
  }

  return {
    isWin,
    actualResult: isWin ? betTeam : resultData.rdesc.trim(),
  };
};
const isAB150CardsResultMatch = (betTeam, resultData, otype = 'back') => {
  if (!betTeam || !resultData) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const winner = (resultData.rdesc || '').trim();
  const winningCard = (resultData.winnat || '')
    .replace('Card', '')
    .trim()
    .toUpperCase();
  const winCountStr = (resultData.win || '').trim();

  const parts = betTeam.trim().split(/\s+/);

  // Example: "Andar 9"
  const betSide = parts[0];
  const betCard = parts[1]?.toUpperCase();

  let matched = false;

  if (betSide.toLowerCase() === 'card') {
    // Card count bet (e.g. "Card 136")
    matched = winCountStr === betCard;
  } else {
    // Andar/Bahar card rank bet (e.g. "Andar 9" or "Andar A")
    matched =
      winner.toLowerCase() === betSide.toLowerCase() && winningCard === betCard;
  }

  const isWin = otype?.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult: isWin ? betTeam : `${winner} ${winningCard}`,
  };
};
const is32CardsResultMatch = (betTeam, resultData, otype = 'back') => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const winner = (resultData.rdesc || '').trim();

  const matched = winner.toLowerCase() === betTeam.trim().toLowerCase();

  const isWin = otype?.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult: isWin ? betTeam : winner,
  };
};

const is32CardsBResultMatch = (betTeam, resultData, otype = 'back') => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const winners = resultData.rdesc.split('#').map((x) => x.trim());

  const winner = winners[0];
  const oddEven = winners[1];
  const color = winners[2];
  const total = winners[3];
  const single = winners[4];

  let matched = false;
  let actualResult = '';

  switch (true) {
    // --------------------
    // Winner
    // --------------------
    case /^Player\s(8|9|10|11)$/i.test(betTeam):
      actualResult = winner;
      matched = winner.toLowerCase() === betTeam.toLowerCase();
      break;

    // --------------------
    // Odd Even
    // Player 8 Odd
    // Player 10 Even
    // --------------------
    case /^Player\s(8|9|10|11)\s(Odd|Even)$/i.test(betTeam): {
      const [, player, type] = betTeam.match(
        /^Player\s(8|9|10|11)\s(Odd|Even)$/i
      );

      actualResult = oddEven;

      matched = oddEven
        .toLowerCase()
        .includes(`${player} : ${type}`.toLowerCase());

      break;
    }

    // --------------------
    // Color
    // --------------------
    case betTeam === 'Any Three Card Black':
      actualResult = color;
      matched = color === 'Black';
      break;

    case betTeam === 'Any Three Card Red':
      actualResult = color;
      matched = color === 'Red';
      break;

    case betTeam === 'Two Black Two Red':
      actualResult = color;
      matched = color === '2-2';
      break;

    // --------------------
    // Total
    // --------------------
    case betTeam === '8 & 9 Total':
      actualResult = total;
      matched = total === '8-9';
      break;

    case betTeam === '10 & 11 Total':
      actualResult = total;
      matched = total === '10-11';
      break;

    // --------------------
    // Single Number
    // --------------------
    case /^Single\s\d$/i.test(betTeam): {
      const num = betTeam.replace('Single', '').trim();

      actualResult = single;

      matched = single === num;

      break;
    }

    default:
      matched = false;
      actualResult = '';
  }

  const isWin = otype?.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult: isWin ? betTeam : actualResult,
  };
};

const isDragonTiger2ResultMatch = (betTeam, resultData, otype = 'back') => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const winners = resultData.rdesc.split('#').map((x) => x.trim());

  /*
    FORMAT

    0 => Winner
    1 => Pair
    2 => Odd / Even
    3 => Color
    4 => Card
  */

  const winner = winners[0];
  const pair = winners[1];
  const oddEven = winners[2];
  const color = winners[3];
  const cards = winners[4];

  let matched = false;
  let actualResult = '';

  // Dragon / Tiger values
  const dragonOddEven = oddEven.match(/D\s*:\s*(Odd|Even)/i)?.[1];
  const tigerOddEven = oddEven.match(/T\s*:\s*(Odd|Even)/i)?.[1];

  const dragonColor = color.match(/D\s*:\s*(Red|Black)/i)?.[1];
  const tigerColor = color.match(/T\s*:\s*(Red|Black)/i)?.[1];

  const dragonCard = cards.match(/D\s*:\s*([A2-9]|10|J|Q|K)/i)?.[1];
  const tigerCard = cards.match(/T\s*:\s*([A2-9]|10|J|Q|K)/i)?.[1];

  switch (true) {
    // ---------------- Winner ----------------

    case betTeam === 'Dragon':
    case betTeam === 'Tiger':
    case betTeam === 'Tie':
      actualResult = winner;
      matched = winner === betTeam;
      break;

    // ---------------- Pair ----------------

    case betTeam === 'Pair':
      actualResult = pair;
      matched = pair === 'Yes';
      break;

    // ---------------- Dragon Odd Even ----------------

    case /^Dragon (Odd|Even)$/i.test(betTeam): {
      const value = betTeam.replace('Dragon ', '');

      actualResult = `Dragon ${dragonOddEven}`;

      matched = dragonOddEven === value;

      break;
    }

    // ---------------- Tiger Odd Even ----------------

    case /^Tiger (Odd|Even)$/i.test(betTeam): {
      const value = betTeam.replace('Tiger ', '');

      actualResult = `Tiger ${tigerOddEven}`;

      matched = tigerOddEven === value;

      break;
    }

    // ---------------- Dragon Color ----------------

    case /^Dragon (Red|Black)$/i.test(betTeam): {
      const value = betTeam.replace('Dragon ', '');

      actualResult = `Dragon ${dragonColor}`;

      matched = dragonColor === value;

      break;
    }

    // ---------------- Tiger Color ----------------

    case /^Tiger (Red|Black)$/i.test(betTeam): {
      const value = betTeam.replace('Tiger ', '');

      actualResult = `Tiger ${tigerColor}`;

      matched = tigerColor === value;

      break;
    }

    // ---------------- Dragon Card ----------------

    case /^Dragon Card /i.test(betTeam): {
      const value = betTeam.replace('Dragon Card ', '').trim();

      actualResult = `Dragon Card ${dragonCard}`;

      matched = dragonCard?.toUpperCase() === value.toUpperCase();

      break;
    }

    // ---------------- Tiger Card ----------------

    case /^Tiger Card /i.test(betTeam): {
      const value = betTeam.replace('Tiger Card ', '').trim();

      actualResult = `Tiger Card ${tigerCard}`;

      matched = tigerCard?.toUpperCase() === value.toUpperCase();

      break;
    }

    default:
      matched = false;
      actualResult = '';
  }

  const isWin = otype?.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult: isWin ? betTeam : actualResult,
  };
};

const isOneDayDragonTigerResultMatch = (
  betTeam,
  resultData,
  otype = 'back'
) => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const winners = resultData.rdesc.split('#').map((x) => x.trim());

  /*
    FORMAT

    0 => Winner
    1 => Pair
    2 => Odd / Even
    3 => Color
    4 => Suit
  */

  const winner = winners[0];
  const pair = winners[1];
  const oddEven = winners[2];
  const color = winners[3];
  const suit = winners[4];

  const dragonOddEven = oddEven.match(/D\s*:\s*(Odd|Even)/i)?.[1];
  const tigerOddEven = oddEven.match(/T\s*:\s*(Odd|Even)/i)?.[1];

  const dragonColor = color.match(/D\s*:\s*(Red|Black)/i)?.[1];
  const tigerColor = color.match(/T\s*:\s*(Red|Black)/i)?.[1];

  const dragonSuit = suit.match(/D\s*:\s*(Spade|Heart|Diamond|Club)/i)?.[1];
  const tigerSuit = suit.match(/T\s*:\s*(Spade|Heart|Diamond|Club)/i)?.[1];

  let matched = false;
  let actualResult = '';

  switch (true) {
    // Winner
    case betTeam === 'Dragon':
    case betTeam === 'Tiger':
      actualResult = winner;
      matched = winner === betTeam;
      break;

    // Pair
    case betTeam === 'Pair':
      actualResult = pair;
      matched = pair === 'Yes';
      break;

    // Dragon Odd / Even
    case /^Dragon (Odd|Even)$/i.test(betTeam): {
      const value = betTeam.replace('Dragon ', '').trim();

      actualResult = `Dragon ${dragonOddEven}`;
      matched = dragonOddEven === value;

      break;
    }

    // Tiger Odd / Even
    case /^Tiger (Odd|Even)$/i.test(betTeam): {
      const value = betTeam.replace('Tiger ', '').trim();

      actualResult = `Tiger ${tigerOddEven}`;
      matched = tigerOddEven === value;

      break;
    }

    // Dragon Color
    case /^Dragon (Red|Black)$/i.test(betTeam): {
      const value = betTeam.replace('Dragon ', '').trim();

      actualResult = `Dragon ${dragonColor}`;
      matched = dragonColor === value;

      break;
    }

    // Tiger Color
    case /^Tiger (Red|Black)$/i.test(betTeam): {
      const value = betTeam.replace('Tiger ', '').trim();

      actualResult = `Tiger ${tigerColor}`;
      matched = tigerColor === value;

      break;
    }

    // Dragon Suit
    case /^Dragon (Spade|Heart|Diamond|Club)$/i.test(betTeam): {
      const value = betTeam.replace('Dragon ', '').trim();

      actualResult = `Dragon ${dragonSuit}`;
      matched = dragonSuit === value;

      break;
    }

    // Tiger Suit
    case /^Tiger (Spade|Heart|Diamond|Club)$/i.test(betTeam): {
      const value = betTeam.replace('Tiger ', '').trim();

      actualResult = `Tiger ${tigerSuit}`;
      matched = tigerSuit === value;

      break;
    }

    default:
      matched = false;
      actualResult = '';
  }

  const isWin = otype?.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult: isWin ? betTeam : actualResult,
  };
};
const isDragonTigerLionResultMatch = (betTeam, resultData, otype = 'back') => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const [winner, color, oddEven, cards] = resultData.rdesc
    .split('#')
    .map((x) => x.trim());

  const get = (text, key) =>
    text.match(new RegExp(`${key}\\s*:\\s*([^|]+)`))?.[1]?.trim() || '';

  const data = {
    D: {
      winner: winner === 'Dragon',
      color: get(color, 'D'),
      oddEven: get(oddEven, 'D'),
      card: get(cards, 'D'),
    },
    T: {
      winner: winner === 'Tiger',
      color: get(color, 'T'),
      oddEven: get(oddEven, 'T'),
      card: get(cards, 'T'),
    },
    L: {
      winner: winner === 'Lion',
      color: get(color, 'L'),
      oddEven: get(oddEven, 'L'),
      card: get(cards, 'L'),
    },
  };

  const team = betTeam.trim();
  let matched = false;
  let actualResult = '';

  // Winner
  const winnerMatch = team.match(/^Winner\s([DTL])$/);

  if (winnerMatch) {
    const side = winnerMatch[1];
    matched = data[side].winner;
    actualResult = winner;
  }

  // Color / Odd Even
  else {
    const parts = team.split(' ');

    if (parts.length === 2) {
      const [type, side] = parts;

      if (['Red', 'Black'].includes(type)) {
        matched = data[side].color === type;
        actualResult = data[side].color;
      } else if (['Odd', 'Even'].includes(type)) {
        matched = data[side].oddEven === type;
        actualResult = data[side].oddEven;
      }
    }

    // Card
    else {
      const side = team.startsWith('Dragon')
        ? 'D'
        : team.startsWith('Tiger')
          ? 'T'
          : 'L';

      const card = team.replace(/^(Dragon|Tiger|Lion)\s/, '');

      matched = data[side].card === card;
      actualResult = data[side].card;
    }
  }

  const isWin = otype.toLowerCase() === 'lay' ? !matched : matched;

  if (isWin) actualResult = betTeam;

  return {
    isWin,
    actualResult,
  };
};

const isRouletteResultMatch = (betTeam, resultData, otype = 'back') => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const result = String(resultData.rdesc).trim(); // "02"
  const winNo = Number(result); // 2

  if (Number.isNaN(winNo)) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const team = betTeam.trim();
  // lucky7Logger('team 123  bet 2', team);
  // Roulette red numbers
  const red = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];

  const black = [
    2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
  ];

  let matched = false;

  // -----------------------------
  // Straight / Split / Street / Corner
  // -----------------------------
  if (team.includes(',')) {
    lucky7Logger('team 2  bet 2', team);
    matched = team
      .split(',')
      .map((x) => parseInt(x.trim(), 10))
      .includes(winNo);
  }

  // -----------------------------
  // Single Number
  // -----------------------------
  else if (/^\d+$/.test(team)) {
    lucky7Logger('team  1 bet 2', team);
    matched = parseInt(team, 10) === winNo;
  }

  // -----------------------------
  // Special Bets
  // -----------------------------
  else {
    lucky7Logger('team  bet 2', team);
    switch (team) {
      case '1st 12':
        matched = winNo >= 1 && winNo <= 12;
        break;

      case '2nd 12':
        matched = winNo >= 13 && winNo <= 24;
        break;

      case '3rd 12':
        matched = winNo >= 25 && winNo <= 36;
        break;

      case '1st Column':
        matched = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].includes(winNo);
        break;

      case '2nd Column':
        matched = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].includes(winNo);
        break;

      case '3rd Column':
        matched = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].includes(winNo);
        break;

      case '1 to 18':
        matched = winNo >= 1 && winNo <= 18;
        break;

      case '19 to 36':
        matched = winNo >= 19 && winNo <= 36;
        break;

      case 'Red':
        matched = red.includes(winNo);
        break;

      case 'Black':
        matched = black.includes(winNo);
        break;

      case 'Odd':
        matched = winNo !== 0 && winNo % 2 === 1;
        break;

      case 'Even':
        matched = winNo !== 0 && winNo % 2 === 0;
        break;

      default:
        matched = false;
    }
  }

  lucky7Logger('LUCKY7  bet 2', matched);

  const isWin = otype.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult: isWin ? team : String(winNo),
  };
};
const is2020TeenpattiResultMatch = (betTeam, resultData, otype = 'back') => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const parts = resultData.rdesc.split('#').map((x) => x.trim());

  /*
    FORMAT

    0 => Winner
    1 => 3 Baccarat
    2 => Total
    3 => Pair Plus
    4 => Color
  */

  const winner = parts[0] || '';
  const baccarat = parts[1] || '';
  const total = parts[2] || '';
  const pairPlus = parts[3] || '';
  const color = parts[4] || '';

  let matched = false;
  let actualResult = '';

  const team = betTeam.trim();

  switch (team) {
    //-------------------
    // Winner
    //-------------------

    case 'Player A':
      actualResult = winner;
      matched = winner === 'Player A';
      break;

    case 'Player B':
      actualResult = winner;
      matched = winner === 'Player B';
      break;

    //-------------------
    // 3 Baccarat
    //-------------------

    case '3 Baccarat A':
      actualResult = baccarat;
      matched = baccarat.startsWith('Player A');
      break;

    case '3 Baccarat B':
      actualResult = baccarat;
      matched = baccarat.startsWith('Player B');
      break;

    //-------------------
    // Total
    //-------------------

    case 'Total A':
      actualResult = total;
      matched = total.startsWith('Player A');
      break;

    case 'Total B':
      actualResult = total;
      matched = total.startsWith('Player B');
      break;

    //-------------------
    // Pair Plus
    //-------------------

    case 'Pair Plus A':
      actualResult = pairPlus || 'No Pair Plus';
      matched = pairPlus.startsWith('A :');
      break;

    case 'Pair Plus B':
      actualResult = pairPlus || 'No Pair Plus';
      matched = pairPlus.startsWith('B :');
      break;

    //-------------------
    // Color
    //-------------------

    case 'Red A':
      actualResult = color;
      matched = color.includes('A : Red');
      break;

    case 'Black A':
      actualResult = color;
      matched = color.includes('A : Black');
      break;

    case 'Red B':
      actualResult = color;
      matched = color.includes('B : Red');
      break;

    case 'Black B':
      actualResult = color;
      matched = color.includes('B : Black');
      break;

    default:
      matched = false;
      actualResult = '';
  }

  const isWin = otype.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult: isWin ? team : actualResult,
  };
};

const isQueenTopOpenTeenpattiResultMatch = (
  betTeam,
  resultData,
  otype = 'back'
) => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const parts = resultData.rdesc.split('#').map((x) => x.trim());

  /*
    FORMAT

    0 => Winner
    1 => B Total
  */

  const winner = parts[0] || '';
  const bTotal = parts[1] || '';

  let matched = false;
  let actualResult = '';

  switch (betTeam.trim()) {
    // MAIN
    case 'Player A':
      actualResult = winner;
      matched = winner === 'Player A';
      break;

    case 'Player B':
      actualResult = winner;
      matched = winner === 'Player B';
      break;

    // PLAYER B UNDER 21
    case 'Player B Under 21':
      actualResult = bTotal;
      matched = bTotal.includes('Under 21');
      break;

    // PLAYER B OVER 21
    case 'Player B Over 21':
      actualResult = bTotal;
      matched = bTotal.includes('Over 21');
      break;

    default:
      actualResult = '';
      matched = false;
  }

  const isWin = otype?.toLowerCase() === 'lay' ? !matched : matched;

  return {
    isWin,
    actualResult: isWin ? betTeam : actualResult,
  };
};
const isTeenpattiJoker2020ResultMatch = (
  betTeam,
  resultData,
  otype = 'back'
) => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: '',
    };
  }

  const parts = resultData.rdesc
    .split('#')
    .map(x => x.trim());

  const winner = parts[0] || '';
  const oddEven = parts[1] || '';
  const color = parts[2] || '';
  const suit = parts[3] || '';

  let matched = false;
  let actualResult = '';

  switch (betTeam.trim()) {

    // Winner
    case 'Player A':
      actualResult = winner;
      matched = winner === 'Player A';
      break;

    case 'Player B':
      actualResult = winner;
      matched = winner === 'Player B';
      break;

    // Odd / Even
    case 'Joker Even':
      actualResult = oddEven;
      matched = oddEven === 'Even';
      break;

    case 'Joker Odd':
      actualResult = oddEven;
      matched = oddEven === 'Odd';
      break;

    // Color
    case 'Joker Red':
      actualResult = color;
      matched = color === 'Red';
      break;

    case 'Joker Black':
      actualResult = color;
      matched = color === 'Black';
      break;

    // Suit
    case 'Joker Spade':
      actualResult = suit;
      matched = suit === 'Spade';
      break;

    case 'Joker Heart':
      actualResult = suit;
      matched = suit === 'Heart';
      break;

    case 'Joker Diamond':
      actualResult = suit;
      matched = suit === 'Diamond';
      break;

    case 'Joker Club':
      actualResult = suit;
      matched = suit === 'Club';
      break;

    default:
      matched = false;
      actualResult = '';
  }

  const isWin =
    otype?.toLowerCase() === 'lay'
      ? !matched
      : matched;

  return {
    isWin,
    actualResult: isWin ? betTeam : actualResult,
  };
};
const isMuflisTeenpattiResultMatch = (
  betTeam,
  resultData,
  otype = "back"
) => {
  if (!betTeam || !resultData?.rdesc) {
    return {
      isWin: false,
      actualResult: "",
    };
  }

  const parts = resultData.rdesc.split("#");

  // Result Format
  // 0 => Winner
  // 1 => Top 9
  // 2 => Mini Baccarat

  const winner = parts[0]?.trim();
  const top9 = parts[1]?.trim();
  const baccarat = parts[2]?.trim();

  let matched = false;
  let actualResult = "";

  switch (betTeam.trim()) {

    // Winner
    case "Player A":
      matched = winner === "Player A";
      actualResult = matched ? betTeam : winner;
      break;

    case "Player B":
      matched = winner === "Player B";
      actualResult = matched ? betTeam : winner;
      break;

    // Top 9
    case "Top 9 A":
      matched = top9.startsWith("A :");
      actualResult = matched ? betTeam : top9;
      break;

    case "Top 9 B":
      matched = top9.startsWith("B :");
      actualResult = matched ? betTeam : top9;
      break;

    // Mini Baccarat
    case "M Baccarat A":
      matched = baccarat.startsWith("Player A");
      actualResult = matched ? betTeam : baccarat;
      break;

    case "M Baccarat B":
      matched = baccarat.startsWith("Player B");
      actualResult = matched ? betTeam : baccarat;
      break;

    default:
      matched = false;
      actualResult = "";
  }

  const isWin =
    otype?.toLowerCase() === "lay"
      ? !matched
      : matched;

  return {
    isWin,
    actualResult,
  };
};

const handleLucky7BetSettlement = async (bet) => {
  // lucky7Logger('LUCKY7  bet 2', bet);
  try {
    const response = await axios.get(
      `${API_URL}/casino/detail_result?key=${API_KEY}&type=${bet.gameId}&mid=${bet.roundId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          key: API_KEY,
        },
        withCredentials: true,
      }
    );

    const resultData = response?.data?.data?.t1;
    if (!resultData) return;
    // lucky7Logger('LUCKY7  resultData', resultData);
    //  lucky7Logger('LUCKY7  bet 2', bet);

    // EVENT NAME VALIDATION
    const normalizeLucky7EventName = (name) => {
      const normalized = name?.toLowerCase().replace(/\s+/g, '').trim();
      lucky7Logger('LUCKY7  resultData', normalized);
      // mappings
      if (normalized === 'lucky7-a') return 'lucky7';
      if (normalized === 'lucky7-b') return 'lucky7eu';
      if (normalized === 'lucky7-c') return 'lucky7eu2';
      if (normalized === '3cardsjudgement') return '3cardj';
      if (normalized === 'andarbahar150cards') return 'ab4';
      if (normalized === 'andarbahar50cards') return 'ab3';
      if (normalized === 'lucky6') return 'lucky5';
      if (normalized === '29cardbaccarat') return 'teensin';
      if (normalized === 'poker6players') return 'poker6';
      if (normalized === 'poker1-day') return 'poker';
      if (normalized === '20-20poker') return 'poker20';
      if (normalized === 'teenpattipoisononeday') return 'poison';
      if (normalized === 'andarbahar2') return 'abj';
      if (normalized === '32cardsa') return 'card32';
      if (normalized === '32cardsb') return 'card32eu';
      if (normalized === '20-20dragontiger2') return 'dt202';
      if (normalized === '20-20dragontiger') return 'dt20';
      if (normalized === '1daydragontiger') return 'dt6';
      if (normalized === '20-20dtl') return 'dtl20';
      if (normalized === 'beachroulette') return 'roulette12';
      if (normalized === 'roulette') return 'roulette13';
      if (normalized === 'goldenroulette') return 'roulette11';
      if (normalized === 'uniqueroulette') return 'ourroullete';
      if (normalized === '20-20teenpatti') return 'teen20';
      if (normalized === '20-20teenpattib') return 'teen20b';
      if (normalized === '20-20teenpattic') return 'teen20c';
      if (normalized === 'teenpattijoker20-20') return 'joker20';
      if (normalized === 'muflisteenpatti' || normalized === '20-20muflisteenpatti') return 'teenmuf';
      if (normalized === 'queentopopenteenpatti') return 'teen41';
      if (normalized === 'jacktopopenteenpatti') return 'teen42';
      return normalized;
    };

    const resultEventName = normalizeLucky7EventName(resultData.ename);

    const betEventName = normalizeLucky7EventName(bet.eventName);

    lucky7Logger('LUCKY7 EVENT CHECK', {
      originalResultEvent: resultData.ename,
      originalBetEvent: bet.eventName,
      resultEventName,
      betEventName,
    });

    // if event names do not match then skip settlement
    if (resultEventName !== betEventName) {
      lucky7Logger('LUCKY7 skipped due to event mismatch', {
        resultEventName,
        betEventName,
        roundId: bet.roundId,
        betId: bet._id,
      });

      return;
    }

    const rdesc = resultData.rdesc || '';
    const winners = rdesc.split('#').map((v) => v.trim());

    const betTeam = bet.teamName?.trim();
    const otype = bet.otype?.trim();
    const marketName = bet.marketName?.trim();
    const event = bet.eventName?.trim();

    let isWin = false;
    let actualResult = '';
    lucky7Logger('BALL BY actualResult', event);
    // LUCKY7 GAMES CONDITIONS
    if (
      ['lucky7', 'lucky7eu', 'lucky7eu2', 'lucky5'].includes(
        bet.gameId?.toLowerCase()
      )
    ) {
      if (marketName === 'LUCKY CARD') {
        let betCard = betTeam.replace('Card', '').trim();

        const actualCardRaw = resultData.card || '';
        let actualCard = actualCardRaw.slice(0, -2);

        if (actualCard === 'A') actualCard = '1';
        if (actualCard === 'J') actualCard = '11';
        if (actualCard === 'Q') actualCard = '12';
        if (actualCard === 'K') actualCard = '13';

        if (betCard === 'A') betCard = '1';
        if (betCard === 'J') betCard = '11';
        if (betCard === 'Q') betCard = '12';
        if (betCard === 'K') betCard = '13';

        actualResult = `Card ${actualCard}`;
        isWin = betCard === actualCard;
      }

      // WINNER
      else if (marketName === 'WINNER') {
        actualResult = winners[0]?.trim();
        isWin = normalizeLucky7(actualResult) === normalizeLucky7(betTeam);
        lucky7Logger('BALL BY isWin', isWin);
      }

      // ODD EVEN
      else if (marketName === 'LUCKY ODD/EVEN') {
        actualResult = winners[1]?.trim();
        isWin = actualResult?.toLowerCase() === betTeam?.toLowerCase();
      }

      // COLOR
      else if (marketName === 'LUCKY COLOR') {
        actualResult = winners[2]?.trim();
        isWin = actualResult?.toLowerCase() === betTeam?.toLowerCase();
      }

      // SUIT / LINE
      else if (marketName === 'LUCKY CARD SUIT') {
        if (
          ['line 1', 'line 2', 'line 3', 'line 4'].includes(
            betTeam.toLowerCase()
          )
        ) {
          const lineResult = winners[4]?.trim();

          if (lineResult === '1 2 3') actualResult = 'line 1';
          else if (lineResult === '4 5 6') actualResult = 'line 2';
          else if (lineResult === '8 9 10') actualResult = 'line 3';
          else if (lineResult === 'J Q K') actualResult = 'line 4';
          else if (winners[3]?.trim() === '7') actualResult = 'no 7';
          else actualResult = 'no 7';
        } else {
          const actualSuitCode = resultData.card.slice(-2);

          let actualSuit = '';

          if (actualSuitCode === 'SS') actualSuit = 'spades';
          if (actualSuitCode === 'HH') actualSuit = 'hearts';
          if (actualSuitCode === 'DD') actualSuit = 'diamonds';
          if (actualSuitCode === 'CC') actualSuit = 'clubs';

          actualResult = actualSuit;
        }

        isWin = actualResult === betTeam.toLowerCase();
      }
    } else if (marketName?.toLowerCase() === 'runs') {
      const rawResult = resultData.rdesc?.trim() || '';

      // skip invalid result format
      if (rawResult.includes('#')) {
        lucky7Logger(
          'BALL BY BALL skipped due to invalid result format',
          rawResult
        );

        return;
      }

      // lucky7Logger('BALL BY BALL', marketName);

      actualResult = rawResult;

      // MULTI BET CASE
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = betHistoryRecords.some((item) =>
          isLucky7RunsMatch(item.teamName, actualResult)
        );

        lucky7Logger('BALL BY BALL multi compare', {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        isWin = isLucky7RunsMatch(betTeam, actualResult);

        lucky7Logger('BALL BY BALL single compare', {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (marketName?.toLowerCase() === 'lucky15') {
      const rawResult = resultData.rdesc?.trim() || '';

      // skip invalid result format
      if (rawResult.includes('#')) {
        lucky7Logger(
          'BALL BY BALL skipped due to invalid result format',
          rawResult
        );

        return;
      }

      // lucky7Logger('BALL BY BALL', marketName);

      actualResult = rawResult;

      // MULTI BET CASE
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        const result = isLucky15ResultMatch(betTeam, resultData, otype);

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger('BALL BY BALL multi compare', {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        isWin = isLucky15ResultMatch(betTeam, actualResult);

        lucky7Logger('BALL BY BALL single compare', {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (
      bet.gameId?.toLowerCase() === '3cardj' ||
      marketName?.toLowerCase() === '3 card judgement'
    ) {
      const parts = betTeam.split('#');
      const realBetTeam = parts[0]?.trim() || '';
      const selectedCards = parts[1]?.trim() || '';

      const result = is3CardsJudgementResultMatch(
        realBetTeam,
        selectedCards,
        resultData,
        otype
      );

      isWin = result.isWin;
      actualResult = result.actualResult;

      lucky7Logger('3 Cards Judgement compare', {
        actualResult,
        betTeam,
        realBetTeam,
        selectedCards,
        isWin,
      });
    } else if (marketName?.toLowerCase() === 'poker6') {
      const rawResult = resultData.rdesc?.trim() || '';

      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = isPoker6PlayersResultMatch(
            item.teamName,
            resultData,
            otype
          );
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = isPoker6PlayersResultMatch(betTeam, resultData, otype);
          actualResult = res.actualResult;
        }

        lucky7Logger('BALL BY BALL multi compare', {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = isPoker6PlayersResultMatch(betTeam, resultData, otype);

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger('BALL BY BALL single compare', {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (event?.toLowerCase() === 'poker') {
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = isPoker1DayResultMatch(item.teamName, resultData, otype);
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = isPoker1DayResultMatch(betTeam, resultData, otype);
          actualResult = res.actualResult;
        }

        lucky7Logger('BALL BY BALL multi compare', {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = isPoker1DayResultMatch(betTeam, resultData, otype);

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger('BALL BY BALL single compare', {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (event?.toLowerCase() === 'poker20') {
      // MULTI BET CASE
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });
        lucky7Logger('BALL BY BALL multi compare', betTeam);

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = is2020PokerResultMatch(item.teamName, resultData, otype);
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = is2020PokerResultMatch(betTeam, resultData, otype);
          actualResult = res.actualResult;
        }

        lucky7Logger('BALL BY BALL multi compare', {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = is2020PokerResultMatch(betTeam, resultData, otype);

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger('BALL BY BALL single compare', {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (event?.toLowerCase() === 'poison') {
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = isTeenpattiPoisonOneDayResultMatch(
            item.teamName,
            resultData,
            otype
          );
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = isTeenpattiPoisonOneDayResultMatch(
            betTeam,
            resultData,
            otype
          );
          actualResult = res.actualResult;
        }

        lucky7Logger('BALL BY BALL multi compare', {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = isTeenpattiPoisonOneDayResultMatch(
          betTeam,
          resultData,
          otype
        );

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger('BALL BY BALL single compare', {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (event?.toLowerCase() === 'abj') {
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = isAndarBahar2ResultMatch(
            item.teamName,
            resultData,
            otype
          );
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = isAndarBahar2ResultMatch(betTeam, resultData, otype);
          actualResult = res.actualResult;
        }

        lucky7Logger('BALL BY BALL multi compare', {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = isAndarBahar2ResultMatch(betTeam, resultData, otype);

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger('BALL BY BALL single compare', {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (
      event?.toLowerCase() === 'ab4' ||
      bet.gameId?.toLowerCase() === 'ab4' ||
      event?.toLowerCase() === 'ab3' ||
      bet.gameId?.toLowerCase() === 'ab3'
    ) {
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = isAB150CardsResultMatch(item.teamName, resultData, otype);
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = isAB150CardsResultMatch(betTeam, resultData, otype);
          actualResult = res.actualResult;
        }

        lucky7Logger('AB4 multi compare', {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = isAB150CardsResultMatch(betTeam, resultData, otype);

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger('AB4 single compare', {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (
      event?.toLowerCase() === 'card32' ||
      bet.gameId?.toLowerCase() === 'card32' ||
      event?.toLowerCase() === 'card32eu' ||
      bet.gameId?.toLowerCase() === 'card32eu'
    ) {
      const isCard32eu =
        event?.toLowerCase() === 'card32eu' ||
        bet.gameId?.toLowerCase() === 'card32eu';
      const matchFn = isCard32eu ? is32CardsBResultMatch : is32CardsResultMatch;
      const gameLabel = isCard32eu ? 'Card32eu' : 'Card32';

      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = matchFn(item.teamName, resultData, otype);
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = matchFn(betTeam, resultData, otype);
          actualResult = res.actualResult;
        }

        lucky7Logger(`${gameLabel} multi compare`, {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = matchFn(betTeam, resultData, otype);

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger(`${gameLabel} single compare`, {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (
      event?.toLowerCase() === 'dt202' ||
      bet.gameId?.toLowerCase() === 'dt202' ||
      event?.toLowerCase() === 'dt20' ||
      bet.gameId?.toLowerCase() === 'dt20'
    ) {
      const isDt202 =
        event?.toLowerCase() === 'dt202' ||
        bet.gameId?.toLowerCase() === 'dt202';
      const gameLabel = isDt202 ? 'dt202' : 'dt20';

      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = isDragonTiger2ResultMatch(
            item.teamName,
            resultData,
            otype
          );
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = isDragonTiger2ResultMatch(betTeam, resultData, otype);
          actualResult = res.actualResult;
        }

        lucky7Logger(`${gameLabel} multi compare`, {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = isDragonTiger2ResultMatch(betTeam, resultData, otype);

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger(`${gameLabel} single compare`, {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (
      event?.toLowerCase() === 'dt6' ||
      bet.gameId?.toLowerCase() === 'dt6'
    ) {
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = isOneDayDragonTigerResultMatch(
            item.teamName,
            resultData,
            otype
          );
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = isOneDayDragonTigerResultMatch(
            betTeam,
            resultData,
            otype
          );
          actualResult = res.actualResult;
        }

        lucky7Logger('dt6 multi compare', {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = isOneDayDragonTigerResultMatch(
          betTeam,
          resultData,
          otype
        );

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger('dt6 single compare', {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (
      event?.toLowerCase() === 'dtl20' ||
      bet.gameId?.toLowerCase() === 'dtl20'
    ) {
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = isDragonTigerLionResultMatch(
            item.teamName,
            resultData,
            otype
          );
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = isDragonTigerLionResultMatch(betTeam, resultData, otype);
          actualResult = res.actualResult;
        }

        lucky7Logger('dtl20 multi compare', {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = isDragonTigerLionResultMatch(betTeam, resultData, otype);

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger('dtl20 single compare', {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (
      event?.toLowerCase() === 'roulette11' ||
      bet.gameId?.toLowerCase() === 'roulette11' ||
      event?.toLowerCase() === 'roulette12' ||
      bet.gameId?.toLowerCase() === 'roulette12' ||
      event?.toLowerCase() === 'roulette13' ||
      bet.gameId?.toLowerCase() === 'roulette13' ||
      event?.toLowerCase() === 'ourroullete' ||
      bet.gameId?.toLowerCase() === 'ourroullete'
    ) {
      // lucky7Logger('betId  bet 2', bet);
      const isOurRoulette =
        event?.toLowerCase() === 'ourroullete' ||
        bet.gameId?.toLowerCase() === 'ourroullete';
      const isR11 =
        event?.toLowerCase() === 'roulette11' ||
        bet.gameId?.toLowerCase() === 'roulette11';
      const isR12 =
        event?.toLowerCase() === 'roulette12' ||
        bet.gameId?.toLowerCase() === 'roulette12';
      const isR13 =
        event?.toLowerCase() === 'roulette13' ||
        bet.gameId?.toLowerCase() === 'roulette13';
      const gameLabel = isOurRoulette
        ? 'ourroullete'
        : isR11
          ? 'roulette11'
          : isR12
            ? 'roulette12'
            : 'roulette13';

      // MULTI BET CASE

      const betHistoryRecords = await betHistoryModel.find({
        betId: bet._id.toString(),
        status: 0,
      });

      isWin = false;
      actualResult = '';

      for (const item of betHistoryRecords) {
        const res = isRouletteResultMatch(item.teamName, resultData, otype);
        if (res.isWin) {
          isWin = true;
          actualResult = item.teamName;
          break;
        }
      }

      if (!isWin) {
        const res = isRouletteResultMatch(betTeam, resultData, otype);
        actualResult = res.actualResult;
      }

      lucky7Logger(`${gameLabel} multi compare`, {
        actualResult,
        selections: betHistoryRecords.map((x) => x.teamName),
        isWin,
      });
    } else if (bet.gameId?.toLowerCase() === 'baccarat') {
      // MULTI BET CASE

      // SINGLE BET CASE
      const result = isBaccaratResultMatch(betTeam, resultData);

      isWin = result.isWin;
      actualResult = result.actualResult;

      lucky7Logger('BACCARAT single compare', {
        actualResult,
        betTeam,
        isWin,
      });
    } else if (bet.gameId?.toLowerCase() === 'baccarat2') {
      // MULTI BET CASE

      // SINGLE BET CASE
      const result = isBaccarat2ResultMatch(betTeam, resultData);

      isWin = result.isWin;
      actualResult = result.actualResult;

      lucky7Logger('BACCARAT2 single compare', {
        actualResult,
        betTeam,
        isWin,
      });
    } else if (bet.gameId?.toLowerCase() === 'teensin') {
      // MULTI BET CASE

      // SINGLE BET CASE
      const result = is29CardBaccaratResultMatch(betTeam, resultData, otype);

      isWin = result.isWin;
      actualResult = result.actualResult;

      lucky7Logger('BACCARAT2 single compare', {
        actualResult,
        betTeam,
        isWin,
      });
    } else if (
      event?.toLowerCase() === 'teen20' ||
      bet.gameId?.toLowerCase() === 'teen20' ||
      event?.toLowerCase() === 'teen20b' ||
      bet.gameId?.toLowerCase() === 'teen20b' ||
      event?.toLowerCase() === 'teen20c' ||
      bet.gameId?.toLowerCase() === 'teen20c'
    ) {
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = is2020TeenpattiResultMatch(
            item.teamName,
            resultData,
            otype
          );
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = is2020TeenpattiResultMatch(betTeam, resultData, otype);
          actualResult = res.actualResult;
        }

        lucky7Logger(`${bet.gameId} multi compare`, {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = is2020TeenpattiResultMatch(betTeam, resultData, otype);

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger(`${bet.gameId} single compare`, {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (
      event?.toLowerCase() === 'joker20' ||
      bet.gameId?.toLowerCase() === 'joker20'
    ) {
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = isTeenpattiJoker2020ResultMatch(
            item.teamName,
            resultData,
            otype
          );
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = isTeenpattiJoker2020ResultMatch(betTeam, resultData, otype);
          actualResult = res.actualResult;
        }

        lucky7Logger(`${bet.gameId} multi compare`, {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = isTeenpattiJoker2020ResultMatch(betTeam, resultData, otype);

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger(`${bet.gameId} single compare`, {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (
      event?.toLowerCase() === 'teenmuf' ||
      bet.gameId?.toLowerCase() === 'teenmuf'
    ) {
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = isMuflisTeenpattiResultMatch(
            item.teamName,
            resultData,
            otype
          );
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = isMuflisTeenpattiResultMatch(betTeam, resultData, otype);
          actualResult = res.actualResult;
        }

        lucky7Logger(`${bet.gameId} multi compare`, {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = isMuflisTeenpattiResultMatch(betTeam, resultData, otype);

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger(`${bet.gameId} single compare`, {
          actualResult,
          betTeam,
          isWin,
        });
      }
    } else if (
      event?.toLowerCase() === 'teen41' ||
      bet.gameId?.toLowerCase() === 'teen41' ||
      event?.toLowerCase() === 'teen42' ||
      bet.gameId?.toLowerCase() === 'teen42'
    ) {
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        isWin = false;
        actualResult = '';

        for (const item of betHistoryRecords) {
          const res = isQueenTopOpenTeenpattiResultMatch(
            item.teamName,
            resultData,
            otype
          );
          if (res.isWin) {
            isWin = true;
            actualResult = item.teamName;
            break;
          }
        }

        if (!isWin) {
          const res = isQueenTopOpenTeenpattiResultMatch(
            betTeam,
            resultData,
            otype
          );
          actualResult = res.actualResult;
        }

        lucky7Logger(`${bet.gameId} multi compare`, {
          actualResult,
          selections: betHistoryRecords.map((x) => x.teamName),
          isWin,
        });
      } else {
        // SINGLE BET CASE
        const result = isQueenTopOpenTeenpattiResultMatch(
          betTeam,
          resultData,
          otype
        );

        isWin = result.isWin;
        actualResult = result.actualResult;

        lucky7Logger(`${bet.gameId} single compare`, {
          actualResult,
          betTeam,
          isWin,
        });
      }
    }
    lucky7Logger('BALL BY actualResult', actualResult);
    // FIX multi-case win detection
    if (bet.BetCase > 2 && marketName?.toLowerCase() != 'runs') {
      const betHistoryRecords = await betHistoryModel.find({
        betId: bet._id.toString(),
        status: 0,
      });

      isWin = betHistoryRecords.some(
        (item) => item.teamName?.toLowerCase() === actualResult?.toLowerCase()
      );
    }

    const user = await SubAdmin.findById(bet.userId);
    if (!user) return;

    let profit = 0;
    let loss = 0;
    let profitLossChange = 0;

    const refundCondition =
      ['lucky7', 'lucky7eu', 'lucky7eu2', 'lucky5'].includes(
        bet.gameId?.toLowerCase()
      ) &&
      ['WINNER', 'LUCKY CARD SUIT'].includes(marketName) &&
      ['tie', 'no 7'].includes(actualResult?.toLowerCase());

    lucky7Logger('BALL BY BALL', isWin);

    if (isWin) {
      if (bet.BetCase > 2) {
        const betHistoryRecords = await betHistoryModel.find({
          betId: bet._id.toString(),
          status: 0,
        });

        let winningBetAmount = 0;
        let winningPrice = 0;
        let otherPrices = 0;

        for (const item of betHistoryRecords) {
          if (
            marketName?.toLowerCase() === 'runs'
              ? isLucky7RunsMatch(item.teamName, actualResult)
              : item.teamName?.toLowerCase() === actualResult?.toLowerCase()
          ) {
            winningBetAmount += Number(item.betAmount);
            winningPrice += Number(item.price);
            lucky7Logger('LUCKY7  winningBetAmount', winningBetAmount);
          } else {
            otherPrices += Number(item.price);
          }
        }

        profit = winningBetAmount - otherPrices;

        profitLossChange = profit;

        user.balance += profit;

        user.avbalance += winningPrice + winningBetAmount;

        bet.resultAmount = profit;
        // lucky7Logger('LUCKY7  profit', profit);
      } else {
        profit = bet.betAmount;
        profitLossChange = profit;

        user.balance += profit;
        user.avbalance += bet.price + profit;

        bet.resultAmount = profit;
      }
      bet.status = 1;
    } else {
      if (refundCondition) {
        loss = bet.price / 2;
        user.avbalance += loss;
      } else {
        loss = bet.price;
      }
      profitLossChange = -loss;

      user.balance -= loss;

      bet.status = 2;
      bet.resultAmount = loss;
    }

    user.exposure = Math.max(0, user.exposure - bet.price);

    user.bettingProfitLoss += profitLossChange;
    // lucky7Logger('LUCKY7  user.avbalance 1', user.avbalance);
    // lucky7Logger('LUCKY7  resultData amount', user.bettingProfitLoss);
    // lucky7Logger('LUCKY7  resultData ex',  user.exposure);
    await user.save();
    //  lucky7Logger('LUCKY7  actualResultactualResult', actualResult);
    bet.profitLossChange = profitLossChange;
    bet.betResult = actualResult;
    bet.settledBy = 'api';
    bet.settledAt = Date.now();

    await bet.save();
    lucky7Logger('profitLossChange', profitLossChange);
    if (profitLossChange !== 0) {
      await reconcileOrphanedBetHistory();
    }
  } catch (error) {
    console.error('Lucky7 settlement error:', error.message);
  }
};
export const updateFancyBetResult = async (req, res) => {
  try {
    const betTypes = [
      { gameType: 'Normal', marketName: 'Toss' },
      { gameType: 'meter', marketName: 'Match Odds' },
      { gameType: 'line', marketName: 'Tied Match' },
      { gameType: 'ball', marketName: 'Bookmaker' },
      { gameType: 'khado', marketName: 'Bookmaker' },
    ];

    let totalBetsProcessed = 0;
    let allProcessedUserIds = [];

    for (const { gameType, marketName } of betTypes) {
      // Fetch ONLY fancy bets for settlement
      const bets = await betModel.find({
        status: 0,
        gameType,
        betType: { $in: ['fancy', 'sports'] },
      });
      console.log(`Processing ${gameType} fancy bets:`, bets.length);

      if (!bets.length) {
        console.log(`No ${gameType} bets found with status 0`);
        continue;
      }

      // Group bets by gameId
      const groupedBets = bets.reduce((acc, bet) => {
        if (!acc[bet.gameId]) acc[bet.gameId] = [];
        acc[bet.gameId].push(bet);
        return acc;
      }, {});

      for (const gameId of Object.keys(groupedBets)) {
        try {
          const isProviderB =
            getProviderName() === 'providerb' ||
            getProviderName() === 'provider_b';

          const isProviderC =
            getProviderName() === 'providerc' ||
            getProviderName() === 'provider_c';

          for (const bet of groupedBets[gameId]) {
            const sid = bet.sid;

            // Get API result (or use mock for testing)
            let score;

            if (process.env.DEV_MOCK_API === '1') {
              score = '200';
              console.log(` [MOCK API] Using test score: ${score}`);
            } else if ((isProviderB || isProviderC) && bet.fancyId) {
              // Provider B: use /cricket/fancyresult with eventId + fancyId
              try {
                const fancyResult = await apiFetchCricketFancyResult(
                  bet.gameId,
                  bet.fancyId
                );

                console.log(
                  `[SETTLE-FANCY] Bet ${bet._id} Game ${bet.gameId} fancyId=${bet.fancyId} ProviderB response:`,
                  JSON.stringify(fancyResult)
                );

                if (!fancyResult || fancyResult.result == null) {
                  console.log(
                    `[SETTLE-FANCY] Bet ${bet._id} No result yet for fancyId=${bet.fancyId}`
                  );
                  continue;
                }

                score = fancyResult.result;
              } catch (err) {
                console.error(
                  `[SETTLE-FANCY] Bet ${bet._id} fancyresult API failed:`,
                  err.message
                );
                continue;
              }
            } else {
              // Provider A or bets without fancyId: use generic getResult endpoint
              const resultData = await apiGetResult({
                event_id: Number(bet.gameId),
                event_name: bet.eventName,
                market_id: bet.market_id,
                market_name: toApiMarketName(bet.marketName),
                client_ref: null,
                sport_id: bet.sid,
              });

              console.log(
                `[SETTLE-FANCY] Bet ${bet._id} Game ${bet.gameId} fallback response:`,
                JSON.stringify(resultData)
              );

              if (!resultData?.final_result) {
                continue;
              }

              score = resultData.final_result;
            }

            // Check if match is voided (case-insensitive)
            const isVoid = score && score.toString().toLowerCase() === 'void';

            const user = await SubAdmin.findById(bet.userId);

            if (!user) {
              console.warn(`User not found for bet ${bet._id}`);
              continue;
            }

            // USE SERVICE: Settle or void fancy bet
            let settlementResult;
            if (isVoid) {
              settlementResult =
                await fancyBetSettlementService.voidFancyBet(bet);
            } else {
              settlementResult = await fancyBetSettlementService.settleFancyBet(
                bet,
                user,
                score
              );
            }

            if (!settlementResult.success) {
              console.error(
                `Failed to ${isVoid ? 'void' : 'settle'} fancy bet ${bet._id}:`,
                settlementResult.message
              );
              continue;
            }

            // Atomic claim: only settle if bet is still unsettled
            // Prevents double settlement when multiple PM2 processes run cron simultaneously
            const claimedBet = await betModel.findOneAndUpdate(
              { _id: bet._id, status: 0 },
              { $set: settlementResult.betUpdates },
              { new: true }
            );
            if (!claimedBet) {
              console.log(
                `[FANCY] SKIPPED Bet ${bet._id} - Already settled by another process`
              );
              continue;
            }
            Object.assign(bet, settlementResult.betUpdates);

            // UPDATE BETHISTORY FIRST: Settle/void each individual bet history record
            // betHistoryModel is the single source of truth for P/L
            const betHistoryRecords = await betHistoryModel.find({
              betId: bet._id.toString(),
              status: 0,
            });

            let betHistoryTotalPL = 0;
            for (const historyRecord of betHistoryRecords) {
              // Handle void for history records
              if (isVoid) {
                await betHistoryModel.updateOne(
                  { _id: historyRecord._id },
                  {
                    $set: {
                      status: 3, // VOID
                      resultAmount: Math.abs(historyRecord.price || 0),
                      profitLossChange: 0,
                      betResult: 'VOID',
                      settledBy: bet.settledBy || 'api',
                      settledAt: bet.settledAt || Date.now(),
                    },
                  }
                );
                console.log(` [FANCY BETHISTORY] Voided: ${historyRecord._id}`);
              } else {
                // Fancy bet settlement - use score-based comparison
                const actualScore = parseFloat(bet.betResult || '0');
                const fancyScore = parseFloat(historyRecord.fancyScore || '0');

                // Back wins if score >= fancyScore, Lay wins if score < fancyScore
                const isWin =
                  historyRecord.otype === 'back'
                    ? actualScore >= fancyScore
                    : actualScore < fancyScore;

                let historyStatus;
                let historyResultAmount;
                let historyProfitLossChange;

                if (isWin) {
                  // WIN: profit = betAmount
                  historyStatus = 1;
                  historyResultAmount = Math.abs(historyRecord.betAmount || 0);
                  historyProfitLossChange = historyRecord.betAmount || 0;
                } else {
                  // LOSS: loss = price
                  historyStatus = 2;
                  historyResultAmount = Math.abs(historyRecord.price || 0);
                  historyProfitLossChange = -(historyRecord.price || 0);
                }

                betHistoryTotalPL += historyProfitLossChange;

                await betHistoryModel.updateOne(
                  { _id: historyRecord._id },
                  {
                    $set: {
                      status: historyStatus,
                      resultAmount: historyResultAmount,
                      profitLossChange: historyProfitLossChange,
                      betResult: bet.betResult,
                      settledBy: bet.settledBy || 'api',
                      settledAt: bet.settledAt || Date.now(),
                    },
                  }
                );
              }
            }

            // Update user balance & P/L atomically
            // bettingProfitLoss uses betHistoryModel sum (single source of truth)
            if (!isVoid && settlementResult.userUpdates) {
              const bplChange =
                betHistoryRecords.length > 0
                  ? betHistoryTotalPL
                  : settlementResult.userUpdates.profitLossChange;

              await SubAdmin.findByIdAndUpdate(bet.userId, {
                $inc: {
                  balance: settlementResult.userUpdates.balanceChange,
                  bettingProfitLoss: bplChange,
                },
              });
            }

            totalBetsProcessed++;
          }
        } catch (err) {
          console.error(
            `Error processing fancy bets for gameId ${gameId}:`,
            err.message
          );
        }
      }

      //  USE SERVICE: Recalculate exposure and send updates
      const currentGroupUserIds = [
        ...new Set(bets.map((b) => b.userId.toString())),
      ];
      allProcessedUserIds = [
        ...new Set([...allProcessedUserIds, ...currentGroupUserIds]),
      ];

      for (const userId of currentGroupUserIds) {
        try {
          const updatedPendingBets = await betModel.find({
            userId: userId,
            status: 0,
          });

          const newExposure =
            fancyBetSettlementService.calculateExposure(updatedPendingBets);

          // Atomic: set exposure and recalculate avbalance from fresh balance
          const freshUser = await SubAdmin.findByIdAndUpdate(
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

          if (freshUser) {
            sendBalanceUpdates(userId, freshUser.avbalance);
            sendExposureUpdates(userId, newExposure);
            sendOpenBetsUpdates(userId, null);

            console.log(
              ` [FANCY] User ${freshUser.userName}: exposure=${newExposure}, balance=${freshUser.balance}, avbalance=${freshUser.avbalance}`
            );
          }
        } catch (err) {
          console.error(
            `Error recalculating exposure for user ${userId}:`,
            err.message
          );
        }
      }
    }

    //  USE SERVICE: Propagate upline updates
    if (allProcessedUserIds.length > 0) {
      // await propagateUplineUpdates(allProcessedUserIds);
      await updateAllUplines(allProcessedUserIds);
    }

    // Handle response differently for cron vs HTTP
    if (res && typeof res.status === 'function') {
      return res.status(200).json({
        message: 'All fancy bets processed successfully',
        total: totalBetsProcessed,
      });
    } else {
      return { total: totalBetsProcessed };
    }
  } catch (error) {
    console.error('Error in updateFancyBetResult:', error);
    if (res && typeof res.status === 'function') {
      return res.status(500).json({ message: 'Server error' });
    }
    throw error;
  }
};
export const updateResultOfBetsHistory = async (req, res) => {
  // Track all processed user IDs for upline update at the end
  const processedUserIds = new Set();
  const betTypes = [
    { gameType: 'casino', marketName: 'WINNER', category: 'casino' },
  ];

  let totalBetsProcessed = 0;

  try {
    for (const { gameType, category } of betTypes) {
      const filterQuery = { status: 0, gameType };
      if (category === 'casino') {
        filterQuery.betType = 'casino'; // Additional filter for casino bets
      }

      const bets = await betHistoryModel.find(filterQuery);

      if (!bets.length) {
        continue;
      }

      const groupedBets = bets.reduce((acc, bet) => {
        const key =
          category === 'casino' ? `${bet.gameId}_${bet.roundId}` : bet.gameId;

        if (!acc[key]) acc[key] = [];
        acc[key].push(bet);
        return acc;
      }, {});

      for (const groupKey of Object.keys(groupedBets)) {
        try {
          for (const bet of groupedBets[groupKey]) {
            const user = await SubAdmin.findById(bet.userId);
            if (!user) {
              continue;
            }

            let response;
            if (process.env.DEV_LOCAL_SETTLE_ENABLED === '0') {
              // For development/testing
              response = {
                data: {
                  final_result:
                    category === 'casino' ? 'PLAYER A' : 'Daniel Elahi Galan',
                },
              };
            } else {
              // Different API calls for sports vs casino
              if (category === 'sports') {
                const sid = bet.sid;
                const resultBody = await apiGetResult({
                  event_id: Number(bet.gameId),
                  event_name: bet.eventName,
                  market_id: bet.market_id,
                  market_name: toApiMarketName(bet.marketName),
                  client_ref: null,
                  sport_id: sid,
                });
                response = { data: resultBody };
              } else {
                // Casino API call
                const casinoDetailData = await apiFetchCasinoDetailResult(
                  bet.gameId,
                  bet.roundId
                );
                response = { data: casinoDetailData };
              }
            }

            const resultData = response?.data;
            console.log(
              `The result data of updateResultOfBetsHistory ${category} is`,
              resultData
            );

            if (!resultData) {
              continue;
            }

            // Extract winner differently for sports vs casino
            let winner;
            if (category === 'sports') {
              // Sports API returns { final_result: "PlayerName" }
              winner = resultData?.final_result?.trim();
            } else {
              // Casino API returns { data: { t1: { winnat: "..." } } }
              winner = resultData?.data?.t1?.winnat;
            }
            console.log(
              `The winner of updateResultOfBetHistory ${category} is`,
              winner
            );

            // Skip if no result available yet
            if (!winner) {
              continue;
            }
            const betTeam = bet.teamName?.trim();
            let winAmount = 0;

            const win =
              winner &&
              betTeam &&
              winner.toLowerCase() === betTeam.toLowerCase();

            //Settlement Logic
            if (
              bet.gameType === 'Match Odds' ||
              bet.gameType === 'Tied Match'
            ) {
              if (bet.otype === 'back') {
                if (win) {
                  winAmount = bet.betAmount;
                  bet.resultAmount = Math.abs(winAmount);
                  bet.profitLossChange = bet.betAmount;
                  bet.betResult = winner;
                  bet.settledBy = 'api';
                  bet.settledAt = Date.now();
                  bet.status = 1;
                } else {
                  bet.resultAmount = Math.abs(bet.price);
                  bet.profitLossChange = -bet.price;
                  bet.betResult = winner;
                  bet.settledBy = 'api';
                  bet.settledAt = Date.now();
                  bet.status = 2;
                }
              } else {
                // lay
                if (win) {
                  bet.resultAmount = Math.abs(bet.price);
                  bet.profitLossChange = -bet.price;
                  bet.betResult = winner;
                  bet.settledBy = 'api';
                  bet.settledAt = Date.now();
                  bet.status = 2;
                } else {
                  winAmount = bet.betAmount;
                  bet.resultAmount = Math.abs(winAmount);
                  bet.profitLossChange = bet.betAmount;
                  bet.betResult = winner;
                  bet.settledBy = 'api';
                  bet.settledAt = Date.now();
                  bet.status = 1;
                }
              }
            } else if (bet.gameType === 'casino') {
              // Casino bet logic (including individual bet history records)
              if (bet.otype === 'back') {
                if (win) {
                  // Back bet wins
                  winAmount = bet.betAmount;
                  bet.resultAmount = Math.abs(winAmount);
                  bet.profitLossChange = bet.betAmount;
                  bet.status = 1;
                } else {
                  // Back bet loses
                  bet.resultAmount = Math.abs(bet.price);
                  bet.profitLossChange = -bet.price;
                  bet.status = 2;
                }
              } else if (bet.otype === 'lay') {
                // Lay bet logic
                if (win) {
                  // Lay bet loses (team they bet against won)
                  bet.resultAmount = Math.abs(bet.price);
                  bet.profitLossChange = -bet.price;
                  bet.status = 2; // LOSE
                } else {
                  // Lay bet wins (team they bet against lost)
                  winAmount = bet.betAmount;
                  bet.resultAmount = Math.abs(winAmount);
                  bet.profitLossChange = bet.betAmount;
                  bet.status = 1; // WIN
                }
              }
              bet.betResult = winner;
              bet.settledBy = 'api';
              bet.settledAt = Date.now();
            } else if (
              gameType === 'Bookmaker' ||
              gameType === 'Bookmaker IPL CUP'
            ) {
              if (bet.otype === 'back') {
                if (win) {
                  winAmount = bet.betAmount + bet.price;
                  bet.resultAmount = Math.abs(winAmount);
                  bet.profitLossChange = bet.betAmount;
                  bet.betResult = winner;
                  bet.settledBy = 'api';
                  bet.settledAt = Date.now();
                  bet.status = 1;
                } else {
                  bet.resultAmount = Math.abs(bet.price);
                  bet.profitLossChange = -bet.price;
                  bet.betResult = winner;
                  bet.settledBy = 'api';
                  bet.settledAt = Date.now();
                  bet.status = 2;
                }
              } else {
                // lay
                if (win) {
                  bet.resultAmount = Math.abs(bet.price);
                  bet.profitLossChange = -bet.price;
                  bet.betResult = winner;
                  bet.settledBy = 'api';
                  bet.settledAt = Date.now();
                  bet.status = 2;
                } else {
                  winAmount = bet.betAmount + bet.price;
                  bet.resultAmount = Math.abs(winAmount);
                  bet.profitLossChange = bet.betAmount;
                  bet.betResult = winner;
                  bet.settledBy = 'api';
                  bet.settledAt = Date.now();
                  bet.status = 1;
                }
              }
            } else if (gameType === 'Toss' || gameType === '1st 6 over') {
              if (win) {
                winAmount = bet.betAmount + bet.price;
                bet.resultAmount = Math.abs(winAmount);
                bet.profitLossChange = bet.betAmount;
                bet.betResult = winner;
                bet.settledBy = 'api';
                bet.settledAt = Date.now();
                bet.status = 1;
              } else {
                bet.betResult = winner;
                bet.settledBy = 'api';
                bet.settledAt = Date.now();
                bet.status = 2;
                bet.resultAmount = Math.abs(bet.price);
                bet.profitLossChange = -bet.price;
              }
            }

            await bet.save();
            totalBetsProcessed++;

            //  ADD THIS: WebSocket call for open bets update
            console.log(' [BET HISTORY] Bet settled, sending open bets update');
            // Send open bets update to trigger frontend refresh
            sendOpenBetsUpdates(bet.userId, null);
          }
        } catch (err) {
          console.error(
            `Error processing ${category} group ${groupKey}:`,
            err.message
          );
        }
      }
    }

    // Handle response differently for HTTP vs cron
    if (res && typeof res.status === 'function') {
      return res.status(200).json({
        message: 'All sports and casino bets processed successfully',
        total: totalBetsProcessed,
      });
    } else {
      return { success: true, total: totalBetsProcessed };
    }
  } catch (error) {
    console.error('Error in updateResultOfBets:', error);

    if (res && typeof res.status === 'function') {
      return res.status(500).json({ message: 'Server error' });
    } else {
      throw error; // Let the cron job handle the error
    }
  }
};
export const updateFancyBetHistory = async (req, res) => {
  try {
    const betTypes = [
      { gameType: 'Normal', marketName: 'Toss' },
      { gameType: 'meter', marketName: 'Match Odds' },
      { gameType: 'line', marketName: 'Tied Match' },
      { gameType: 'ball', marketName: 'Bookmaker' },
      { gameType: 'khado', marketName: 'Bookmaker' },
    ];

    let totalBetsProcessed = 0;

    for (const { gameType, marketName } of betTypes) {
      // CRITICAL FIX: Skip fancy  bets to prevent double settlement
      const bets = await betHistoryModel.find({
        status: 0,
        gameType,
        betType: { $in: ['fancy', 'sports'] },
      });

      if (!bets.length) {
        // console.log(`No ${gameType} bets found with status 0`);
        continue;
      }

      // Group bets by gameId
      const groupedBets = bets.reduce((acc, bet) => {
        if (!acc[bet.gameId]) acc[bet.gameId] = [];
        acc[bet.gameId].push(bet);
        return acc;
      }, {});

      for (const gameId of Object.keys(groupedBets)) {
        try {
          for (const bet of groupedBets[gameId]) {
            const sid = bet.sid;

            const resultData = await apiGetResult({
              event_id: Number(bet.gameId),
              event_name: bet.eventName,
              market_id: bet.market_id,
              market_name: toApiMarketName(bet.marketName),
              client_ref: null,
              sport_id: sid,
            });
            if (!resultData) {
              continue;
            }

            console.log('resultData', resultData);

            const fancyScore = bet.fancyScore;
            const score = resultData.final_result;

            const win = score && fancyScore && score >= fancyScore;
            console.log('winnn', win);

            const betTeam = bet.teamName?.trim();
            let winAmount = 0;

            // console.log("result responce", response)

            const user = await SubAdmin.findById(bet.userId);

            if (!user) {
              continue;
            }
            // Process bet based on otype
            if (bet.otype === 'back') {
              if (win) {
                winAmount = bet.betAmount + bet.price;
                bet.resultAmount = Math.abs(winAmount);
                bet.profitLossChange = bet.betAmount;
                bet.betResult = score;
                bet.status = 1; // Mark as won
              } else {
                bet.resultAmount = Math.abs(bet.price);
                bet.profitLossChange = -bet.price;
                bet.betResult = score;
                bet.status = 2; // Mark as lost
              }
            } else {
              if (win) {
                bet.resultAmount = Math.abs(bet.price);
                bet.profitLossChange = -bet.price;
                bet.betResult = score;
                bet.status = 2; // Mark as lost (for lay bets)
              } else {
                winAmount = bet.betAmount + bet.price;
                bet.resultAmount = Math.abs(winAmount);
                bet.profitLossChange = bet.betAmount;
                bet.betResult = score;
                bet.status = 1; // Mark as won (for lay bets)
              }
            }
            await user.save();
            await bet.save();
            totalBetsProcessed++;
          }
        } catch (err) {
          console.error('error in updatefancybethistory', err.message);
        }
      }
    }

    // Handle response differently for cron vs HTTP
    if (res && typeof res.status === 'function') {
      return res.status(200).json({
        message: 'All bets processed successfully',
        total: totalBetsProcessed,
      });
    } else {
      // console.log(`Cron job completed: Processed ${totalBetsProcessed} bets`);
      return { total: totalBetsProcessed };
    }
  } catch (error) {
    console.error('Error in updateFancyBetResult:', error);
    if (res && typeof res.status === 'function') {
      return res.status(500).json({ message: 'Server error' });
    }
    throw error; // Let the cron job handle the error
  }
};

export const reconcileOrphanedBetHistory = async () => {
  const FANCY_GAME_TYPES = ['Normal', 'meter', 'line', 'ball', 'khado'];
  let totalReconciled = 0;

  try {
    // Only check bets settled in the last 24 hours (orphans older than this are rare)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const settledBets = await betModel.find({
      status: { $in: [1, 2, 3] },
      updatedAt: { $gte: oneDayAgo },
    });

    if (!settledBets.length) {
      return { success: true, total: 0 };
    }

    for (const bet of settledBets) {
      try {
        const betId = bet._id.toString();
        const betResult = (bet.betResult || '').trim();

        // Find orphaned betHistory records (status=0 means unsettled)
        const orphanedRecords = await betHistoryModel.find({
          betId: betId,
          status: 0,
        });

        if (!orphanedRecords.length) continue;

        console.log(
          `[RECONCILE] Found ${orphanedRecords.length} orphaned betHistory for betModel ${betId}`
        );

        const isFancy = FANCY_GAME_TYPES.includes(bet.gameType);
        const isVoid = bet.status === 3;

        for (const historyRecord of orphanedRecords) {
          try {
            // VOID: Simple - zero P&L, status 3
            if (isVoid) {
              const result = await betHistoryModel.updateOne(
                { _id: historyRecord._id, status: 0 },
                {
                  $set: {
                    status: 3,
                    resultAmount: Math.abs(historyRecord.price || 0),
                    profitLossChange: 0,
                    betResult: 'VOID',
                  },
                }
              );
              if (result.modifiedCount > 0) {
                totalReconciled++;
                console.log(`  [RECONCILE] Voided: ${historyRecord._id}`);
                sendOpenBetsUpdates(historyRecord.userId, null);
              }
              continue;
            }

            // Determine win/loss based on bet type
            let isWin;

            if (isFancy) {
              // FANCY: score-based comparison (same as betController.js:2677-2680)
              const actualScore = parseFloat(betResult || '0');
              const fancyScore = parseFloat(historyRecord.fancyScore || '0');
              isWin =
                historyRecord.otype === 'back'
                  ? actualScore >= fancyScore
                  : actualScore < fancyScore;
            } else {
              // SPORTS/CASINO: teamName matching (same as betController.js:1686-1691)
              const historyTeam = (historyRecord.teamName || '').trim();
              let teamMatches = false;

              // Lucky7 Runs special matching
              lucky7Logger('LUCKY7 bet 21', historyRecord.gameId);
              if (historyRecord.marketName.trim().toLowerCase() === 'runs') {
                teamMatches = isLucky7RunsMatch(historyTeam, betResult);
              } else if (
                historyRecord.gameId.trim().toLowerCase() === 'teensin' ||
                historyRecord.gameId.trim().toLowerCase() === 'poker20'
              ) {
                lucky7Logger('LUCKY7 bet 2111', historyTeam);
                lucky7Logger('LUCKY7 bet 211', betResult);
                // const result = is29CardBaccaratResultMatch(
                //   historyTeam,
                //   resultData,
                //   historyRecord.otype
                // );

                // lucky7Logger('LUCKY7 bet 2', result);

                if (bet.status === 1) {
                  teamMatches = true;
                }
              } else {
                teamMatches =
                  historyTeam &&
                  betResult &&
                  historyTeam.toLowerCase() === betResult.toLowerCase();
              }
              lucky7Logger('LUCKY7 bet 2111', teamMatches);
              if (historyRecord.otype === 'back') {
                isWin = teamMatches;
              } else {
                // lay wins when team does NOT match winner
                isWin = !teamMatches;
              }
            }

            const refundCondition =
              ['lucky7', 'lucky7eu', 'lucky7eu2', 'lucky5'].includes(
                (historyRecord.gameId || '').trim().toLowerCase()
              ) &&
              ['WINNER', 'LUCKY CARD SUIT'].includes(
                (historyRecord.marketName || '').trim()
              ) &&
              ['tie', 'no 7'].includes((betResult || '').toLowerCase());

            // Calculate settlement values (same as primary functions)
            let historyStatus;
            let historyResultAmount;
            let historyProfitLossChange;

            if (refundCondition) {
              const refund = Number(historyRecord.price || 0) / 2;

              historyStatus = 2;
              historyResultAmount = refund;
              historyProfitLossChange = -refund;
            } else if (isWin) {
              historyStatus = 1; // WIN
              historyResultAmount = Math.abs(historyRecord.betAmount || 0);
              historyProfitLossChange = historyRecord.betAmount || 0;
            } else {
              historyStatus = 2; // LOSS
              historyResultAmount = Math.abs(historyRecord.price || 0);
              historyProfitLossChange = -(historyRecord.price || 0);
            }

            // Atomic update with status=0 guard to prevent race with primary settlement
            const updateResult = await betHistoryModel.updateOne(
              { _id: historyRecord._id, status: 0 },
              {
                $set: {
                  status: historyStatus,
                  resultAmount: historyResultAmount,
                  profitLossChange: historyProfitLossChange,
                  betResult: betResult,
                },
              }
            );

            if (updateResult.modifiedCount > 0) {
              totalReconciled++;
              console.log(
                `  [RECONCILE] Settled: ${historyRecord._id} ` +
                  `Type:${isFancy ? 'FANCY' : 'SPORTS'} Won:${isWin} ` +
                  `Status:${historyStatus} P/L:${historyProfitLossChange}`
              );
              sendOpenBetsUpdates(historyRecord.userId, null);
            }
          } catch (recordErr) {
            console.error(
              `[RECONCILE] Error processing ${historyRecord._id}:`,
              recordErr.message
            );
          }
        }
      } catch (betErr) {
        console.error(
          `[RECONCILE] Error processing bet ${bet._id}:`,
          betErr.message
        );
      }
    }

    if (totalReconciled > 0) {
      console.log(`[RECONCILE] Complete: reconciled=${totalReconciled}`);
    }

    return { success: true, total: totalReconciled };
  } catch (error) {
    console.error(
      '[RECONCILE] Error in reconcileOrphanedBetHistory:',
      error.message
    );
    return { success: false, error: error.message };
  }
};

export const getPendingBets = async (req, res) => {
  const { id } = req;
  let { gameId } = req.query;

  try {
    const query = {
      userId: id,
      status: 0,
    };
    if (gameId && gameId !== 'undefined') {
      query.gameId = gameId;
    }
    const bets = await betHistoryModel.find(query).sort({ createdAt: -1 });

    return res.status(200).json({ data: bets });
  } catch (error) {
    console.error('Error fetching bets:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getPendingBetsAmounts = async (req, res) => {
  const { id } = req;
  const { gameId, roundId } = req.query;

  try {
    const betTypes = [
      { gameType: 'Toss', marketName: 'Toss', category: 'sports' },
      { gameType: 'Match Odds', marketName: 'Match Odds', category: 'sports' },
      { gameType: 'fancy1', marketName: 'fancy1', category: 'sports' },
      { gameType: 'Tied Match', marketName: 'Tied Match', category: 'sports' },
      { gameType: 'Bookmaker', marketName: 'Bookmaker', category: 'sports' },
      { gameType: 'Normal', marketName: 'Toss', category: 'sports' },
      { gameType: 'meter', marketName: 'Match Odds', category: 'sports' },
      { gameType: 'line', marketName: 'Tied Match', category: 'sports' },
      { gameType: 'ball', marketName: 'Bookmaker', category: 'sports' },
      { gameType: 'khado', marketName: 'Bookmaker', category: 'sports' },
      { gameType: 'Winner', marketName: 'Winner', category: 'sports' },
      {
        gameType: '1st 6 over',
        marketName: '1st 6 over',
        category: 'sports',
      },
      {
        gameType: 'OVER_UNDER_05',
        marketName: 'OVER_UNDER_05',
        category: 'sports',
      },
      {
        gameType: 'OVER_UNDER_15',
        marketName: 'OVER_UNDER_15',
        category: 'sports',
      },
      {
        gameType: 'OVER_UNDER_25',
        marketName: 'OVER_UNDER_25',
        category: 'sports',
      },

      //Category fo Casino
      // { gameType: 'casino', marketName: 'WINNER', category: 'casino' },
    ];

    const validGameTypes = betTypes.map((bt) => bt.gameType);
    // console.log("The validGameTypes are", validGameTypes);

    const isAbCasino =
      gameId &&
      (gameId.toLowerCase() === 'ab3' || gameId.toLowerCase() === 'ab4');

    let casinoFilter;
    if (roundId) {
      if (isAbCasino) {
        const truncated = String(roundId).substring(0, 13);
        const escaped = truncated.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        casinoFilter = {
          betType: 'casino',
          roundId: { $regex: `^${escaped}` },
        };
      } else {
        casinoFilter = {
          betType: 'casino',
          roundId: String(roundId),
        };
      }
    } else {
      casinoFilter = { betType: 'casino' };
    }

    const bets = await betModel
      .find({
        userId: id,
        status: 0,
        gameId,
        $or: [
          { gameType: { $in: validGameTypes } }, // Sports bets
          casinoFilter, // All casino bets
        ],
      })
      .sort({ createdAt: -1 });

    // Separate cashed-out bets from active bets
    const activeBets = bets.filter((b) => !b.isCashedOut);
    const cashedOutBets = bets.filter((b) => b.isCashedOut);

    // Group cashout P/L by gameType so each market only sees its own cashout values
    const cashoutPLByGameType = {};
    for (const b of cashedOutBets) {
      const gt = b.gameType;
      if (!cashoutPLByGameType[gt]) cashoutPLByGameType[gt] = 0;
      cashoutPLByGameType[gt] += b.cashoutValue || 0;
    }

    // Group active bets by gameType + teamName
    const grouped = {};

    for (const bet of activeBets) {
      const betTeamName =
        bet.teamName?.includes('#') && gameId !== 'poker20'
          ? bet.teamName.split('#')[0]
          : bet.teamName;
      const key = `${bet.gameType}|${betTeamName}`;
      if (!grouped[key]) {
        grouped[key] = {
          // gameType: bet.gameType,
          // teamName: betTeamName,
          marketName: bet.marketName,
          // otype: bet.otype,
          // totalBetAmount: 0,
          // totalPrice: 0,
          // subtype: bet.subtype,
          details: [],
        };
      }

      // grouped[key].totalBetAmount += Number(bet.betAmount);
      // grouped[key].totalPrice += Number(bet.price);

      const cashoutHistoryRecords = await betHistoryModel.find({
        betId: bet._id.toString(),
        status: 0,
      });

      const detailGrouped = {};

      for (const history of cashoutHistoryRecords) {
        const historyTeamName =
          history.teamName?.includes('#') && gameId !== 'poker20'
            ? history.teamName.split('#')[0]
            : history.teamName;
        if (!detailGrouped[historyTeamName]) {
          detailGrouped[historyTeamName] = {
            teamName: historyTeamName,
            totalBetAmount: 0,
            totalPrice: 0,
          };
        }

        detailGrouped[historyTeamName].totalBetAmount += Number(
          history.betAmount
        );
        detailGrouped[historyTeamName].totalPrice += Number(history.price);
      }

      let details = Object.keys(detailGrouped).map((runner) => {
        let profit = 0;

        for (const history of cashoutHistoryRecords) {
          const historyTeamName =
            history.teamName?.includes('#') && gameId !== 'poker20'
              ? history.teamName.split('#')[0]
              : history.teamName;
          const sameRunner = historyTeamName === runner;

          if (history.otype === 'back') {
            if (sameRunner) {
              // back wins on selected runner
              profit += Number(history.betAmount);
            } else {
              // back loses on opposite runner
              profit -= Number(history.price);
            }
          } else {
            // lay logic
            if (sameRunner) {
              // lay loses if selected runner wins
              profit -= Number(history.price);
            } else {
              // lay wins if opposite runner wins
              profit += Number(history.betAmount);
            }
          }
        }

        // if (profit > 0) {
        //   profit = 0;

        //   for (const history of cashoutHistoryRecords) {
        //     const historyTeamName = history.teamName?.includes('#')
        //       ? history.teamName.split('#')[0]
        //       : history.teamName;
        //     const sameRunner = historyTeamName === runner;

        //     if (sameRunner) {
        //       if (history.otype === 'lay') {
        //         profit += Number(history.betAmount);
        //       } else if (history.otype === 'back') {
        //         profit -= Number(history.price);
        //       }
        //     }
        //   }
        // }

        return {
          teamName: runner,
          // betAmount: detailGrouped[runner].totalBetAmount,
          // -Math.abs(Number(bet.price)),
          price: -Math.abs(detailGrouped[runner].totalPrice),
          winProfit: profit,
        };
      });

      // if (details.length === 1) {
      let otherProfit = 0;

      for (const history of cashoutHistoryRecords) {
        if (history.otype === 'back') {
          otherProfit -= Number(history.price);
        } else {
          otherProfit += Number(history.betAmount);
        }
      }

      details.push({
        teamName: 'other',
        betAmount: 0,
        price: 0,
        winProfit: otherProfit,
      });

      grouped[key].details = details;
      grouped[key].netBet = otherProfit;
      // } else {
      //   grouped[key].details = details;
      //   grouped[key].netBet = details.reduce((sum, item) => sum + item.price, 0);
      // }

      // For fancy bets, also collect individual bet data for frontend exposure calc
      if (FANCY_GAME_TYPES.includes(bet.gameType)) {
        if (!grouped[key].fancyBets) grouped[key].fancyBets = [];
        grouped[key].fancyBets.push({
          fancyScore: bet.fancyScore,
          otype: bet.otype,
          betAmount: Number(bet.betAmount),
          price: Number(bet.price),
          subtype: bet.subtype,
        });
      }
    }

    const result = Object.values(grouped);
    return res.status(200).json({
      success: true,
      data: result,
      cashoutPL: cashoutPLByGameType,
    });
  } catch (error) {
    console.error('Error fetching bets:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getFancyMasterBook = async (req, res) => {
  const { id } = req;
  const { gameId, teamName, gameType, minScore, maxScore } = req.query;

  try {
    if (!gameId || !teamName || !gameType) {
      return res.status(400).json({
        success: false,
        message: 'gameId, teamName, and gameType are required',
      });
    }

    if (!FANCY_GAME_TYPES.includes(gameType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid fancy gameType: ${gameType}`,
      });
    }

    // Fetch pending bets for this specific fancy market
    // Same query pattern as placeFancyBet (betController.js:1237-1243)
    const bets = await betModel.find({
      userId: id,
      gameId,
      teamName,
      gameType,
      status: 0,
      isCashedOut: { $ne: true },
    });

    if (!bets || bets.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        meta: { gameId, teamName, gameType, totalBets: 0 },
      });
    }

    // Extract the fields needed for ladder calculation
    const fancyBets = bets.map((bet) => ({
      fancyScore: bet.fancyScore,
      otype: bet.otype,
      price: Number(bet.price),
      betAmount: Number(bet.betAmount),
    }));

    // Pass null to let the utility auto-detect range from bet lines,
    // or use explicit values if provided in query params
    const parsedMin = minScore != null ? parseInt(minScore, 10) : null;
    const parsedMax = maxScore != null ? parseInt(maxScore, 10) : null;

    const ladder = generateFancyLadder(fancyBets, parsedMin, parsedMax);

    return res.status(200).json({
      success: true,
      data: ladder,
      meta: {
        gameId,
        teamName,
        gameType,
        totalBets: bets.length,
      },
    });
  } catch (error) {
    console.error('Error generating fancy master book:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getBetHistory = async (req, res) => {
  const { id } = req;
  const {
    page = 1,
    limit = 10,
    startDate,
    endDate,
    selectedGame,
    selectedVoid,
  } = req.query;

  try {
    const query = { userId: id, status: 0 };

    // Filter by date if both start and end dates are provided
    if (startDate && endDate) {
      query.createdAt = getDateRangeUTC(startDate, endDate);
    }

    // Filter by selectedGame if provided
    if (selectedGame) {
      query.gameName = selectedGame;
    }

    // Filter by selectedVoid if provided
    if (selectedVoid === 'settel') {
      query.status = { $ne: 0 };
      query.betResult = { $not: { $regex: /^VOID$/i } };
    } else if (selectedVoid === 'void') {
      query.status = 2;
      query.betResult = { $regex: /^VOID$/i };
    } else if (selectedVoid === 'unsettel') {
      query.status = 0;
    }

    const bets = await betHistoryModel
      .find(query)
      .sort({ date: -1 }) // most recent first
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await betHistoryModel.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bets,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching bet history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// export const getProfitlossHistory = async (req, res) => {
//   const { id } = req; // User ID from auth middleware
//   const {
//     startDate,
//     endDate,
//     page = 1,
//     limit = 10,
//     eventName,
//     gameName,
//     marketName,
//     marketId,
//   } = req.query;

//   try {
//     const pageNum = Math.max(parseInt(page), 1);
//     const limitNum = Math.max(parseInt(limit), 1);
//     const skip = (pageNum - 1) * limitNum;

//     const betQuery = {
//       userId: id,
//       status: { $in: [1, 2] },
//     };

//     if (startDate && endDate) {
//       betQuery.date = getDateRangeUTC(startDate, endDate);
//     }

//     // Apply filters if provided
//     if (gameName) betQuery.gameName = gameName;
//     if (eventName) betQuery.eventName = eventName;
//     if (marketName) betQuery.marketName = marketName;
//     if (marketId) {
//       betQuery.market_id = { $regex: `${marketId}$` };
//     }
//     const fullFilterMode = gameName && eventName && marketName;

//     const bets = await betHistoryModel.find(betQuery);

//     if (fullFilterMode) {
//       const betsWithMarketId = bets.map((bet) => ({
//         ...bet.toObject(),
//         marketId: bet.market_id ? bet.market_id.match(/\d+/g)?.pop() : null,
//       }));
//       return res.status(200).json({
//         success: true,
//         data: {
//           report: betsWithMarketId,
//           total: {
//             totalBets: bets.length,
//             totalWinAmount: bets
//               .filter((b) => b.status === 1)
//               .reduce((sum, b) => sum + (b.resultAmount || 0), 0),
//             totalLossAmount: bets
//               .filter((b) => b.status === 2)
//               .reduce((sum, b) => sum + (b.resultAmount || 0), 0),
//           },
//         },
//       });
//     }

//     // 7. Existing grouping logic for partial filters
//     let groupKey = 'gameName';
//     if (gameName && !eventName && !marketName) {
//       groupKey = 'eventName';
//     } else if (gameName && eventName && !marketName) {
//       groupKey = 'marketName';
//     } else if (eventName && !gameName && !marketName) {
//       groupKey = 'marketName';
//     }

//     const reportMap = {};

//     const processedRounds = new Set();

//     for (const bet of bets) {
//       // const key = bet[groupKey]?.trim() || "Unknown";
//       let key;
//       if (eventName && !gameName && !marketName) {
//         // For EventMatches page, show individual markets
//         key =
//           `${bet.marketName}_${bet.market_id || bet._id}`.trim() || 'Unknown';
//       } else {
//         // Use existing logic for other cases
//         key = bet[groupKey]?.trim() || 'Unknown';
//       }

//       // const key = bet[groupKey]?.trim() || "Unknown";

//       if (!reportMap[key]) {
//         reportMap[key] = {
//           name: key,
//           eventName: bet.eventName,
//           gameName: bet.gameName,
//           marketName: bet.marketName,
//           marketId: bet.market_id ? bet.market_id.match(/\d+/g)?.pop() : null,
//           result: bet.betResult,
//           userName: bet.userName,
//           date: bet.createdAt,
//           WinAmount: 0,
//           LossAmount: 0,
//           myProfit: 0,
//         };
//       }

//       // Handle casino bets with round-based grouping
//       if (bet.betType === 'casino') {
//         const roundKey = `${bet.userId}_${bet.roundId}_${bet.gameId}_${key}`;

//         if (!processedRounds.has(roundKey)) {
//           processedRounds.add(roundKey);

//           // Get all bets for this round
//           const roundBets = bets.filter(
//             (b) =>
//               b.roundId === bet.roundId &&
//               b.gameId === bet.gameId &&
//               b.userId === bet.userId
//           );

//           // Calculate net result
//           let netWin = 0;
//           let netLoss = 0;

//           for (const roundBet of roundBets) {
//             const rplChange = roundBet.profitLossChange || 0;
//             if (rplChange > 0) {
//               netWin += rplChange;
//             } else if (rplChange < 0) {
//               netLoss += Math.abs(rplChange);
//             }
//           }

//           const netResult = netWin - netLoss;

//           if (netResult > 0) {
//             reportMap[key].WinAmount += netResult;
//           } else if (netResult < 0) {
//             reportMap[key].LossAmount += Math.abs(netResult);
//           }
//         }
//       } else {
//         // Normal bets - existing logic
//         const plChange = bet.profitLossChange || 0;
//         if (plChange > 0) {
//           reportMap[key].WinAmount += plChange;
//         } else if (plChange < 0) {
//           reportMap[key].LossAmount += Math.abs(plChange);
//         }
//       }
//       // Calculate individual profit for this bet entry
//       reportMap[key].myProfit =
//         reportMap[key].WinAmount - reportMap[key].LossAmount;
//     }

//     // 4. Get paginated bets and totals in parallel
//     const reportArray = Object.values(reportMap);
//     const total = reportArray.reduce(
//       (acc, curr) => ({
//         name: 'Total',
//         WinAmount: acc.WinAmount + curr.WinAmount,
//         LossAmount: acc.LossAmount + curr.LossAmount,
//         myProfit: acc.myProfit + curr.myProfit,
//       }),
//       { name: 'Total', WinAmount: 0, LossAmount: 0, myProfit: 0 }
//     );

//     console.log('reportArray', reportArray);

//     return res.status(200).json({
//       success: true,
//       data: {
//         report: reportArray,
//         total,
//       },
//     });
//   } catch (error) {
//     console.error('getMyReportByEvents error:', error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const getProfitlossHistory = async (req, res) => {
  const { id } = req; // User ID from auth middleware
  const {
    startDate,
    endDate,
    page = 1,
    limit = 10,
    eventName,
    gameName,
    marketName,
    marketId,
  } = req.query;

  try {
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    const betQuery = {
      userId: id,
      status: { $in: [1, 2] },
    };

    if (startDate && endDate) {
      betQuery.date = getDateRangeUTC(startDate, endDate);
    }

    // Apply filters if provided
    if (gameName) betQuery.gameName = gameName;
    if (eventName) betQuery.eventName = eventName;
    if (marketName) betQuery.marketName = marketName;
    if (marketId) {
      betQuery.market_id = { $regex: `${marketId}$` };
    }
    const fullFilterMode = gameName && eventName && marketName;

    const bets = await betHistoryModel.find(betQuery);

    if (fullFilterMode) {
      const betsWithMarketId = bets.map((bet) => ({
        ...bet.toObject(),
        marketId: bet.market_id ? bet.market_id.match(/\d+/g)?.pop() : null,
      }));
      return res.status(200).json({
        success: true,
        data: {
          report: betsWithMarketId,
          total: {
            totalBets: bets.length,
            totalWinAmount: bets
              .filter((b) => b.status === 1)
              .reduce((sum, b) => sum + (b.resultAmount || 0), 0),
            totalLossAmount: bets
              .filter((b) => b.status === 2)
              .reduce((sum, b) => sum + (b.resultAmount || 0), 0),
          },
        },
      });
    }

    // 7. Existing grouping logic for partial filters
    let groupKey = 'gameName';
    if (gameName && !eventName && !marketName) {
      groupKey = 'eventName';
    } else if (gameName && eventName && !marketName) {
      groupKey = 'marketName';
    } else if (eventName && !gameName && !marketName) {
      groupKey = 'marketName';
    }

    const reportMap = {};

    const processedRounds = new Set();

    for (const bet of bets) {
      // const key = bet[groupKey]?.trim() || "Unknown";
      let key;
      if (eventName && !gameName && !marketName) {
        // For EventMatches page, show individual markets
        key =
          `${bet.marketName}_${bet.market_id || bet._id}`.trim() || 'Unknown';
      } else {
        // Use existing logic for other cases
        key = bet[groupKey]?.trim() || 'Unknown';
      }

      // const key = bet[groupKey]?.trim() || "Unknown";

      if (!reportMap[key]) {
        reportMap[key] = {
          name: key,
          eventName: bet.eventName,
          gameName: bet.gameName,
          marketName: bet.marketName,
          marketId: bet.market_id ? bet.market_id.match(/\d+/g)?.pop() : null,
          result: bet.betResult,
          userName: bet.userName,
          date: bet.createdAt,
          WinAmount: 0,
          LossAmount: 0,
          myProfit: 0,
        };
      }

      // Handle casino bets with round-based grouping
      if (bet.betType === 'casino') {
        const roundKey = `${bet.userId}_${bet.roundId}_${bet.gameId}_${key}`;

        if (!processedRounds.has(roundKey)) {
          processedRounds.add(roundKey);

          const hasEventName =
            eventName && eventName !== 'undefined' && eventName.trim() !== '';
          // Get all bets for this round

          const roundBets = bets.filter(
            (b) =>
              b.roundId === bet.roundId &&
              b.gameId === bet.gameId &&
              b.userId === bet.userId &&
              (!hasEventName || // if eventName not valid → skip marketName filter
                b.marketName === bet.marketName)
          );

          // Calculate net result
          let netWin = 0;
          let netLoss = 0;

          for (const roundBet of roundBets) {
            const rplChange = roundBet.profitLossChange || 0;
            if (rplChange > 0) {
              netWin += rplChange;
            } else if (rplChange < 0) {
              netLoss += Math.abs(rplChange);
            }
          }

          const netResult = netWin - netLoss;

          if (netResult > 0) {
            reportMap[key].WinAmount += netResult;
          } else if (netResult < 0) {
            reportMap[key].LossAmount += Math.abs(netResult);
          }
        }
      } else {
        // Normal bets - existing logic
        const plChange = bet.profitLossChange || 0;
        if (plChange > 0) {
          reportMap[key].WinAmount += plChange;
        } else if (plChange < 0) {
          reportMap[key].LossAmount += Math.abs(plChange);
        }
      }
      // Calculate individual profit for this bet entry
      reportMap[key].myProfit =
        reportMap[key].WinAmount - reportMap[key].LossAmount;
    }

    // 4. Get paginated bets and totals in parallel
    const reportArray = Object.values(reportMap);
    const total = reportArray.reduce(
      (acc, curr) => ({
        name: 'Total',
        WinAmount: acc.WinAmount + curr.WinAmount,
        LossAmount: acc.LossAmount + curr.LossAmount,
        myProfit: acc.myProfit + curr.myProfit,
      }),
      { name: 'Total', WinAmount: 0, LossAmount: 0, myProfit: 0 }
    );

    console.log('reportArray', reportArray);

    return res.status(200).json({
      success: true,
      data: {
        report: reportArray,
        total,
      },
    });
  } catch (error) {
    console.error('getMyReportByEvents error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getTransactionHistoryByUserAndDate = async (req, res) => {
  try {
    const { id } = req;
    const { startDate, endDate, page, limit } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const filter = {
      userId: id,
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      end.setDate(end.getDate() + 1);

      filter.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    const user = await SubAdmin.findById(id, { userName: 1 }).lean();
    const currentUserName = user?.userName;

    const transactions = await TransactionHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Privacy: hide master/upline name from client users
    const maskedTransactions = transactions.map((txn) => {
      const masked = { ...txn };
      if (masked.to === currentUserName && masked.from !== currentUserName) {
        masked.from = 'Upline';
      }
      return masked;
    });

    console.log('Found transactions:', maskedTransactions.length);

    return res.status(200).json({
      success: true,
      data: maskedTransactions,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const getAccountStatementHistory = async (req, res) => {
  try {
    const { id, role } = req;
    const {
      startDate,
      endDate,
      accountType = 'all',
      gameType = 'all',
      marketName,
      sportsName,
      sportsGameType,
      userName,
      page = 1,
      limit = 100,
    } = req.query;

    const privilegedReportRoles = [
      'admin',
      'master',
      'superadmin',
      'supperadmin',
    ];
    const clientSearchRoles = [
      'supperadmin',
      'superadmin',
      'admin',
      'white',
      'super',
      'master',
      'agent',
    ];
    const isPrivileged = privilegedReportRoles.includes(role);
    const canSearchByClient = clientSearchRoles.includes(role);
    const isSuperAdmin = role === 'supperadmin' || role === 'superadmin';
    let targetUserIds = [];

    if (userName && canSearchByClient) {
      const selectedUser = await SubAdmin.findOne(
        { userName, status: { $ne: 'delete' } },
        { _id: 1 }
      ).lean();
      if (selectedUser?._id) {
        if (isSuperAdmin) {
          targetUserIds = [selectedUser._id.toString()];
        } else {
          const downlineIds = await getAllDownlineMemberIds(SubAdmin, id);
          if (downlineIds.includes(selectedUser._id.toString())) {
            targetUserIds = [selectedUser._id.toString()];
          } else {
            targetUserIds = ['non_existent_user'];
          }
        }
      } else {
        targetUserIds = ['non_existent_user'];
      }
    } else if (!isPrivileged) {
      targetUserIds = [id];
    } else {
      if (isSuperAdmin) {
        const users = await SubAdmin.find(
          { status: { $ne: 'delete' } },
          { _id: 1 }
        ).lean();
        targetUserIds = users.map((u) => u._id.toString());
      } else {
        targetUserIds = await getAllDownlineMemberIds(SubAdmin, id);
      }
      if (targetUserIds.length === 0) targetUserIds = ['no_downline_users'];
    }

    const userIdMatch = normalizeUserIdsForQuery(targetUserIds);

    let targetUserNames = [];
    if (
      targetUserIds.length > 0 &&
      targetUserIds[0] !== 'non_existent_user' &&
      targetUserIds[0] !== 'no_downline_users'
    ) {
      const profileUsers = await SubAdmin.find(
        { _id: { $in: targetUserIds } },
        { userName: 1 }
      ).lean();
      targetUserNames = profileUsers.map((u) => u.userName).filter(Boolean);
    }

    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    // Parse Dates
    let dateFilter = null;

    if (startDate && endDate) {
      dateFilter = getDateRangeUTC(startDate, endDate);
    }

    // 1. Current ledger balance (balance) for anchor / no-date fallback
    let currentBalance = 0;
    if (
      targetUserIds.length > 0 &&
      targetUserIds[0] !== 'non_existent_user' &&
      targetUserIds[0] !== 'no_downline_users'
    ) {
      const users = await SubAdmin.find(
        { _id: { $in: targetUserIds } },
        { balance: 1 }
      ).lean();
      currentBalance = users.reduce(
        (acc, u) => acc + Number(u.balance || 0),
        0
      );
    }

    const transactionQuery = { userId: { $in: userIdMatch } };

    if (accountType === 'deposit') {
      transactionQuery.remark = { $not: /Settlement/i };
    } else if (accountType === 'settlement') {
      transactionQuery.remark = /Settlement/i;
    }

    const betQuery = {
      status: { $in: [1, 2] },
      userId: { $in: userIdMatch },
    };

    if (accountType === 'casino') {
      betQuery.betType = 'casino';
    } else if (accountType === 'sports') {
      betQuery.betType = { $ne: 'casino' };
    } else if (gameType === 'casino') {
      betQuery.betType = 'casino';
    } else if (gameType === 'sports') {
      betQuery.betType = { $ne: 'casino' };
    }

    if (marketName) betQuery.marketName = { $regex: marketName, $options: 'i' };
    if (sportsName) betQuery.gameName = { $regex: sportsName, $options: 'i' };
    if (sportsGameType) {
      if (sportsGameType === 'matchOdds')
        betQuery.gameType = { $regex: '^Match\\s*Odds$', $options: 'i' };
      else if (sportsGameType === 'fancy')
        betQuery.gameType = { $regex: 'fancy', $options: 'i' };
    }

    const transactionPipeline = [
      { $match: transactionQuery },
      {
        $addFields: {
          activityDate: txnActivityDateExpr,
        },
      },
      ...(dateFilter ? [{ $match: { activityDate: dateFilter } }] : []),
      {
        $project: {
          date: '$activityDate',
          credit: { $toDouble: { $ifNull: ['$deposite', 0] } },
          debit: { $toDouble: { $ifNull: ['$withdrawl', 0] } },
          description: {
            $trim: {
              input: {
                $replaceAll: {
                  input: { $ifNull: ['$remark', 'Transaction'] },
                  find: 'Settlement: ',
                  replacement: '',
                },
              },
            },
          },
          from: { $ifNull: ['$from', ''] },
          to: { $ifNull: ['$to', ''] },
          fromto: {
            $concat: [
              { $ifNull: ['$from', '-'] },
              ' / ',
              { $ifNull: ['$to', '-'] },
            ],
          },
          userName: { $ifNull: ['$userName', ''] },
          type: { $literal: 'txn' },
          category: {
            $switch: {
              branches: [
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ['$remark', ''] },
                      regex: 'Settlement',
                      options: 'i',
                    },
                  },
                  then: 'Settlement',
                },
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ['$remark', ''] },
                      regex: 'Bonus',
                      options: 'i',
                    },
                  },
                  then: 'Bonus',
                },
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ['$remark', ''] },
                      regex: 'Opening Balance',
                      options: 'i',
                    },
                  },
                  then: 'Opening Balance',
                },
                {
                  case: {
                    $gt: [{ $toDouble: { $ifNull: ['$deposite', 0] } }, 0],
                  },
                  then: 'Deposit',
                },
                {
                  case: {
                    $gt: [{ $toDouble: { $ifNull: ['$withdrawl', 0] } }, 0],
                  },
                  then: 'Withdraw',
                },
              ],
              default: 'Transaction',
            },
          },
        },
      },
    ];

    const betPipeline = [
      { $match: betQuery },
      {
        $addFields: {
          activityDate: betActivityDateExpr,
        },
      },
      ...(dateFilter ? [{ $match: { activityDate: dateFilter } }] : []),
      {
        $project: {
          date: '$activityDate',
          pl: { $toDouble: { $ifNull: ['$profitLossChange', 0] } },
          betType: { $ifNull: ['$betType', ''] },
          gameName: { $ifNull: ['$gameName', ''] },
          eventName: { $ifNull: ['$eventName', ''] },
          marketName: { $ifNull: ['$marketName', ''] },
          teamName: { $ifNull: ['$teamName', ''] },
          fancyScore: { $ifNull: ['$fancyScore', ''] },
          gameType: { $ifNull: ['$gameType', ''] },
          userId: { $ifNull: ['$userId', ''] },
          sourceId: '$_id',
          fromto: { $ifNull: ['$userName', ''] },
          userName: { $ifNull: ['$userName', ''] },
          type: { $literal: 'bet' },
          otype: { $ifNull: ['$otype', ''] },
          betAmount: { $toDouble: { $ifNull: ['$betAmount', 0] } },
          price: { $toDouble: { $ifNull: ['$price', 0] } },
          xValue: { $toDouble: { $ifNull: ['$xValue', 0] } },
          betResult: { $ifNull: ['$betResult', ''] },
        },
      },
      {
        $project: {
          date: 1,
          pl: 1,
          gameName: 1,
          eventName: 1,
          marketName: 1,
          teamName: 1,
          fancyScore: 1,
          gameType: 1,
          userId: 1,
          sourceId: 1,
          credit: { $cond: [{ $gt: ['$pl', 0] }, '$pl', 0] },
          debit: { $cond: [{ $lt: ['$pl', 0] }, { $abs: '$pl' }, 0] },
          fromto: 1,
          userName: 1,
          type: 1,
          otype: 1,
          betAmount: 1,
          price: 1,
          xValue: 1,
          betResult: 1,
          category: {
            $cond: [{ $eq: ['$betType', 'casino'] }, 'Casino', 'Sports'],
          },
        },
      },
    ];

    const includeLiveCasinoHistory =
      accountType === 'casino' ||
      gameType === 'casino' ||
      (accountType === 'all' && gameType !== 'sports');

    const casinoBetMatch = {
      $and: [
        buildCasinoUserMatch(targetUserIds, targetUserNames),
        ...(sportsName
          ? [{ game_name: { $regex: sportsName, $options: 'i' } }]
          : []),
      ],
    };

    const casinoBetPipeline = [
      { $match: casinoBetMatch },
      {
        $addFields: {
          activityDate: casinoActivityDateExpr,
        },
      },
      ...(dateFilter ? [{ $match: { activityDate: dateFilter } }] : []),
      {
        $project: {
          date: '$activityDate',
          bet_amount: { $toDouble: { $ifNull: ['$bet_amount', 0] } },
          win_amount: { $toDouble: { $ifNull: ['$win_amount', 0] } },
          game_name: { $ifNull: ['$game_name', ''] },
          game_uid: { $ifNull: ['$game_uid', ''] },
          sourceId: '$_id',
          fromto: { $ifNull: ['$userName', ''] },
          userName: { $ifNull: ['$userName', ''] },
          type: { $literal: 'casino' },
        },
      },
      {
        $addFields: {
          pl: { $subtract: ['$win_amount', '$bet_amount'] },
        },
      },
      {
        $project: {
          date: 1,
          pl: 1,
          game_name: 1,
          game_uid: 1,
          sourceId: 1,
          credit: { $cond: [{ $gt: ['$pl', 0] }, '$pl', 0] },
          debit: { $cond: [{ $lt: ['$pl', 0] }, { $abs: '$pl' }, 0] },
          fromto: 1,
          userName: 1,
          type: 1,
          betAmount: '$bet_amount',
          price: { $literal: 0 },
          xValue: { $literal: 0 },
          category: { $literal: 'Casino' },
        },
      },
    ];

    const casinoUnionStage = {
      $unionWith: {
        coll: CasinoBetHistory.collection.name,
        pipeline: casinoBetPipeline,
      },
    };

    let mainColl;
    let pipeline = [];

    if (accountType === 'all') {
      mainColl = TransactionHistory;
      pipeline = [
        ...transactionPipeline,
        {
          $unionWith: {
            coll: betHistoryModel.collection.name,
            pipeline: betPipeline,
          },
        },
        ...(includeLiveCasinoHistory ? [casinoUnionStage] : []),
        { $sort: { date: 1 } },
      ];
    } else if (accountType === 'deposit' || accountType === 'settlement') {
      mainColl = TransactionHistory;
      pipeline = [...transactionPipeline, { $sort: { date: 1 } }];
    } else if (accountType === 'bonus') {
      mainColl = TransactionHistory;
      transactionQuery.remark = /Bonus/i;
      pipeline = [...transactionPipeline, { $sort: { date: 1 } }];
    } else if (accountType === 'casino') {
      mainColl = CasinoBetHistory;
      pipeline = [
        ...casinoBetPipeline,
        {
          $unionWith: {
            coll: betHistoryModel.collection.name,
            pipeline: betPipeline,
          },
        },
        { $sort: { date: 1 } },
      ];
    } else {
      mainColl = betHistoryModel;
      pipeline = [...betPipeline, { $sort: { date: 1 } }];
    }

    const needsGameReportExpand =
      accountType === 'sports' ||
      accountType === 'all' ||
      accountType === 'casino';

    const applySettlementRowFormat = (row) => {
      if (row.category !== 'Settlement') return;
      row.description = formatSettlementDescription({
        date: row.date,
        userName: row.userName,
        from: row.from,
        to: row.to,
        deposite: row.credit,
        withdrawl: row.debit,
      });
      row.fromto = formatSettlementFromTo({
        from: row.from,
        to: row.to,
        deposite: row.credit,
      });
      delete row.from;
      delete row.to;
    };

    let total = 0;
    let paginatedRows = [];
    let allRowsForClosing = [];

    if (needsGameReportExpand) {
      allRowsForClosing = await mainColl.aggregate(pipeline);
      allRowsForClosing = await expandGameReportRows(allRowsForClosing, {
        includeCommission: false,
      });
    } else {
      allRowsForClosing = await mainColl.aggregate(pipeline);
    }
    allRowsForClosing.forEach(applySettlementRowFormat);

    let ledgerOpening = currentBalance;
    let ledgerClosingBalance = currentBalance;
    if (dateFilter && startDate && endDate) {
      [ledgerOpening, ledgerClosingBalance] = await Promise.all([
        getLedgerBalanceAtTimestamp(targetUserIds, startDate, 'opening'),
        getLedgerBalanceAtTimestamp(targetUserIds, endDate, 'closing'),
      ]);
    }

    assignStatementRowClosings(allRowsForClosing, ledgerOpening);
    total = allRowsForClosing.length;
    sortStatementRowsNewestFirst(allRowsForClosing);
    paginatedRows = allRowsForClosing.slice(skip, skip + limitNum);

    const openingBalance = resolvePassbookSummaryOpening(
      ledgerOpening,
      allRowsForClosing
    );

    return res.status(200).json({
      success: true,
      data: paginatedRows,
      openingBalance: Number(openingBalance.toFixed(2)),
      ledgerOpeningBalance: Number(ledgerOpening.toFixed(2)),
      closingBalance: Number(ledgerClosingBalance.toFixed(2)),
      ledgerClosingBalance: Number(ledgerClosingBalance.toFixed(2)),
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching account statement history:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const getAccountStatementMarketBets = async (req, res) => {
  try {
    const { id, role } = req;
    const {
      sourceType = 'sports',
      sourceId,
      gameName,
      eventName,
      marketName,
      runner,
      userName,
      rowDate,
      page = 1,
      limit = 25,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 25, 1);

    const isSuperAdmin = role === 'supperadmin' || role === 'superadmin';
    let allowedUserIds = [];

    if (isSuperAdmin) {
      const users = await SubAdmin.find(
        { status: { $ne: 'delete' } },
        { _id: 1 }
      ).lean();
      allowedUserIds = users.map((u) => u._id.toString());
    } else {
      allowedUserIds = await getAllDownlineMemberIds(SubAdmin, id);
      allowedUserIds.push(String(id));
    }

    const canViewUser = (userId) => allowedUserIds.includes(String(userId));

    let bet = null;
    let resolvedSourceType = sourceType;

    if (sourceType === 'casino' && sourceId) {
      bet = await CasinoBetHistory.findById(sourceId).lean();
    } else if (sourceId) {
      bet = await betHistoryModel.findById(sourceId).lean();
      resolvedSourceType = 'sports';
    } else {
      const parsed = parseGameReportDescription(
        [gameName, eventName, marketName, runner].filter(Boolean).join('/')
      );
      const isCasino =
        sourceType === 'casino' ||
        parsed.isCasino ||
        String(eventName).toUpperCase() === 'CASINO';

      if (isCasino) {
        const casinoQuery = {};
        if (userName) casinoQuery.userName = userName;
        if (parsed.gameName) {
          casinoQuery.game_name = new RegExp(`^${parsed.gameName}$`, 'i');
        }
        if (parsed.runner) casinoQuery.game_uid = String(parsed.runner);
        if (rowDate) {
          const d = new Date(rowDate);
          casinoQuery.createdAt = {
            $gte: new Date(d.getTime() - 120000),
            $lte: new Date(d.getTime() + 120000),
          };
        }
        bet = await CasinoBetHistory.findOne(casinoQuery)
          .sort({ createdAt: -1 })
          .lean();
        resolvedSourceType = 'casino';
      } else {
        const betQuery = {
          status: { $in: [1, 2] },
        };
        if (userName) betQuery.userName = userName;
        if (gameName || parsed.gameName) {
          betQuery.gameName = gameName || parsed.gameName;
        }
        if (eventName || parsed.eventName) {
          betQuery.eventName = eventName || parsed.eventName;
        }
        if (marketName || parsed.marketName) {
          betQuery.marketName = marketName || parsed.marketName;
        }
        const selection = runner || parsed.runner;
        if (selection) {
          betQuery.$or = [
            { teamName: selection },
            { fancyScore: String(selection) },
          ];
        }
        if (rowDate) {
          const d = new Date(rowDate);
          const range = {
            $gte: new Date(d.getTime() - 120000),
            $lte: new Date(d.getTime() + 120000),
          };
          betQuery.$and = [{ $or: [{ settledAt: range }, { date: range }] }];
        }
        bet = await betHistoryModel.findOne(betQuery).sort({ date: -1 }).lean();
        resolvedSourceType = 'sports';
      }
    }

    if (!bet || !canViewUser(bet.userId)) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { total: 0, page: pageNum, pages: 0 },
      });
    }

    const user = await SubAdmin.findOne(
      { userName: bet.userName },
      { lastIP: 1 }
    ).lean();

    const formatted = formatMarketBetForModal(
      bet,
      user?.lastIP,
      resolvedSourceType
    );

    return res.status(200).json({
      success: true,
      data: [formatted],
      pagination: { total: 1, page: 1, pages: 1 },
    });
  } catch (error) {
    console.error('Error fetching account statement market bets:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
