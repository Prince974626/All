import axios from 'axios';

import betHistoryModel from '../models/betHistoryModel.js';
import CasinoBetHistory from '../models/casinoBetHistory.model.js';
import CasinoGgrCallbackLog from '../models/casinoGgrCallbackLog.model.js';
import SubAdmin from '../models/subAdminModel.js';
import {
  sendBalanceUpdates,
  sendUserRefresh,
} from '../socket/bettingSocket.js';
import { decrypt, encrypt } from '../utils/casinoCrypto.js';
import { isUserOrUplineLockedForMarket } from '../utils/marketLockUtils.js';
import { updateAllUplines } from './admin/subAdminController.js';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const getCasinoApiConfig = () => {
  const API_TOKEN = process.env.CASINO_API_TOKEN;
  const SERVER_URL = process.env.CASINO_API_URL;

  if (!API_TOKEN || !SERVER_URL) {
    throw new Error(
      'CASINO_API_TOKEN and CASINO_API_URL must be set in .env'
    );
  }

  return { API_TOKEN, SERVER_URL };
};

// . Start Casino Game
export const startCasinoGame = async (req, res) => {
  try {
    const { API_TOKEN, SERVER_URL } = getCasinoApiConfig();
    const { userName, game_uid, credit_amount } = req.body;

    // Validate required fields
    if (!userName || !game_uid || !credit_amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userName, game_uid, credit_amount',
      });
    }

    //  Find the logged-in user before launching game
    const subAdmin = await SubAdmin.findById(req.id);
    if (!subAdmin) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    if (subAdmin.userName.toLowerCase() !== String(userName).toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'You can only launch casino games for your own account',
      });
    }

    if (subAdmin.isDemo) {
      return res.status(403).json({
        success: false,
        message: 'Demo accounts cannot play this casino. Please login with a real account.',
      });
    }

    const provider = String(req.body?.provider || '').trim() || 'unknown';
    if (
      await isUserOrUplineLockedForMarket(SubAdmin, subAdmin, {
        ggrProvider: provider,
        gameType: 'Casino',
      })
    ) {
      return res.status(403).json({
        success: false,
        message: 'game locked plz contact upper level',
      });
    }

    const roundedBalance = Math.round(subAdmin.avbalance * 100) / 100;
    const roundedCreditAmount =
      Math.round(parseFloat(credit_amount) * 100) / 100;

    if (roundedBalance < roundedCreditAmount) {
      console.log('subadmin balance', subAdmin.avbalance);
      console.log('credit amount', credit_amount);
      console.log('rounded balance', roundedBalance);
      console.log('rounded credit amount', roundedCreditAmount);
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
      });
    }

    const timestamp = Math.round(Date.now());

    //  Create payload exactly like PHP code
    const requestData = {
      user_id: userName, // Using userName as user_id
      wallet_amount: parseFloat(credit_amount),
      game_uid: game_uid,
      token: API_TOKEN,
      timestamp: timestamp,
    };

    //  Encrypt the payload using the secret key
    const message = JSON.stringify(requestData);
    const encryptedPayload = encrypt(message); // This uses your existing encrypt function

    //  Build URL with parameters (like PHP code)
    const gameUrl =
      `${SERVER_URL}/launch_game?` +
      `user_id=${encodeURIComponent(userName)}` +
      `&wallet_amount=${encodeURIComponent(credit_amount)}` +
      `&game_uid=${encodeURIComponent(game_uid)}` +
      `&token=${encodeURIComponent(API_TOKEN)}` +
      `&timestamp=${encodeURIComponent(timestamp)}` +
      `&payload=${encodeURIComponent(encryptedPayload)}`;

    console.log('🔹 Generated game URL:', gameUrl);

    //  Return the game URL for frontend to redirect
    return res.json({
      success: true,
      gameUrl: gameUrl,
      message: 'Game URL generated successfully',
    });
  } catch (error) {
    console.error(' Casino launch error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message,
    });
  }
};

const upsertGgrBetHistory = async (betRecord) => {
  const stake = Number(betRecord.bet_amount || 0);
  const win = Number(betRecord.win_amount || 0);
  const profitLossChange = win - stake;
  const isWin = win > 0;

  const historyPayload = {
    userId: betRecord.userId,
    userName: betRecord.userName,
    gameId: String(betRecord.game_uid || ''),
    roundId: String(betRecord.game_round || ''),
    betId: betRecord._id.toString(),
    betType: 'casino',
    casinoSource: 'ggr',
    otype: 'back',
    price: stake,
    xValue: 1,
    resultAmount: Math.abs(profitLossChange),
    profitLossChange,
    betAmount: stake,
    status: isWin ? 1 : 2,
    eventName: betRecord.game_name || 'Casino',
    marketName: 'WINNER',
    gameType: 'casino',
    gameName: 'Casino',
    teamName: betRecord.game_name || 'Casino',
    betResult: isWin ? 'WIN' : 'LOSS',
    settledBy: 'api',
    settledAt: new Date(),
    balanceBeforeSettlement: betRecord.wallet_before,
    balanceAfterSettlement: betRecord.wallet_after,
    balanceDeltaApplied: profitLossChange,
    date: betRecord.createdAt || new Date(),
  };

  await betHistoryModel.findOneAndUpdate(
    {
      casinoSource: 'ggr',
      userId: betRecord.userId,
      roundId: String(betRecord.game_round || ''),
    },
    { $set: historyPayload },
    { upsert: true, new: true }
  );
};

/**
 * GGR casino callback — mirrors PHP callback.php wallet math:
 *   new_wallet = current_wallet + (win - bet)
 *
 * Differences vs old Node path (fixes wallet mismatch):
 * - Never trusts provider wallet_before / wallet_after for our ledger
 * - Applies only the delta vs what we already applied for this game_round
 *   (idempotent for bet-then-win callbacks and provider retries)
 * - Always stores the pure provider payload in CasinoGgrCallbackLog
 */
export const casinoCallback = async (req, res) => {
  let callbackLog = null;

  try {
    const body = req.body || {};
    console.log('🎰 Casino callback (raw):', JSON.stringify(body));

    // Persist pure provider payload first (debug / mismatch investigation)
    try {
      callbackLog = await CasinoGgrCallbackLog.create({
        rawBody: body,
        rawHeaders: req.headers,
        query: req.query,
        ip:
          req.headers?.['x-forwarded-for']?.toString()?.split(',')[0]?.trim() ||
          req.socket?.remoteAddress ||
          '',
        userName: body.mobile != null ? String(body.mobile) : undefined,
        game_uid: body.game_uid != null ? String(body.game_uid) : undefined,
        game_round:
          body.game_round != null ? String(body.game_round) : undefined,
        processed: false,
        processResult: 'received',
      });
    } catch (logErr) {
      console.error('Failed to store GGR callback log:', logErr.message);
    }

    const {
      mobile,
      bet_amount,
      win_amount,
      game_uid,
      game_name,
      game_round,
      wallet_before,
      wallet_after,
      change,
      token,
      timestamp,
      currency_code,
    } = body;

    if (!mobile || !game_round) {
      console.warn(
        'Casino callback rejected — missing mobile or game_round:',
        JSON.stringify(body)
      );
      if (callbackLog) {
        await CasinoGgrCallbackLog.updateOne(
          { _id: callbackLog._id },
          { $set: { processResult: 'invalid_payload', processed: true } }
        );
      }
      return res.json({ code: 1, msg: 'Invalid payload' });
    }

    const bet = round2(bet_amount);
    const win = round2(win_amount);
    const providerChange = round2(change);

    const currentUser = await SubAdmin.findOne({ userName: mobile });
    if (!currentUser) {
      if (callbackLog) {
        await CasinoGgrCallbackLog.updateOne(
          { _id: callbackLog._id },
          { $set: { processResult: 'user_not_found', processed: true } }
        );
      }
      return res.json({ code: 1, msg: 'User not found' });
    }

    if (currentUser.isDemo) {
      console.warn(`GGR casino callback ignored for demo user: ${mobile}`);
      if (callbackLog) {
        await CasinoGgrCallbackLog.updateOne(
          { _id: callbackLog._id },
          { $set: { processResult: 'demo_ignored', processed: true } }
        );
      }
      return res.json({
        code: 1,
        msg: 'Demo accounts cannot play this casino',
      });
    }

    // Existing round row (unique on userName + game_round)
    let betRecord = await CasinoBetHistory.findOne({
      userName: mobile,
      game_round: String(game_round),
    });

    // Merge amounts so bet-only then win-only callbacks both work (PHP-style net)
    const mergedBet = round2(
      Math.max(bet, Number(betRecord?.bet_amount || 0))
    );
    const mergedWin = round2(
      Math.max(win, Number(betRecord?.win_amount || 0))
    );

    // PHP: new_wallet = current_wallet + (win - bet)
    // Idempotent: only apply the difference from what we already booked for this round
    const prevNet = betRecord
      ? round2(
          Number(betRecord.win_amount || 0) - Number(betRecord.bet_amount || 0)
        )
      : 0;
    const newNet = round2(mergedWin - mergedBet);
    const delta = round2(newNet - prevNet);

    const walletBeforeOurs = round2(currentUser.avbalance);

    let updatedUser = currentUser;
    if (delta !== 0) {
      updatedUser = await SubAdmin.findOneAndUpdate(
        { _id: currentUser._id },
        {
          $inc: {
            balance: delta,
            avbalance: delta,
            bettingProfitLoss: delta,
          },
        },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        if (callbackLog) {
          await CasinoGgrCallbackLog.updateOne(
            { _id: callbackLog._id },
            { $set: { processResult: 'user_update_failed', processed: true } }
          );
        }
        return res.json({ code: 1, msg: 'User not found' });
      }
    }

    const walletAfterOurs = round2(updatedUser.avbalance);

    // Upsert game history like PHP (insert or update by round)
    const historyFields = {
      userId: updatedUser._id.toString(),
      userName: mobile,
      game_uid: game_uid != null ? String(game_uid) : betRecord?.game_uid,
      game_name: game_name || betRecord?.game_name,
      game_round: String(game_round),
      bet_amount: mergedBet,
      win_amount: mergedWin,
      // Local net P/L — do not trust provider `change`
      change: newNet,
      wallet_before: betRecord?.wallet_before ?? walletBeforeOurs,
      wallet_after: walletAfterOurs,
      currency_code: currency_code || betRecord?.currency_code || 'INR',
      token: token || betRecord?.token,
      provider_timestamp: timestamp
        ? new Date(Number(timestamp) || timestamp)
        : new Date(),
      providerRaw: body,
      processedAt: new Date(),
      notes: `provider_change=${providerChange}; provider_wallet_before=${wallet_before}; provider_wallet_after=${wallet_after}; applied_delta=${delta}`,
    };

    betRecord = await CasinoBetHistory.findOneAndUpdate(
      { userName: mobile, game_round: String(game_round) },
      { $set: historyFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await upsertGgrBetHistory(betRecord);

    const userId = updatedUser._id.toString();
    sendBalanceUpdates(userId, walletAfterOurs);
    sendUserRefresh(userId);

    if (delta !== 0) {
      await updateAllUplines(userId);
    }

    if (callbackLog) {
      await CasinoGgrCallbackLog.updateOne(
        { _id: callbackLog._id },
        {
          $set: {
            processed: true,
            processResult: delta === 0 ? 'noop_duplicate_or_unchanged' : 'success',
            appliedDelta: delta,
            walletBefore: walletBeforeOurs,
            walletAfter: walletAfterOurs,
          },
        }
      );
    }

    console.log(
      `GGR callback OK | ${mobile} | round=${game_round} | bet=${mergedBet} win=${mergedWin} | delta=${delta} | av ${walletBeforeOurs}→${walletAfterOurs}`
    );

    return res.json({ code: 0, msg: 'success' });
  } catch (err) {
    console.error('Casino callback error:', err);
    console.error('Error stack:', err.stack);
    if (callbackLog) {
      try {
        await CasinoGgrCallbackLog.updateOne(
          { _id: callbackLog._id },
          {
            $set: {
              processed: true,
              processResult: 'error',
              errorMessage: err.message,
            },
          }
        );
      } catch (_) {
        /* ignore */
      }
    }
    return res.json({ code: 1, msg: err.message });
  }
};

//  Debug encryption/decryption
export const debugEncryption = async (req, res) => {
  try {
    const testData = {
      user_id: 'user12',
      wallet_amount: 100,
      game_uid: '1',
      token: '31417734-0bde-4dd7-8691-0d5a5a',
      timestamp: Math.round(Date.now()),
    };

    // Test encryption
    const message = JSON.stringify(testData);

    const encrypted = encrypt(message);

    const decrypted = decrypt(encrypted);

    // Test if they match
    const isMatch = JSON.stringify(testData) === JSON.stringify(decrypted);

    res.json({
      original: testData,
      jsonString: message,
      encrypted: encrypted,
      decrypted: decrypted,
      isMatch: isMatch,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Simple test without encryption
export const debugSimple = async (req, res) => {
  try {
    const testData = {
      user_id: 'user12',
      wallet_amount: 100,
      game_uid: '1',
      token: '31417734-0bde-4dd7-8691-0d5a5a',
      timestamp: Math.round(Date.now()),
    };

    const message = JSON.stringify(testData);
    console.log(' JSON string:', message);

    res.json({
      success: true,
      message: 'Simple test successful',
      data: testData,
      jsonString: message,
    });
  } catch (error) {
    console.error(' Simple test error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get Casino Bet History by User ID
export const getCasinoBetHistory = async (req, res) => {
  try {
    const { userId } = req.params; // Get userId from URL params
    const { page = 1, limit = 10, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Build query
    const query = { userId: userId };

    // Add date filtering if provided
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    // Get bets with pagination
    const bets = await CasinoBetHistory.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await CasinoBetHistory.countDocuments(query);

    // Calculate totals
    const totalBetAmount = await CasinoBetHistory.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$bet_amount' } } },
    ]);

    const totalWinAmount = await CasinoBetHistory.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$win_amount' } } },
    ]);

    res.status(200).json({
      success: true,
      data: bets,
      summary: {
        totalBetAmount: totalBetAmount[0]?.total || 0,
        totalWinAmount: totalWinAmount[0]?.total || 0,
        netResult:
          (totalWinAmount[0]?.total || 0) - (totalBetAmount[0]?.total || 0),
      },
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching casino bet history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const getAllDownlineCasinoBetHistory = async (req, res) => {
  try {
    const id = req.id || req.body.id || req.query.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    //  Get admin
    const admin = await SubAdmin.findById(id).select('_id code');
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    //  Get all downline userIds using graphLookup (🔥 FAST)
    const hierarchy = await SubAdmin.aggregate([
      { $match: { _id: admin._id } },
      {
        $graphLookup: {
          from: 'subadmins',
          startWith: '$code',
          connectFromField: 'code',
          connectToField: 'invite',
          as: 'downlines',
          depthField: 'level',
        },
      },
      {
        $project: {
          userIds: {
            $concatArrays: [
              [{ $toString: '$_id' }],
              {
                $map: {
                  input: '$downlines',
                  as: 'd',
                  in: { $toString: '$$d._id' },
                },
              },
            ],
          },
        },
      },
    ]);

    const userIds = hierarchy[0]?.userIds || [admin._id.toString()];

    //  Build filter
    const filter = { userId: { $in: userIds } };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);

      filter.createdAt = { $gte: start, $lte: end };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    //  Fetch data + count in parallel (⚡)
    const [betData, totalCount] = await Promise.all([
      CasinoBetHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      CasinoBetHistory.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      totalUsers: userIds.length,
      totalBets: betData.length,
      data: betData,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    console.error('Casino bet history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const getAllCasinoProfitLoss = async (req, res) => {
  try {
    const { userId } = req.params; // User ID from URL params
    const { startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // 1️⃣ Find the target user
    const targetUser = await SubAdmin.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 2️⃣ Get only DIRECT downline users (just below, not recursive)
    let downlineResult = [];

    if (targetUser.role === 'user') {
      // If user is a regular user, include only themselves
      downlineResult = [targetUser];
    } else {
      // Get direct downlines only
      downlineResult = await SubAdmin.find({
        invite: targetUser.code,
        status: { $ne: 'delete' },
      });
    }

    if (downlineResult.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        total: {
          stake: 0,
          casinoPL: 0,
          internationalCasinoPL: 0,
          uplinePL: 0,
        },
      });
    }

    // 3️ For each direct downline, get ALL their descendants and aggregate casino P/L
    const userPLReport = [];

    for (const downline of downlineResult) {
      // Get all descendants of this downline (recursive)
      const descendantsAggregation = await SubAdmin.aggregate([
        { $match: { _id: downline._id } },
        {
          $graphLookup: {
            from: 'subadmins',
            startWith: '$code',
            connectFromField: 'code',
            connectToField: 'invite',
            as: 'descendants',
          },
        },
      ]);

      // Extract all descendant IDs including the downline itself
      const descendantIds =
        descendantsAggregation[0]?.descendants.map((u) => u._id.toString()) ||
        [];
      if (!descendantIds.includes(downline._id.toString())) {
        descendantIds.push(downline._id.toString());
      }

      // Build date filter
      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        };
      }

      // Aggregate casino P/L for this downline + all their descendants
      const casinoPLData = await CasinoBetHistory.aggregate([
        {
          $match: {
            userId: { $in: descendantIds },
            ...dateFilter,
          },
        },
        {
          $group: {
            _id: null,
            totalStake: { $sum: '$bet_amount' },
            totalChange: { $sum: '$change' },
          },
        },
      ]);

      const plData = casinoPLData[0] || { totalStake: 0, totalChange: 0 };
      const casinoPL = plData.totalChange || 0;
      userPLReport.push({
        userId: downline._id.toString(),
        userName: downline.userName || '',
        role: downline.role || '',
        stake: plData.totalStake || 0,
        casinoPL: plData.totalChange || 0,
        internationalCasinoPL: 0,
        uplinePL: -casinoPL || 0,
      });
    }

    // 4️⃣ Calculate totals
    const totals = {
      stake: 0,
      casinoPL: 0,
      internationalCasinoPL: 0,
      uplinePL: 0,
    };

    userPLReport.forEach((item) => {
      totals.stake += item.stake;
      totals.casinoPL += item.casinoPL;
      totals.internationalCasinoPL += item.internationalCasinoPL;
      totals.uplinePL += item.uplinePL;
    });

    // 5️ Sort by userName
    userPLReport.sort((a, b) =>
      (a.userName || '').localeCompare(b.userName || '')
    );

    // 6️ Return response
    res.status(200).json({
      success: true,
      data: userPLReport,
      total: totals,
    });
  } catch (error) {
    console.error('Error fetching casino profit/loss:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Get Casino Profit/Loss Report Grouped by Date
export const getCasinoProfitLossByDate = async (req, res) => {
  try {
    const { userId } = req.params; // User ID from URL params
    const { startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    // 1️ Find the target user
    const targetUser = await SubAdmin.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 2️ Get ALL downlines (direct + recursive) for the target user
    let allDownlineIds = [];

    if (targetUser.role === 'user') {
      // If user is a regular user, include only themselves
      allDownlineIds = [targetUser._id.toString()];
    } else {
      // Get direct downlines
      let downlineResult = await SubAdmin.find({
        invite: targetUser.code,
        status: { $ne: 'delete' },
      });

      // For each direct downline, get ALL their descendants (recursive)
      for (const downline of downlineResult) {
        const descendantsAggregation = await SubAdmin.aggregate([
          { $match: { _id: downline._id } },
          {
            $graphLookup: {
              from: 'subadmins',
              startWith: '$code',
              connectFromField: 'code',
              connectToField: 'invite',
              as: 'descendants',
            },
          },
        ]);

        // Extract all descendant IDs including the downline itself
        const descendantIds =
          descendantsAggregation[0]?.descendants.map((u) => u._id.toString()) ||
          [];
        if (!descendantIds.includes(downline._id.toString())) {
          descendantIds.push(downline._id.toString());
        }

        allDownlineIds = [...allDownlineIds, ...descendantIds];
      }
    }

    if (allDownlineIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        total: {
          stake: 0,
          downlinePL: 0,
          playerPL: 0,
          commission: 0,
          uplinePL: 0,
        },
      });
    }

    // 3️ Build date filter (using local timezone, not UTC)
    const startParts = startDate.split('-');
    const endParts = endDate.split('-');

    const start = new Date(
      parseInt(startParts[0]),
      parseInt(startParts[1]) - 1,
      parseInt(startParts[2]),
      0,
      0,
      0,
      0
    );
    const end = new Date(
      parseInt(endParts[0]),
      parseInt(endParts[1]) - 1,
      parseInt(endParts[2]),
      23,
      59,
      59,
      999
    );

    // 4 Aggregate casino P/L grouped by date
    const datePLData = await CasinoBetHistory.aggregate([
      {
        $match: {
          userId: { $in: allDownlineIds },
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'Asia/Kolkata', // Use IST timezone or adjust to your server timezone
            },
          },
          bet_amount: 1,
          change: 1,
        },
      },
      {
        $group: {
          _id: '$date',
          stake: { $sum: '$bet_amount' },
          casinoPL: { $sum: '$change' },
        },
      },
      {
        $sort: { _id: 1 }, // Sort by date ascending
      },
    ]);

    // 5 Generate all dates in the range and fill missing dates with zeros
    const allDatesMap = new Map();

    // Initialize map with all dates in range (set to zero)
    const currentDate = new Date(start);
    while (currentDate <= end) {
      // Format date as YYYY-MM-DD without timezone conversion
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      allDatesMap.set(dateStr, {
        uid: dateStr,
        stake: 0,
        downlinePL: 0,
        playerPL: 0,
        commission: 0,
        uplinePL: 0,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fill in actual data from aggregation
    datePLData.forEach((item) => {
      const casinoPL = item.casinoPL || 0;
      allDatesMap.set(item._id, {
        uid: item._id,
        stake: item.stake || 0,
        downlinePL: casinoPL,
        playerPL: casinoPL,
        commission: 0,
        uplinePL: -casinoPL,
      });
    });

    // Convert map to array and sort by date
    const formattedData = Array.from(allDatesMap.values()).sort((a, b) =>
      a.uid.localeCompare(b.uid)
    );

    // 6 Calculate totals
    const totals = {
      stake: 0,
      downlinePL: 0,
      playerPL: 0,
      commission: 0,
      uplinePL: 0,
    };

    formattedData.forEach((item) => {
      totals.stake += item.stake;
      totals.downlinePL += item.downlinePL;
      totals.playerPL += item.playerPL;
      totals.commission += item.commission;
      totals.uplinePL += item.uplinePL;
    });

    // 7️⃣ Return response
    res.status(200).json({
      success: true,
      data: formattedData,
      total: totals,
    });
  } catch (error) {
    console.error('Error fetching casino profit/loss by date:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
