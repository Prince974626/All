import axios from 'axios';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import createToken from '../../config/tokenCreate.js';
import betHistoryModel from '../../models/betHistoryModel.js';
import betModel from '../../models/betModel.js';
import creditRefHistory from '../../models/creditRefHistory.js';
import DepositHistory from '../../models/depositeHistoryModel.js';
import LoginHistory from '../../models/loginHistory.js';
import passwordHistory from '../../models/passwordHistory.js';
import SubAdmin from '../../models/subAdminModel.js';
import TransactionHistory from '../../models/transtionHistoryModel.js';
import WithdrawalHistory from '../../models/withdrawalHistoryModel.js';
import {
  calculateAllExposure,
  isFancyBet,
  calculateFancyExposure,
} from '../../utils/exposureUtils.js';
import {
  calculateOutcomeScenarios,
  groupBetsByMarket,
} from '../../utils/marketCalculationUtils.js';
import { getAllDownlineMemberIds } from '../../utils/accountStatementUtils.js';
import {
  buildMarketLockEntry,
  isUserLockedForMarket,
  stripMatchingMarketLocks,
} from '../../utils/marketLockUtils.js';
import {
  getAccountMyKeepPercent,
  getViewerShareOfUserClientPL,
  roundMoney,
  toStoredDownlineKeepFromCreateInput,
} from '../../utils/partnershipCommissionUtils.js';

const clientProfitLossOf = (account, displayBalance = null) => {
  const bal =
    displayBalance !== null && displayBalance !== undefined
      ? Number(displayBalance) || 0
      : Number(account?.balance ?? account?.baseBalance) || 0;
  const cr = Number(account?.creditReference) || 0;
  // Client(P/L) = Balance − CR (e.g. CR 500, balance 0 → −500 until funded)
  return roundMoney(bal - cr);
};

/**
 * Cowexch Account List header stats with partnership split.
 * - Available Balance = subadmin.avbalance (wallet available)
 * - Available With P/L = Available + My P/L
 * - For agent/master downlines, Occupy uses their Total Master Balance
 *   (same as Balance column on parent's Account List)
 * - Total Master Balance = Available With P/L + Down level Occupy
 * - Down Level P/L = sum of direct downline Client(P/L) (displayBalance − CR)
 * - My P/L = viewer share of leaf-user betting P/L (partnership keep chain)
 * - Upper Level = portion of house P/L that goes above viewer (100 − keep)%
 */
/** Exported for Account Statement Closing (agents use Available With P/L). */
export const computeAccountListHeaderStats = async (admin, cache = null) => {
  const adminObj = admin?.toObject ? admin.toObject() : admin;
  const cacheKey = String(adminObj._id || adminObj.code || '');
  if (cache && cacheKey && cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const ownCR = Number(adminObj.creditReference) || 0;
  const ownAvBalance = Number(adminObj.avbalance) || 0;
  const keepPct = getAccountMyKeepPercent(adminObj);

  const directDownlines = await SubAdmin.find({
    invite: adminObj.code,
    status: { $ne: 'delete' },
  }).lean();

  const downLevelCreditReference = roundMoney(
    directDownlines.reduce((s, d) => s + (Number(d.creditReference) || 0), 0)
  );

  // Users: occupy = balance. Agents/masters: occupy = their Total Master Balance
  let downLevelOccupyBalance = 0;
  let downLevelProfitLoss = 0;
  for (const d of directDownlines) {
    const cr = Number(d.creditReference) || 0;
    if (d.role === 'user') {
      const bal = Number(d.balance ?? d.baseBalance) || 0;
      downLevelOccupyBalance = roundMoney(downLevelOccupyBalance + bal);
      downLevelProfitLoss = roundMoney(
        downLevelProfitLoss + clientProfitLossOf(d, bal)
      );
    } else {
      const childStats = await computeAccountListHeaderStats(d, cache);
      const displayBalance = Number(childStats.totalMasterBalance) || 0;
      downLevelOccupyBalance = roundMoney(
        downLevelOccupyBalance + displayBalance
      );
      downLevelProfitLoss = roundMoney(
        downLevelProfitLoss + clientProfitLossOf(d, displayBalance)
      );
    }
  }

  const downlineIds = await getAllDownlineMemberIds(
    SubAdmin,
    String(adminObj._id)
  );
  const treeMembers = await SubAdmin.find({
    _id: { $in: [...downlineIds, adminObj._id] },
    status: { $ne: 'delete' },
  }).lean();

  // Include upline chain for partnership lookups
  const byCode = new Map(treeMembers.map((m) => [m.code, m]));
  let walk = adminObj;
  for (let i = 0; i < 20 && walk?.invite; i++) {
    if (byCode.has(walk.invite)) {
      walk = byCode.get(walk.invite);
      continue;
    }
    const parent = await SubAdmin.findOne({ code: walk.invite }).lean();
    if (!parent) break;
    byCode.set(parent.code, parent);
    walk = parent;
  }
  byCode.set(adminObj.code, { ...adminObj, ...byCode.get(adminObj.code) });

  const leafUsers = treeMembers.filter((m) => m.role === 'user');
  let leafClientBettingPL = 0;
  let myProfitLoss = 0;
  for (const user of leafUsers) {
    const clientPL = Number(user.bettingProfitLoss) || 0;
    leafClientBettingPL = roundMoney(leafClientBettingPL + clientPL);
    myProfitLoss = roundMoney(
      myProfitLoss +
        getViewerShareOfUserClientPL(
          adminObj.code,
          user,
          byCode,
          clientPL,
          'sports'
        )
    );
  }

  const housePL = roundMoney(-leafClientBettingPL);
  const upperLevel = roundMoney((housePL * (100 - keepPct)) / 100);
  // Use document avbalance (not CR − down CR)
  const availableBalance = roundMoney(ownAvBalance);
  const availableBalanceWithProfitLoss = roundMoney(
    availableBalance + myProfitLoss
  );
  // Cowexch: Total Master Balance = Available With P/L + Down level Occupy
  const totalMasterBalance = roundMoney(
    availableBalanceWithProfitLoss + downLevelOccupyBalance
  );

  const result = {
    upperLevelCreditReference: ownCR,
    totalMasterBalance,
    availableBalance,
    downLevelOccupyBalance,
    upperLevel,
    availableBalanceWithProfitLoss,
    downLevelCreditReference,
    downLevelProfitLoss,
    myProfitLoss,
    partnershipKeepPercent: keepPct,
  };
  if (cache && cacheKey) cache.set(cacheKey, result);
  return result;
};

const countUplines = async (user) => {
  let count = 0;
  let currentUser = user;

  while (currentUser && currentUser.invite) {
    const upline = await SubAdmin.findOne({ code: currentUser.invite });
    if (!upline) break;

    count++;
    currentUser = upline;
  }

  return count;
};

const generateSixDigitMasterPassword = () =>
  crypto.randomInt(100000, 1000000).toString();

const verifyMasterPassword = async (user, enteredPassword) => {
  if (!user || !enteredPassword) return false;

  const loginPasswordMatches = await bcrypt.compare(
    enteredPassword,
    user.password
  );
  const isSuperAdmin = user.role === 'supperadmin';

  if (user.masterPassword) {
    try {
      const transactionPasswordMatches = await bcrypt.compare(
        enteredPassword,
        user.masterPassword
      );
      return isSuperAdmin
        ? transactionPasswordMatches || loginPasswordMatches
        : transactionPasswordMatches;
    } catch (error) {
      const legacyMasterMatches = user.masterPassword === enteredPassword;
      return isSuperAdmin
        ? legacyMasterMatches || loginPasswordMatches
        : legacyMasterMatches;
    }
  }

  return isSuperAdmin ? loginPasswordMatches : false;
};

const updateAdmin = async (id) => {
  try {
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Include ALL downlines (including deleted) for financial calculations.
    // Deleted users should still count in hierarchy calculations to prevent
    // sub-admins from hiding losses by deleting users.
    const directDownlines = await SubAdmin.find({
      invite: admin.code,
    });

    //  CLEAN SEPARATION: Calculate each type separately
    let DownlineTotalExposure = 0;
    let DownlineTotalBettingProfitLoss = 0;
    const DownlineTotalBaseBalance = directDownlines.reduce(
      (sum, user) => sum + (user.baseBalance || 0),
      0
    );

    // Calculate correct exposure and bettingProfitLoss for each downline
    for (const user of directDownlines) {
      try {
        // FIX: If downline is NOT a 'user' role (i.e., it's an agent/admin),
        // use their stored totalExposure which was already calculated recursively.
        // Only calculate from bets for actual end-users who place bets.
        if (user.role !== 'user') {
          DownlineTotalExposure += user.totalExposure || user.exposure || 0;
          DownlineTotalBettingProfitLoss += user.bettingProfitLoss || 0;
          console.log(
            `[UPDATE ADMIN] Agent/Admin ${user.userName}: using stored totalExposure=${user.totalExposure || user.exposure || 0}`
          );
          continue;
        }

        // For actual users, recalculate bettingProfitLoss from betHistoryModel
        // (single source of truth - stores each individual bet with original values)
        const plResult = await betHistoryModel.aggregate([
          {
            $match: {
              userId: user._id.toString(),
              status: { $in: [1, 2] },
            },
          },
          {
            $group: {
              _id: null,
              totalPL: { $sum: '$profitLossChange' },
            },
          },
        ]);
        const userBettingPL = plResult.length > 0 ? plResult[0].totalPL : 0;

        // Update user's stored bettingProfitLoss if it drifted from betHistoryModel
        if (user.bettingProfitLoss !== userBettingPL) {
          console.log(
            `[UPDATE ADMIN] User ${user.userName}: correcting bettingProfitLoss from ${user.bettingProfitLoss} to ${userBettingPL}`
          );
          user.bettingProfitLoss = userBettingPL;
          await user.save();
        }
        DownlineTotalBettingProfitLoss += userBettingPL;

        // For actual users, get all pending bets
        const updatedPendingBets = await betModel.find({
          userId: user._id,
          status: 0,
        });

        // Market-based exposure calculation (handles fancy + non-fancy + offsetting)
        const userExposure = calculateAllExposure(updatedPendingBets);
        DownlineTotalExposure += userExposure;
        console.log(
          `[UPDATE ADMIN] User ${user.userName}: exposure=${userExposure} bettingPL=${userBettingPL}`
        );
      } catch (error) {
        console.error(
          `[UPDATE ADMIN] Error calculating exposure for user ${user.userName}:`,
          error.message
        );
        // Fallback to user's stored values
        DownlineTotalExposure += user.exposure || 0;
        DownlineTotalBettingProfitLoss += user.bettingProfitLoss || 0;
      }
    }

    // CLEAN SEPARATION: Update admin with separate fields
    admin.bettingProfitLoss = DownlineTotalBettingProfitLoss; // Sum of downlines' betting P/L
    admin.uplineBettingProfitLoss = DownlineTotalBettingProfitLoss; // Same for upline calculation

    // Calculate totalBalance using clean separation
    admin.totalBalance =
      DownlineTotalBaseBalance + admin.uplineBettingProfitLoss;
    admin.exposure = DownlineTotalExposure;
    admin.totalExposure = DownlineTotalExposure;
    admin.agentAvbalance = admin.totalBalance - admin.totalExposure; // Available Balance in dashboard
    admin.totalAvbalance = admin.totalBalance + admin.avbalance; // Total Balance in dashboard

    await admin.save();

    return {
      success: true,
      message: 'Admin updated with downline data',
      admin,
    };
  } catch (error) {
    console.error('updateAdmin error:', error);
    return { success: false, message: error.message };
  }
};

export const updateAllUplines = async (userIdOrArray) => {
  try {
    const userIds = Array.isArray(userIdOrArray)
      ? userIdOrArray
      : [userIdOrArray];

    for (const userId of userIds) {
      let currentUser = await SubAdmin.findById(userId);
      if (!currentUser) {
        console.log(` [UPDATE UPLINES] User not found: ${userId}`);
        continue;
      }

      console.log(
        ` [UPDATE UPLINES] Starting from user: ${currentUser.userName} (${currentUser.code})`
      );

      while (currentUser && currentUser.invite) {
        const uplineAdmin = await SubAdmin.findOne({
          code: currentUser.invite,
        });
        if (uplineAdmin) {
          console.log(
            ` [UPDATE UPLINES] Updating upline: ${uplineAdmin.userName} (${uplineAdmin.code})`
          );
          await updateAdmin(uplineAdmin._id);
          currentUser = uplineAdmin;
        } else {
          console.log(
            ` [UPDATE UPLINES] No higher upline found for ${currentUser.userName}`
          );
          break;
        }
      }
    }

    console.log(` [UPDATE UPLINES] Completed all upline updates\n`);
  } catch (error) {
    console.error(` [UPDATE UPLINES] Error:`, error);
  }
};

export const getAllUsersWithCompleteInfo = async (req, res) => {
  try {
    const { id, role } = req;
    const { page = 1, limit = 10, searchQuery } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    let filter =
      role === 'supperadmin'
        ? { _id: { $ne: id }, status: { $ne: 'delete' } }
        : { invite: admin.code, status: { $ne: 'delete' } };

    if (searchQuery) {
      filter = {
        ...filter,
        userName: { $regex: searchQuery, $options: 'i' },
      };
    }

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    // Add both upline totalBalance and direct user info
    const usersWithCompleteInfo = await Promise.all(
      allUsers.map(async (user) => {
        // Get upline's totalBalance
        const upline = await SubAdmin.findOne({ code: user.invite });

        // Count uplines to determine if direct user
        const uplineCount = await countUplines(user);

        return {
          ...user.toObject(),
          uplineTotalBalance: upline ? upline.totalBalance : 0,
          uplineCount: uplineCount,
          isDirectUser: uplineCount === 1,
        };
      })
    );

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      message: 'Users with complete info retrieved successfully',
      data: usersWithCompleteInfo,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching users with complete info:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};

// export const createSubAdmin = async (req, res) => {
//   try {
//     const { id, role } = req;

//     const {
//       name,
//       userName,
//       accountType,
//       commition,
//       balance,
//       exposureLimit,
//       creditReference,
//       rollingCommission,
//       phone,
//       password,
//       masterPassword,
//       partnership,
//     } = req.body;

//     // Generate a Unique Code for Referral
//     const uniqueCode = crypto.randomBytes(4).toString('hex').toUpperCase();

//     // Find the admin who is creating the sub-admin
//     const admin = await SubAdmin.findById(id);
//     if (!admin) {
//       return res.status(400).json({ message: 'Admin not found' });
//     }

//     if (admin.secret === 0) {
//       return res.status(403).json({
//         message: 'Admin account is not authorized to create users',
//       });
//     }

//     // Role-based validation
//     const roleHierarchy = {
//       supperadmin: ['admin', 'white', 'super', 'master', 'agent', 'user'],
//       admin: ['white', 'super', 'master', 'agent', 'user'],
//       white: ['super', 'master', 'agent', 'user'],
//       super: ['master', 'agent', 'user'],
//       master: ['agent', 'user'],
//       agent: ['user'],
//     };

//     // Compare password
//     const isMatch = await verifyMasterPassword(admin, masterPassword);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid Master password.' });
//     }

//     if (!roleHierarchy[role] || !roleHierarchy[role].includes(accountType)) {
//       return res.status(403).json({
//         message: `${role} can only create ${roleHierarchy[role].join(', ')} accounts.`,
//       });
//     }

//     // Balance validation
//     if (['admin', 'white', 'super', 'master', 'agent'].includes(role)) {
//       if (isNaN(balance) || balance === undefined || balance < 0) {
//         return res.status(400).json({ message: 'Invalid balance amount' });
//       }

//       if (balance > admin.balance || admin.balance < 1) {
//         return res.status(400).json({ message: 'Insufficient balance' });
//       }
//     }

//     // Password Regex: must contain letters AND numbers, NO special characters
//     const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{8,}$/;
//     if (!passwordRegex.test(password)) {
//       return res.status(400).json({
//         message:
//           'Password must be at least 8 characters with both letters and numbers. Special characters are not allowed.',
//       });
//     }

//     // Check if userName already exists
//     const existingSubAdmin = await SubAdmin.findOne({
//       userName: userName.toLowerCase(),
//     });
//     if (existingSubAdmin) {
//       return res.status(400).json({ message: `${userName} already exists` });
//     }

//     const creditReferenceProfitLoss = balance - creditReference;

//     // Partnership validation (required for non-user accounts, 1-100)
//     let parsedPartnership = 0;
//     if (accountType !== 'user') {
//       parsedPartnership = Number(partnership);
//       if (
//         !partnership ||
//         isNaN(parsedPartnership) ||
//         parsedPartnership <= 0 ||
//         parsedPartnership > 100
//       ) {
//         return res.status(400).json({
//           message: 'Partnership is required and must be between 1 and 100.',
//         });
//       }
//     }
//     if (admin.avbalance - balance < 0) {
//       return res.status(400).json({ message: 'Insufficient balance' });
//     }

//     const subAdmin = new SubAdmin({
//       name,
//       userName: userName.toLowerCase(),
//       account: accountType,
//       commition,
//       balance,
//       baseBalance: balance, // Set baseBalance to initial balance given
//       exposureLimit,
//       creditReference,
//       profitLoss: 0,
//       bettingProfitLoss: 0,
//       creditReferenceProfitLoss: creditReferenceProfitLoss,
//       avbalance: balance,
//       totalAvbalance: balance,
//       rollingCommission,
//       code: uniqueCode,
//       invite: admin.code,
//       phone,
//       password,
//       role: accountType,
//       masterPassword,
//       partnership: parsedPartnership,
//       totalBalance: 0,
//     });
//     await subAdmin.save();

//     await TransactionHistory.create({
//       userId: subAdmin._id,
//       userName: subAdmin.userName,
//       withdrawl: 0,
//       deposite: balance,
//       amount: balance,
//       remark: 'Opening Balance',
//       from: admin.userName,
//       to: subAdmin.userName,
//       invite: admin.code,
//     });

//     // Downline calculations (exclude deleted users)
//     const downlineUser = await SubAdmin.find({
//       invite: admin.code,
//       status: { $ne: 'delete' },
//     });
//     const DownlineTotalExposure = downlineUser.reduce(
//       (sum, user) => sum + (user.exposure || 0),
//       0
//     );
//     const DownlineTotalBettingProfitLoss = downlineUser.reduce(
//       (sum, user) => sum + (user.bettingProfitLoss || 0),
//       0
//     );
//     const DownlineTotalBaseBalance = downlineUser.reduce(
//       (sum, user) => sum + (user.baseBalance || 0),
//       0
//     );

//     //  CLEAN SEPARATION: Update admin with separate fields (same as updateAdmin)
//     admin.avbalance -= balance;
//     admin.bettingProfitLoss = DownlineTotalBettingProfitLoss; // Sum of downlines' betting P/L
//     admin.uplineBettingProfitLoss = DownlineTotalBettingProfitLoss; // Same for upline calculation

//     // Calculate totalBalance using clean separation
//     admin.totalBalance =
//       DownlineTotalBaseBalance + admin.uplineBettingProfitLoss;
//     admin.totalAvbalance = admin.avbalance + admin.totalBalance;
//     admin.exposure = DownlineTotalExposure;
//     admin.totalExposure = DownlineTotalExposure;
//     admin.agentAvbalance = admin.totalBalance - admin.totalExposure;

//     await admin.save();
//     console.log('The admin is updated', admin);

//     // Generate token
//     const token = await createToken({
//       id: subAdmin._id,
//       role: subAdmin.role,
//       user: subAdmin,
//     });

//     return res.status(201).json({
//       success: true,
//       message: `${accountType} created successfully`,
//       token,
//       user: subAdmin,
//     });
//   } catch (error) {
//     console.error('Create SubAdmin Error:', error);
//     return res
//       .status(500)
//       .json({ message: 'Server error', error: error.message });
//   }
// };

export const createSubAdmin = async (req, res) => {
  try {
    const { id, role } = req;

    const {
      name,
      userName,
      accountType,
      commition,
      balance,
      exposureLimit,
      creditReference,
      rollingCommission,
      phone,
      password,
      masterPassword,
      partnership,
    } = req.body;

    // Trim name and userName to remove leading/trailing spaces
    const trimmedName = name.trim();
    const trimmedUserName = userName.trim();

    // Generate a Unique Code for Referral
    const uniqueCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Find the admin who is creating the sub-admin
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(400).json({ message: 'Admin not found' });
    }

    if (admin.secret === 0) {
      return res.status(403).json({
        message: 'Admin account is not authorized to create users',
      });
    }

    // Role-based validation
    const roleHierarchy = {
      supperadmin: ['admin', 'white', 'super', 'master', 'agent', 'user'],
      admin: ['white', 'super', 'master', 'agent', 'user'],
      white: ['super', 'master', 'agent', 'user'],
      super: ['master', 'agent', 'user'],
      master: ['agent', 'user'],
      agent: ['user'],
    };

    const isMatch = await verifyMasterPassword(admin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Master password.' });
    }

    if (!roleHierarchy[role] || !roleHierarchy[role].includes(accountType)) {
      return res.status(403).json({
        message: `${role} can only create ${roleHierarchy[role].join(', ')} accounts.`,
      });
    }

    // Balance validation
    if (['admin', 'white', 'super', 'master', 'agent'].includes(role)) {
      if (isNaN(balance) || balance === undefined || balance < 0) {
        return res.status(400).json({ message: 'Invalid balance amount' });
      }

      if (balance > admin.balance || admin.balance < 1) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, one number, and one special character.',
      });
    }

    // Check if userName already exists
    const existingSubAdmin = await SubAdmin.findOne({
      userName: trimmedUserName.toLowerCase(),
    });
    if (existingSubAdmin) {
      return res
        .status(400)
        .json({ message: `${trimmedUserName} already exists` });
    }

    const creditReferenceProfitLoss = balance - creditReference;

    // Partnership validation (downline keep % ≤ parent keep)
    if (
      partnership > 100 ||
      partnership < 0 ||
      isNaN(partnership) ||
      partnership === undefined
    ) {
      return res
        .status(400)
        .json({ message: 'Partnership should be between 0 and 100' });
    }

    const parentKeep = getAccountMyKeepPercent(admin);
    const storedPartnership =
      accountType === 'user'
        ? 0
        : toStoredDownlineKeepFromCreateInput(partnership, admin);

    if (
      accountType !== 'user' &&
      Number(partnership) > parentKeep &&
      parentKeep < 100
    ) {
      return res.status(400).json({
        message: `Partnership cannot exceed your keep (${parentKeep}%). Remaining for upline must stay available.`,
      });
    }
    // Skip balance check for superadmin
    if (role !== 'superadmin' && role !== 'supperadmin') {
      if (admin.avbalance - balance < 0) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
    }

    const subAdmin = new SubAdmin({
      name: trimmedName,
      userName: trimmedUserName.toLowerCase(),
      account: accountType,
      commition,
      balance,
      baseBalance: balance, // Set baseBalance to initial balance given
      exposureLimit,
      creditReference,
      profitLoss: 0,
      bettingProfitLoss: 0,
      creditReferenceProfitLoss: creditReferenceProfitLoss,
      avbalance: balance,
      totalAvbalance: balance,
      rollingCommission,
      code: uniqueCode,
      invite: admin.code,
      phone,
      password,
      role: accountType,
      partnership: storedPartnership,
      totalBalance: 0,
    });
    await subAdmin.save();

    await TransactionHistory.create({
      userId: subAdmin._id,
      userName: subAdmin.userName,
      withdrawl: 0,
      deposite: balance,
      amount: balance,
      remark: 'Opening Balance',
      from: admin.userName,
      to: subAdmin.userName,
      invite: admin.code,
    });

    // Downline calculations (exclude deleted users)
    const downlineUser = await SubAdmin.find({
      invite: admin.code,
      status: { $ne: 'delete' },
    });
    const DownlineTotalExposure = downlineUser.reduce(
      (sum, user) => sum + (user.exposure || 0),
      0
    );
    const DownlineTotalBettingProfitLoss = downlineUser.reduce(
      (sum, user) => sum + (user.bettingProfitLoss || 0),
      0
    );
    const DownlineTotalBaseBalance = downlineUser.reduce(
      (sum, user) => sum + (user.baseBalance || 0),
      0
    );

    //  CLEAN SEPARATION: Update admin with separate fields (same as updateAdmin)
    // Skip balance subtraction for superadmin
    if (role !== 'superadmin' && role !== 'supperadmin') {
      admin.avbalance -= balance;
    }
    admin.bettingProfitLoss = DownlineTotalBettingProfitLoss; // Sum of downlines' betting P/L
    admin.uplineBettingProfitLoss = DownlineTotalBettingProfitLoss; // Same for upline calculation

    // Calculate totalBalance using clean separation
    admin.totalBalance =
      DownlineTotalBaseBalance + admin.uplineBettingProfitLoss;
    admin.totalAvbalance = admin.avbalance + admin.totalBalance;
    admin.exposure = DownlineTotalExposure;
    admin.totalExposure = DownlineTotalExposure;
    admin.agentAvbalance = admin.totalBalance - admin.totalExposure;

    await admin.save();
    console.log('The admin is updated', admin);

    // Generate token
    const token = await createToken({
      id: subAdmin._id,
      role: subAdmin.role,
      user: subAdmin,
    });

    return res.status(201).json({
      success: true,
      message: `${accountType} created successfully`,
      token,
      user: subAdmin,
    });
  } catch (error) {
    console.error('Create SubAdmin Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};
export const deleteSubAdmin = async (req, res) => {
  const { id, role } = req;
  const { page = 1, limit = 10 } = req.query;
  try {
    const { userId } = req.params; // Sub-admin ID to delete

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const subAdmin = await SubAdmin.findById(userId);
    if (!subAdmin) {
      return res.status(404).json({ message: 'user not found' });
    }

    //  Find the user being updated
    let editUser = await SubAdmin.findById(userId);
    if (editUser.avbalance > 0) {
      return res
        .status(400)
        .json({ message: 'User has pending withdrawl balance' });
    }
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    editUser.status = 'delete';

    await editUser.save();

    const filter =
      role === 'supperadmin'
        ? { _id: { $ne: id }, role: { $ne: 'user' }, status: { $ne: 'delete' } }
        : {
            invite: editUser.code,
            role: { $ne: 'user' },
            status: { $ne: 'delete' },
          };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Sub-admin deleted successfully',
      data: allUsers,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Delete SubAdmin Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

const saveLoginHistory = async (userName, id, status, req) => {
  try {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.connection?.socket?.remoteAddress ||
      'IP not found';

    //  Get geo details
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    const { city, region, country_name: country, org: isp } = response.data;

    const now = new Date();
    const formattedDateTime = now
      .toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      .replace(',', '');

    await LoginHistory.create({
      userName,
      userId: id,
      status: status === 'Success' ? 'Login Successful' : 'Login Failed',
      dateTime: formattedDateTime,
      ip,
      isp,
      city,
      region,
      country,
    });
  } catch (error) {
    console.error(' Login history error:', error.message);
  }
};

export const loginSubAdmin = async (req, res) => {
  try {
    const { userName, password } = req.body;

    //  Check if userName and password are provided
    if (!userName || !password) {
      await saveLoginHistory(
        'null',
        'null',
        'Please provide both username and password',
        req
      );
      return res
        .status(400)
        .json({ message: 'Please provide both username and password.' });
    }

    //  Find sub-admin by userName (case-insensitive)
    const subAdmin = await SubAdmin.findOne({
      userName: userName.toLowerCase(),
    });

    if (!subAdmin) {
      await saveLoginHistory(userName, userName, 'UserName Wrong', req);
      return res.status(400).json({ message: 'Sub-admin not found.' });
    }

    //  Compare password
    const isMatch = await bcrypt.compare(password, subAdmin.password);

    if (!isMatch) {
      await saveLoginHistory(userName, subAdmin._id, 'Password Wrong', req);
      return res.status(400).json({ message: 'Password Wrong !' });
    }

    if (subAdmin.status !== 'active') {
      await saveLoginHistory(userName, subAdmin._id, 'Account Inactive', req);
      return res
        .status(400)
        .json({ message: `Your Account has been ${subAdmin.status} !` });
    }

    // Generate unique session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const deviceId = req.headers['user-agent'] || 'unknown-device';
    const ipAddress =
      req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    //  Update user session information
    subAdmin.sessionToken = sessionToken;
    subAdmin.lastLogin = new Date();
    subAdmin.lastDevice = deviceId;
    subAdmin.lastIP = ipAddress;
    await subAdmin.save();

    //  Generate JWT Token with session token
    const token = jwt.sign(
      {
        id: subAdmin._id,
        role: subAdmin.role,
        sessionToken: sessionToken,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    await saveLoginHistory(userName, subAdmin._id, 'Success', req);

    //  Set token in HTTP-only cookie
    res.cookie('auth', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    //  Return success response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: subAdmin,
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: error.message, error: error.message });
  }
};

export const changePasswordBySubAdmin = async (req, res) => {
  const { id } = req; // Sub-admin ID (admin making the change)
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    const subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: 'New Password and Password Confirmation should be same',
      });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, one number, and one special character.',
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, subAdmin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old Password Has Not Matched!' });
    }
    subAdmin.password = newPassword;
    let generatedMasterPassword = null;

    if (!subAdmin.isPasswordChanged) {
      subAdmin.isPasswordChanged = true;
      generatedMasterPassword = generateSixDigitMasterPassword();
      subAdmin.masterPassword = await bcrypt.hash(generatedMasterPassword, 10);
    }

    await subAdmin.save();

    await passwordHistory.create({
      userName: subAdmin.userName,
      remark: 'Password Changed By SubAdmin.',
      userId: id,
    });
    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      isPasswordChanged: subAdmin.isPasswordChanged,
      generatedMasterPassword,
      data: subAdmin,
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // Get user ID from authenticated request
    const userId = req.id;

    // Clear session token in database
    await SubAdmin.findByIdAndUpdate(userId, {
      $set: { sessionToken: null },
    });

    // Clear cookie
    res.clearCookie('auth', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });

    res.status(200).json({
      success: true,
      message: 'Logout success',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
};

export const forceLogoutUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify admin permissions
    if (req.role !== 'admin' && req.role !== 'supperadmin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Clear session token
    await SubAdmin.findByIdAndUpdate(userId, {
      $set: { sessionToken: null },
    });

    res.status(200).json({
      success: true,
      message: 'User logged out from all devices',
    });
  } catch (error) {
    console.error('Force logout error:', error);
    res.status(500).json({ message: 'Operation failed', error: error.message });
  }
};

export const getLoginHistory = async (req, res) => {
  try {
    const { userId } = req.params; // passed in route as /credit-ref-history/:userId
    // console.log("userId", userId);
    const data = await LoginHistory.find({ userId }).sort({ createdAt: -1 }); // optional: latest first
    // console.log("data", data);
    res.status(200).json({
      message: 'Login history fetched successfully',
      data,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching login history:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getSubAdmin = async (req, res) => {
  try {
    const { id } = req; // Get ID from request

    if (!id) {
      return res.status(400).json({ message: 'Admin ID is required' });
    }

    // Find sub-admin & exclude sensitive fields
    const admin = await SubAdmin.findById(id);

    if (!admin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }
    await updateAdmin(id);

    //  Fetch the updated admin data after updateAdmin
    const updatedAdmin = await SubAdmin.findById(id);
    const headerStats = await computeAccountListHeaderStats(updatedAdmin);

    res.status(200).json({
      message: 'Sub-admin details retrieved successfully',
      data: {
        ...(updatedAdmin.toObject ? updatedAdmin.toObject() : updatedAdmin),
        headerStats,
      },
    });
  } catch (error) {
    console.error('Error fetching sub-admin:', error);
    res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params; // passed in route as /credit-ref-history/:userId
    // console.log("userId", userId);
    const data = await SubAdmin.findById(userId); // optional: latest first
    // console.log("data", data);
    res.status(200).json({
      message: 'User Profile fetched successfully',
      data,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching User Profile:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getDeleteUser = async (req, res) => {
  try {
    const { id, role } = req;
    const { page = 1, limit = 10 } = req.query;

    // console.log("Admin ID:", id);
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const admin = await SubAdmin.findById(id);
    console.log('The Delete User Admin', admin);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const filter =
      role === 'supperadmin'
        ? {
            _id: { $ne: id },
            // role: { $ne: "user" },
            status: 'delete',
          }
        : {
            invite: admin.code,
            // role: { $ne: "user" },
            status: 'delete',
          };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      message: 'All sub-admin details retrieved successfully',
      data: allUsers,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};

export const restoreDeleteUser = async (req, res) => {
  try {
    const { id, role } = req;
    const { page = 1, limit = 10 } = req.query;
    const { userId, masterPassword } = req.params;

    // console.log("Admin ID:", id);
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    // ✅ Verify Master Password
    const isMatch = await verifyMasterPassword(admin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Master password.' });
    }

    let editUser = await SubAdmin.findById(userId);

    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    editUser.status = 'active';

    await editUser.save();

    const filter =
      role === 'supperadmin'
        ? {
            _id: { $ne: id },
            role: { $ne: 'user' },
            status: 'delete',
          }
        : {
            invite: admin.code,
            role: { $ne: 'user' },
            status: 'delete',
          };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'User restored successfully',
      data: allUsers,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};
/**
 * List enrichment: users use batched exposure; agents use the existing
 * Cowexch header-stats formula (cached per request).
 */
const enrichListRows = async (allUsers) => {
  const userIds = allUsers
    .filter((u) => u.role === 'user')
    .map((u) => String(u._id));

  const pendingBets =
    userIds.length > 0
      ? await betModel
          .find({ userId: { $in: userIds }, status: 0 })
          .select(
            'userId gameId gameType teamName fancyScore otype betAmount price isCashedOut cashoutValue status'
          )
          .lean()
      : [];

  const betsByUser = new Map();
  for (const bet of pendingBets) {
    const key = String(bet.userId);
    if (!betsByUser.has(key)) betsByUser.set(key, []);
    betsByUser.get(key).push(bet);
  }

  const statsCache = new Map();

  return Promise.all(
    allUsers.map(async (obj) => {
      const cr = Number(obj.creditReference) || 0;
      try {
        if (obj.role === 'user') {
          const bets = betsByUser.get(String(obj._id)) || [];
          const bal = Number(obj.balance ?? obj.baseBalance) || 0;
          return {
            ...obj,
            exposure: calculateAllExposure(bets),
            displayBalance: bal,
            displayClientPL: roundMoney(bal - cr),
            displayAvailable: Number(obj.avbalance) || 0,
          };
        }

        // Same production formula as before: Total Master Balance / Available With P/L
        const stats = await computeAccountListHeaderStats(obj, statsCache);
        const displayBalance = Number(stats.totalMasterBalance) || 0;
        return {
          ...obj,
          exposure: Number(obj.exposure) || 0,
          displayBalance,
          displayClientPL: roundMoney(displayBalance - cr),
          displayAvailable: Number(stats.availableBalanceWithProfitLoss) || 0,
          headerStats: stats,
        };
      } catch (error) {
        console.error(
          `[LIST] Error enriching ${obj.userName}:`,
          error.message
        );
        const bal = Number(obj.balance ?? obj.baseBalance) || 0;
        return {
          ...obj,
          displayBalance: bal,
          displayClientPL: roundMoney(bal - cr),
          displayAvailable: Number(obj.avbalance) || 0,
        };
      }
    })
  );
};

export const getAllUser = async (req, res) => {
  try {
    const { id, role } = req;
    const { page = 1, limit = 10, searchQuery } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 10));

    const admin = await SubAdmin.findById(id).select('code').lean();
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    let filter =
      role === 'supperadmin'
        ? {
            _id: { $ne: id },
            role: { $ne: 'user' },
            status: { $ne: 'delete' },
            invite: admin.code,
          }
        : {
            invite: admin.code,
            role: { $ne: 'user' },
            status: { $ne: 'delete' },
          };

    if (searchQuery && String(searchQuery).trim()) {
      filter = {
        ...filter,
        userName: { $regex: String(searchQuery).trim(), $options: 'i' },
      };
    }

    const [allUsers, totalUsers] = await Promise.all([
      SubAdmin.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      SubAdmin.countDocuments(filter),
    ]);

    const data = await enrichListRows(allUsers);

    return res.status(200).json({
      message: 'All sub-admin details retrieved successfully',
      data,
      totalUsers,
      totalPages: Math.max(1, Math.ceil(totalUsers / limitNum) || 1),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};
export const getAllOnlyUser = async (req, res) => {
  try {
    const { id, role } = req;
    const { page = 1, limit = 10, searchQuery, refCode, status } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 10));

    const admin = await SubAdmin.findById(id).select('code').lean();
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // List of Clients: direct downlines filtered by Active / Deactive tab
    const inviteCode =
      refCode && String(refCode).trim() ? String(refCode).trim() : admin.code;

    const statusFilter = String(status || 'active').toLowerCase().trim();
    let filter = {
      invite: inviteCode,
      status:
        statusFilter === 'deactive'
          ? { $nin: ['active', 'delete'] }
          : 'active',
    };

    if (role === 'supperadmin' && (!refCode || !String(refCode).trim())) {
      filter._id = { $ne: id };
    }

    if (searchQuery && searchQuery !== undefined && String(searchQuery).trim()) {
      filter = {
        ...filter,
        userName: { $regex: String(searchQuery).trim(), $options: 'i' },
      };
    }

    const [allUsers, totalUsers] = await Promise.all([
      SubAdmin.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      SubAdmin.countDocuments(filter),
    ]);

    const rows = await enrichListRows(allUsers);

    return res.status(200).json({
      message: 'All sub-admin details retrieved successfully',
      data: rows,
      totalUsers,
      totalPages: Math.max(1, Math.ceil(totalUsers / limitNum) || 1),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};

/**
 * Header "All Client" search: match username/name/code across the full
 * downline tree (not only direct children).
 */
export const searchClients = async (req, res) => {
  try {
    const { id, role } = req;
    const q = String(req.query.q || '').trim();

    const admin = await SubAdmin.findById(id).lean();
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const isSuperAdmin = role === 'supperadmin' || role === 'superadmin';
    let filter = { status: { $ne: 'delete' } };

    if (isSuperAdmin) {
      filter._id = { $ne: id };
    } else {
      const downlineIds = await getAllDownlineMemberIds(SubAdmin, String(id));
      if (!downlineIds.length) {
        return res.status(200).json({ success: true, data: [] });
      }
      filter._id = { $in: downlineIds };
    }

    if (q) {
      filter.$or = [
        { userName: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
      ];
    }

    const limitNum = q ? 40 : 500;
    const data = await SubAdmin.find(filter, {
      userName: 1,
      name: 1,
      code: 1,
      role: 1,
      invite: 1,
      betLock: 1,
      marketLocks: 1,
      blockedMarkets: 1,
      status: 1,
      avbalance: 1,
      balance: 1,
      exposure: 1,
      totalExposure: 1,
      creditReference: 1,
      gamelock: 1,
    })
      .sort({ userName: 1 })
      .limit(limitNum)
      .lean();

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error searching clients:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
};

/**
 * Header search → Market Analysis modal payload for one client.
 * GET /user-market-analysis/:userId
 */
export const getUserMarketAnalysis = async (req, res) => {
  try {
    const { id: adminId, role } = req;
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const user = await SubAdmin.findById(userId).lean();
    if (!user || user.status === 'delete') {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const isSuperAdmin = role === 'supperadmin' || role === 'superadmin';
    if (!isSuperAdmin) {
      const downlineIds = await getAllDownlineMemberIds(SubAdmin, String(adminId));
      if (!downlineIds.map(String).includes(String(userId))) {
        return res.status(403).json({
          success: false,
          message: 'Client is not in your downline',
        });
      }
    }

    // Users: own open bets. Agents/masters: open bets from their full downline
    // (their exposure comes from downline, not their own userId bets).
    let pendingBets = [];
    if (user.role === 'user') {
      pendingBets = await betModel
        .find({
          userId: String(userId),
          status: 0,
          isCashedOut: { $ne: true },
        })
        .lean();
    } else {
      const downlineIds = await getAllDownlineMemberIds(SubAdmin, String(userId));
      const downlineUsers = downlineIds.length
        ? await SubAdmin.find(
            {
              _id: { $in: downlineIds },
              role: 'user',
              status: { $ne: 'delete' },
            },
            { _id: 1 }
          ).lean()
        : [];
      const betUserIds = [
        String(userId),
        ...downlineUsers.map((u) => String(u._id)),
      ];
      pendingBets = await betModel
        .find({
          userId: { $in: betUserIds },
          status: 0,
          isCashedOut: { $ne: true },
        })
        .lean();
    }

    const computedExposure = calculateAllExposure(pendingBets);
    const storedExposure =
      user.role === 'user'
        ? Number(user.exposure) || 0
        : Number(user.totalExposure ?? user.exposure) || 0;

    const gameDetail = {
      userName: user.userName || 'N/A',
      accountType:
        user.role === 'user'
          ? 'User'
          : String(user.role || 'User').replace(/^./, (c) => c.toUpperCase()),
      general: Number(user.avbalance) || 0,
      exposure: storedExposure || computedExposure || 0,
      creditReference: Number(user.creditReference) || 0,
    };

    // Upline masters/agents for this client (User Lock table), top → bottom
    const uplineChain = [];
    let walk = user;
    for (let i = 0; i < 20 && walk?.invite; i++) {
      const parent = await SubAdmin.findOne(
        { code: walk.invite },
        {
          userName: 1,
          name: 1,
          role: 1,
          status: 1,
          betLock: 1,
          invite: 1,
          code: 1,
        }
      ).lean();
      if (!parent) break;
      uplineChain.unshift(parent);
      walk = parent;
      if (String(parent._id) === String(adminId)) break;
    }

    // From logged-in admin downward when admin is in the chain; else full chain
    const adminIdx = uplineChain.findIndex(
      (p) => String(p._id) === String(adminId)
    );
    const visibleUpline =
      adminIdx >= 0 ? uplineChain.slice(adminIdx) : uplineChain;

    const userLock = visibleUpline
      .filter((p) => p.role !== 'user')
      .map((p) => ({
        masterName: p.userName || p.name || 'N/A',
        userAct: p.status !== 'blocked' && p.status !== 'deactive',
        betActive: !p.betLock,
      }));

    const gameLock = (Array.isArray(user.gamelock) ? user.gamelock : [])
      .filter((g) => g && g.lock === false)
      .map((g) => ({
        masterName: user.invite || 'Admin',
        betLock: true,
        eventName: g.game || 'Sport',
      }));

    // Group open bets into match → markets → runners (for modal bottom section)
    const byMatch = {};
    for (const bet of pendingBets) {
      const matchKey = `${bet.gameId || ''}_${bet.eventName || ''}`;
      if (!byMatch[matchKey]) {
        byMatch[matchKey] = {
          matchName: bet.eventName || 'Unknown Match',
          matchDate: bet.createdAt
            ? new Date(bet.createdAt).toLocaleString()
            : '',
          gameId: bet.gameId || '',
          bets: [],
        };
      }
      byMatch[matchKey].bets.push(bet);
    }

    const matchExposures = [];
    for (const match of Object.values(byMatch)) {
      const fancyBets = match.bets.filter((b) => isFancyBet(b));
      const nonFancyBets = match.bets.filter((b) => !isFancyBet(b));
      const markets = [];

      const sportsMarkets = groupBetsByMarket(nonFancyBets);
      for (const [, marketBets] of Object.entries(sportsMarkets)) {
        const sample = marketBets[0];
        const scenarios = calculateOutcomeScenarios(marketBets);
        markets.push({
          marketName: sample.marketName || sample.gameType || 'Market',
          runners: Object.entries(scenarios).map(([runnerName, exposure]) => ({
            runnerName,
            exposure: Number(Number(exposure).toFixed(2)),
          })),
        });
      }

      const fancyByTeam = {};
      for (const bet of fancyBets) {
        const key = `${bet.gameType || 'fancy'}_${bet.teamName || ''}`;
        if (!fancyByTeam[key]) fancyByTeam[key] = [];
        fancyByTeam[key].push(bet);
      }
      for (const [, teamBets] of Object.entries(fancyByTeam)) {
        const sample = teamBets[0];
        const exp = calculateFancyExposure(teamBets);
        markets.push({
          marketName: sample.gameType || 'Fancy',
          runners: [
            {
              runnerName: sample.teamName || sample.marketName || 'Selection',
              exposure: -Number(Number(exp).toFixed(2)),
            },
          ],
        });
      }

      if (markets.length > 0) {
        matchExposures.push({
          matchName: match.matchName,
          matchDate: match.matchDate,
          gameId: match.gameId,
          markets,
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        gameDetail,
        userLock,
        gameLock,
        matchExposures,
      },
    });
  } catch (error) {
    console.error('Error fetching user market analysis:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: error.message,
    });
  }
};

/**
 * Active downline users (role=user) for Bet Lock modal, with lock flag for market/game.
 * GET /bet-lock-users?marketName=&eventName=&gameId=
 */
export const getBetLockUsers = async (req, res) => {
  try {
    const { id } = req;
    const marketName = String(req.query.marketName || '').trim();
    const eventName = String(req.query.eventName || '').trim();
    const gameId = String(req.query.gameId || '').trim();

    const admin = await SubAdmin.findById(id).lean();
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Only direct downline (invite = my code) — agents, masters, users, etc.
    const users = await SubAdmin.find(
      {
        invite: admin.code,
        status: 'active',
        _id: { $ne: id },
      },
      {
        userName: 1,
        name: 1,
        role: 1,
        status: 1,
        invite: 1,
        betLock: 1,
        marketLocks: 1,
        blockedMarkets: 1,
      }
    )
      .sort({ userName: 1 })
      .limit(2000)
      .lean();

    const data = users.map((u) => ({
      ...u,
      isLockedForMarket: isUserLockedForMarket(u, {
        marketName,
        gameType: marketName,
        gameId,
        eventName,
      }),
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching bet-lock users:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: error.message,
    });
  }
};

/**
 * Lock/unlock selected downline users for a market on a game.
 * POST /bet-lock-users
 * body: { marketName, eventName, gameId, userIds[], transactionCode }
 */
export const betLockUsers = async (req, res) => {
  try {
    const { id } = req;
    const {
      marketName,
      eventName = '',
      gameId = '',
      userIds = [],
      transactionCode,
    } = req.body || {};

    if (!marketName || !String(marketName).trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'marketName is required' });
    }
    if (!transactionCode || !String(transactionCode).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Transaction Code / Master Password is required',
      });
    }

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const ok = await verifyMasterPassword(admin, String(transactionCode).trim());
    if (!ok) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid Transaction Code / Master Password' });
    }

    // Only lock/unlock direct downline accounts (agents + users). Nested downline
    // is blocked at bet-time when their upline agent is locked.
    const directDownline = await SubAdmin.find(
      {
        invite: admin.code,
        status: 'active',
        _id: { $ne: id },
      },
      { _id: 1 }
    ).lean();
    const allowedIds = new Set(directDownline.map((u) => String(u._id)));

    const selectedIds = [
      ...new Set(
        (Array.isArray(userIds) ? userIds : [])
          .map((x) => String(x))
          .filter((uid) => allowedIds.has(uid))
      ),
    ];

    const lockContext = {
      marketName: String(marketName).trim(),
      eventName: String(eventName || '').trim(),
      gameId: String(gameId || '').trim(),
    };

    const lockEntry = buildMarketLockEntry({
      ...lockContext,
      lockedBy: admin.userName || String(id),
    });

    // Unlock direct downline who had this market/game lock but are not selected
    const toUnlock = [...allowedIds].filter((uid) => !selectedIds.includes(uid));
    if (toUnlock.length) {
      const unlockUsers = await SubAdmin.find({
        _id: { $in: toUnlock },
        'marketLocks.0': { $exists: true },
      });
      for (const u of unlockUsers) {
        const next = stripMatchingMarketLocks(u.marketLocks, lockContext);
        if (next.length !== (u.marketLocks || []).length) {
          u.marketLocks = next;
          await u.save();
        }
      }
    }

    // Apply lock to selected direct downline (agent lock cascades to their users)
    let lockedCount = 0;
    if (selectedIds.length) {
      const lockUsers = await SubAdmin.find({ _id: { $in: selectedIds } });
      for (const u of lockUsers) {
        const cleaned = stripMatchingMarketLocks(u.marketLocks, lockContext);
        cleaned.push(lockEntry);
        u.marketLocks = cleaned;
        await u.save();
        lockedCount += 1;
      }
    }

    return res.status(200).json({
      success: true,
      message:
        lockedCount > 0
          ? `Bet locked for ${lockedCount} account(s) on ${lockContext.marketName}`
          : `Cleared bet lock for ${lockContext.marketName}`,
      lockedCount,
      unlockedCount: toUnlock.length,
    });
  } catch (error) {
    console.error('Error updating bet locks:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: error.message,
    });
  }
};

export const getUsersByInvite = async (req, res) => {
  const { refCode } = req.body;
  try {
    const { id } = req; // Extracting admin ID from request

    //  Find the logged-in admin
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(400).json({ message: 'Admin not found' });
    }

    //  Fetch users where `invite` matches the admin's `code`
    const usersData = await SubAdmin.find({
      invite: refCode,
      status: { $ne: 'delete' },
    });

    if (!usersData.length) {
      return res
        .status(404)
        .json({ message: 'No users found for this invite code.' });
    }

    res.status(200).json({
      message: 'Users retrieved successfully',
      data: usersData,
    });
  } catch (error) {
    console.error('Error fetching users by invite code:', error);
    res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};

export const getSubAdminuser = async (req, res) => {
  try {
    const { code } = req.body; // Get invite code from request body
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    if (!code) {
      return res.status(400).json({ message: 'Admin invite code is required' });
    }

    const filter = { invite: code, status: { $ne: 'delete' } };
    const totalUsers = await SubAdmin.countDocuments(filter);

    const subAdmins = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);
    return res.status(200).json({
      message: `Sub-admin details for level  retrieved successfully`,
      data: subAdmins,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching sub-admin:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: error.message });
  }
};

export const updateCreditReference = async (req, res) => {
  try {
    const { id, role } = req; // Sub-admin ID (admin making the change)
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { userId, formData } = req.body;
    const { creditReference, masterPassword } = formData;

    const numericCreditReference = parseFloat(creditReference);
    if (isNaN(numericCreditReference)) {
      return res
        .status(400)
        .json({ message: 'Invalid credit reference amount.' });
    }

    //  Find the admin making the change
    let subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }

    //  Verify Master Password
    const isMatch = await verifyMasterPassword(subAdmin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Master password.' });
    }

    //  Find the user being updated
    let editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const test = await creditRefHistory.create({
      formName: 'uplire',
      userName: editUser.userName,
      oldamount: editUser.creditReference,
      newamount: creditReference,
      remark: 'Credit Reference',
      invite: subAdmin.code,
      userId: userId,
    });

    if (creditReference !== undefined)
      editUser.creditReference = creditReference;

    //Only Recalculate creditReference profit/loss
    editUser.creditReferenceProfitLoss =
      editUser.baseBalance - editUser.creditReference;

    //  Save updated user

    await editUser.save();
    const filter =
      role === 'supperadmin'
        ? { _id: { $ne: id }, role: { $ne: 'user' }, status: { $ne: 'delete' } }
        : { invite: subAdmin.code, role: 'user', status: { $ne: 'delete' } };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: `Credit ${creditReference} updated successfully`,
      data: allUsers,
    });
  } catch (error) {
    console.error('Update SubAdmin Error:', error);
    return res
      .status(500)
      .json({ message: error.message, error: error.message });
  }
};
export const updateExploserLimit = async (req, res) => {
  try {
    const { id, role } = req; // Sub-admin ID (admin making the change)
    console.log('The role in updateExposureLimit', role);
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { userId, formData } = req.body;
    const { exposureLimit, masterPassword } = formData;

    //  Find the admin making the change
    let subAdmin = await SubAdmin.findById(id);
    console.log('The subAdmin in updateExposureLimit', subAdmin);
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }

    //  Verify Master Password
    const isMatch = await verifyMasterPassword(subAdmin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Master password.' });
    }

    //  Find the user being updated
    let editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // console.log("creditRef", creditRef);
    //  Update fields
    if (exposureLimit !== undefined) editUser.exposureLimit = exposureLimit;

    //  Recalculate profit/loss
    // editUser.profitLoss = editUser.balance - (editUser.creditReference || 0);

    await editUser.save();
    const filter =
      role === 'supperadmin'
        ? { _id: { $ne: id }, role: { $ne: 'user' }, status: { $ne: 'delete' } }
        : { invite: subAdmin.code, role: 'user', status: { $ne: 'delete' } };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: allUsers,
    });
  } catch (error) {
    console.error('Update User Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

export const updatePartnership = async (req, res) => {
  try {
    const { id, role } = req;
    const { userId, formData } = req.body;
    const { partnership, masterPassword } = formData;

    // Find admin making the change
    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Verify master password
    const isMatch = await verifyMasterPassword(admin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Master password.' });
    }

    // Find the user being updated
    const editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Users excluded from partnership
    if (editUser.role === 'user') {
      return res
        .status(400)
        .json({ message: 'Partnership cannot be set for end users.' });
    }

    // Verify the admin is the direct upline
    if (editUser.invite !== admin.code) {
      return res.status(403).json({
        message: 'You can only update partnership for your direct downline.',
      });
    }

    // Validate range (0-100); keep cannot exceed parent's keep
    const parsedPartnership = Number(partnership);
    if (
      partnership === undefined ||
      partnership === null ||
      partnership === '' ||
      isNaN(parsedPartnership) ||
      parsedPartnership < 0 ||
      parsedPartnership > 100
    ) {
      return res.status(400).json({
        message: 'Partnership must be between 0 and 100.',
      });
    }

    const parentKeep = getAccountMyKeepPercent(admin);
    if (parsedPartnership > parentKeep && parentKeep < 100) {
      return res.status(400).json({
        message: `Partnership cannot exceed your keep (${parentKeep}%).`,
      });
    }

    const storedPartnership = toStoredDownlineKeepFromCreateInput(
      parsedPartnership,
      admin
    );

    // Update partnership
    editUser.partnership = storedPartnership;
    await editUser.save();

    // Return updated user list (same pattern as updateCreditReference)
    const filter =
      role === 'supperadmin'
        ? {
            _id: { $ne: id },
            role: { $ne: 'user' },
            status: { $ne: 'delete' },
          }
        : {
            invite: admin.code,
            role: { $ne: 'user' },
            status: { $ne: 'delete' },
          };

    const allUsers = await SubAdmin.find(filter);

    return res.status(200).json({
      success: true,
      message: `Partnership updated to ${storedPartnership} successfully`,
      data: allUsers,
    });
  } catch (error) {
    console.error('Update Partnership Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

export const getCreditRefHistoryByUserId = async (req, res) => {
  try {
    const { userId } = req.params; // passed in route as /credit-ref-history/:userId
    const { page = 1, limit = 10, searchQuery = '' } = req.query;
    // console.log("userId", userId);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const filter = {
      userId: userId,
      // userName: { $regex: searchQuery },
    };

    const data = await creditRefHistory
      .find(filter)
      .sort({ createdAt: -1 }) // optional: latest first
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await creditRefHistory.countDocuments(filter);

    // console.log("total", total);
    // console.log("data", data);

    return res.status(200).json({
      message: 'Credit Reference History fetched successfully',
      data,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching creditRefHistory:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
      success: false,
    });
  }
};

// export const withdrowalAndDeposite = async (req, res) => {
//   try {
//     const { id, role } = req;

//     const { page = 1, limit = 10 } = req.query;
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);

//     const { userId, formData, type } = req.body;
//     let { balance, masterPassword, remark } = formData;

//     //  Convert balance to a number
//     balance = parseFloat(balance);

//     if (isNaN(balance) || balance <= 0) {
//       return res.status(400).json({ message: 'Invalid balance amount.' });
//     }

//     // Find the admin making the change
//     let subAdmin = await SubAdmin.findById(id);
//     if (!subAdmin) {
//       return res.status(404).json({ message: 'Sub-admin not found' });
//     }

//     //  Verify Master Password
//     const isMatch = await verifyMasterPassword(subAdmin, masterPassword);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid Master password.' });
//     }

//     //  Find the user being updated
//     let editUser = await SubAdmin.findById(userId);
//     if (!editUser) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // Handle Withdrawal
//     if (type === 'withdrawal') {
//       if (balance > editUser.avbalance || balance > editUser.balance) {
//         return res.status(400).json({ message: 'Insufficient balance' });
//       }

//       editUser.avbalance = Math.max(0, editUser.avbalance - balance);
//       editUser.balance -= balance;
//       editUser.baseBalance -= balance; // Update the baseBalance of the user
//       // editUser.totalAvbalance -= balance;
//       editUser.remark = remark || editUser.remark;

//       //  CORRECT: Recalculate creditReferenceProfitLoss after baseBalance change
//       // Always use the formula: baseBalance - creditReference
//       editUser.creditReferenceProfitLoss =
//         editUser.baseBalance - editUser.creditReference;

//       // Don't recalculate profit/loss - it should only come from betting results
//       // Only return the amount to avbalance (allocated funds coming back). Do NOT
//       // add to balance/baseBalance — that would double-count and create phantom funds.
//       subAdmin.avbalance += balance;
//       await subAdmin.save();

//       await editUser.save();
//       await WithdrawalHistory.create({
//         userName: editUser.userName,
//         amount: balance,
//         remark: remark || 'Withdrawal',
//         invite: subAdmin.code,
//       });

//       await TransactionHistory.create({
//         userId: userId,
//         userName: editUser.userName,
//         withdrawl: balance,
//         deposite: 0,
//         amount: editUser.avbalance,
//         from: subAdmin.userName,
//         to: editUser.userName,
//         remark: remark || 'Transaction',
//         invite: subAdmin.code,
//       });
//     }

//     //  Handle Deposit
//     if (type === 'deposite') {
//       if (role === 'supperadmin') {
//         // Super Admin can deposit without balance restriction
//         editUser.balance += balance;
//         editUser.avbalance += balance;
//         editUser.baseBalance += balance;
//         // editUser.totalAvbalance += balance;
//         editUser.remark = remark || editUser.remark;

//         //  CORRECT: Recalculate creditReferenceProfitLoss after baseBalance change
//         // Always use the formula: baseBalance - creditReference
//         editUser.creditReferenceProfitLoss =
//           editUser.baseBalance - editUser.creditReference;

//         //Parent update
//         subAdmin.balance -= balance;
//         // subAdmin.baseBalance -= balance;
//         subAdmin.avbalance = Math.max(0, subAdmin.avbalance - balance);
//       } else if (balance > subAdmin.avbalance) {
//         return res.status(400).json({ message: 'Insufficient balance' });
//       } else {
//         // Normal admin deposits from their own balance
//         editUser.balance += balance;
//         editUser.avbalance += balance;
//         editUser.baseBalance += balance;
//         // editUser.totalAvbalance += balance;
//         editUser.remark = remark || editUser.remark;

//         //  CORRECT: Recalculate creditReferenceProfitLoss after baseBalance change
//         // Always use the formula: baseBalance - creditReference
//         editUser.creditReferenceProfitLoss =
//           editUser.baseBalance - editUser.creditReference;
//         // editUser.profitLoss should NOT be updated here - only from betting results!

//         // Don't recalculate profit/loss - it should only come from betting results
//         subAdmin.balance -= balance;
//         // subAdmin.baseBalance -= balance;
//         subAdmin.avbalance = Math.max(0, subAdmin.avbalance - balance);
//       }
//       await subAdmin.save();
//       await editUser.save();

//       await DepositHistory.create({
//         userName: editUser.userName,
//         amount: balance,
//         remark: remark || 'Deposit',
//         invite: subAdmin.code,
//       });

//       await TransactionHistory.create({
//         userId: userId,
//         userName: editUser.userName,
//         withdrawl: 0,
//         deposite: balance,
//         amount: editUser.avbalance,
//         remark: remark || 'Transaction',
//         from: subAdmin.userName,
//         to: editUser.userName,
//         invite: subAdmin.code,
//       });
//     }

//     await updateAdmin(id);
//     await updateAllUplines(userId);

//     //  Fetch updated user list
//     const filter =
//       role === 'supperadmin'
//         ? { _id: { $ne: id }, role: { $ne: 'user' }, status: { $ne: 'delete' } }
//         : { invite: subAdmin.code, role: 'user', status: { $ne: 'delete' } };

//     const allUsers = await SubAdmin.find(filter)
//       .limit(limitNum)
//       .skip((pageNum - 1) * limitNum);

//     const totalUsers = await SubAdmin.countDocuments(filter);

//     return res.status(200).json({
//       success: true,
//       message: 'Transaction completed successfully',
//       totalUsers,
//       data: allUsers,
//     });
//   } catch (error) {
//     console.error('Update SubAdmin Error:', error);
//     return res
//       .status(500)
//       .json({ message: 'Server error', error: error.message });
//   }
// };
export const withdrowalAndDeposite = async (req, res) => {
  try {
    const { id, role } = req;

    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { userId, formData, type } = req.body;
    let { balance, masterPassword, remark } = formData;

    //  Convert balance to a number
    balance = parseFloat(balance);

    if (isNaN(balance) || balance <= 0) {
      return res.status(400).json({ message: 'Invalid balance amount.' });
    }

    // Find the admin making the change
    let subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }

    //  Verify Master Password
    const isMatch = await verifyMasterPassword(subAdmin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Master password.' });
    }

    //  Find the user being updated
    let editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Handle Withdrawal
    if (type === 'withdrawal') {
      if (balance > editUser.avbalance || balance > editUser.balance) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      editUser.avbalance = Math.max(0, editUser.avbalance - balance);
      editUser.balance -= balance;
      editUser.baseBalance -= balance; // Update the baseBalance of the user
      // editUser.totalAvbalance -= balance;
      editUser.remark = remark || editUser.remark;

      // ✅ CORRECT: Recalculate creditReferenceProfitLoss after baseBalance change
      // Always use the formula: baseBalance - creditReference
      editUser.creditReferenceProfitLoss =
        editUser.baseBalance - editUser.creditReference;
      console.log(
        '✅ [WITHDRAWAL] creditReferenceProfitLoss recalculated:',
        editUser.creditReferenceProfitLoss
      );

      // Don't recalculate profit/loss - it should only come from betting results
      // subAdmin.balance += balance; // Admin receives the withdrawn amount
      // // Update the baseBalance of the admin as well
      // subAdmin.baseBalance += balance;
      // Update the avbalance of the admin as well
      subAdmin.avbalance += balance;
      await subAdmin.save();

      await editUser.save();
      await WithdrawalHistory.create({
        userName: editUser.userName,
        amount: balance,
        remark: remark || 'Withdrawal',
        invite: subAdmin.code,
      });

      await TransactionHistory.create({
        userId: userId,
        userName: editUser.userName,
        withdrawl: balance,
        deposite: 0,
        amount: editUser.avbalance,
        // Users: ledger balance; agents/masters: available balance (statement Closing)
        balanceAfter:
          editUser.role === 'user' ? editUser.balance : editUser.avbalance,
        from: subAdmin.userName,
        to: editUser.userName,
        remark: remark || 'Transaction',
        invite: subAdmin.code,
      });
    }

    // ✅ Handle Deposit
    // if (type === "deposite") {
    //   if (role === "supperadmin") {
    //     // Super Admin can deposit without balance restriction
    //     editUser.balance += balance;
    //     editUser.avbalance += balance;
    //     editUser.baseBalance+=balance;//update the baseBalance of the user
    //     editUser.totalAvbalance += balance; // Update total available balance
    //     editUser.remark = remark || editUser.remark;

    //     //Update the creditReference profit/Loss
    //     editUser.creditReferenceProfitLoss+=balance;
    //     console.log("The creditReferenceProfitLoss in updateCreditReference",editUser.creditReferenceProfitLoss)
    //     editUser.profitLoss+=balance;//Update the profit/Loss
    //     console.log("The profitLoss in updateCreditReference",editUser.profitLoss)
    //     // Don't recalculate profit/loss - it should only come from betting results
    //     subAdmin.balance -= balance;
    //     subAdmin.avbalance = Math.max(0, subAdmin.avbalance - balance);
    //   } else if (balance > subAdmin.avbalance) {
    //     return res.status(400).json({ message: "Insufficient balance" });
    //   } else {
    //     // Normal admin deposits from their own balance
    //     editUser.balance += balance;
    //     editUser.avbalance += balance;
    //     editUser.baseBalance+=balance;//update the baseBalance of the user
    //     editUser.totalAvbalance += balance;
    //     editUser.remark = remark || editUser.remark;
    //     // Don't recalculate profit/loss - it should only come from betting results
    //     // admin.totalAvbalance = admin.balance - (balance || 0) + totalAvBalance;
    //     subAdmin.balance -= balance;
    //     subAdmin.avbalance = Math.max(0, subAdmin.avbalance - balance);
    //   }

    //   await subAdmin.save();
    //   await editUser.save();
    //   await DepositHistory.create({
    //     userName: editUser.userName,
    //     amount: balance,
    //     remark: remark || "Deposit",
    //     invite: subAdmin.code,
    //   });

    //   await TransactionHistory.create({
    //     userId: userId,
    //     userName: editUser.userName,
    //     withdrawl: 0,
    //     deposite: balance,
    //     amount: editUser.avbalance,
    //     remark: remark || "Transaction",
    //     from: subAdmin.userName,
    //     to: editUser.userName,
    //     invite: subAdmin.code,
    //   });
    // }
    // ✅ Handle Deposit
    if (type === 'deposite') {
      console.log('🚨 [DEPOSIT] Function called with type:', type);
      console.log('🚨 [DEPOSIT] Balance:', balance);
      console.log('�� [DEPOSIT] Role:', role);

      if (role === 'supperadmin' || role === 'superadmin') {
        console.log('🧾 [DEPOSIT] Super admin deposit path');
        // Super Admin can deposit without balance restriction
        editUser.balance += balance;
        editUser.avbalance += balance;
        editUser.baseBalance += balance;
        // editUser.totalAvbalance += balance;
        editUser.remark = remark || editUser.remark;

        // ✅ CORRECT: Recalculate creditReferenceProfitLoss after baseBalance change
        // Always use the formula: baseBalance - creditReference
        editUser.creditReferenceProfitLoss =
          editUser.baseBalance - editUser.creditReference;
        console.log(
          '✅ [DEPOSIT] creditReferenceProfitLoss recalculated:',
          editUser.creditReferenceProfitLoss
        );
        // editUser.profitLoss should NOT be updated here - only from betting results!

        // Superadmin's balance and avbalance remain unchanged when depositing
        // subAdmin.balance -= balance;
        // subAdmin.baseBalance -= balance;
        // subAdmin.avbalance = Math.max(0, subAdmin.avbalance - balance);
      } else if (balance > subAdmin.avbalance) {
        console.log('🚨 [DEPOSIT] Insufficient balance error');
        return res.status(400).json({ message: 'Insufficient balance' });
      } else {
        console.log('🚨 [DEPOSIT] Normal admin deposit path');
        // Normal admin deposits from their own balance
        editUser.balance += balance;
        editUser.avbalance += balance;
        editUser.baseBalance += balance;
        // editUser.totalAvbalance += balance;
        editUser.remark = remark || editUser.remark;

        // ✅ CORRECT: Recalculate creditReferenceProfitLoss after baseBalance change
        // Always use the formula: baseBalance - creditReference
        editUser.creditReferenceProfitLoss =
          editUser.baseBalance - editUser.creditReference;
        console.log(
          '✅ [DEPOSIT] creditReferenceProfitLoss recalculated:',
          editUser.creditReferenceProfitLoss
        );
        // editUser.profitLoss should NOT be updated here - only from betting results!

        // Don't recalculate profit/loss - it should only come from betting results
        // subAdmin.balance -= balance;
        // subAdmin.baseBalance -= balance;
        subAdmin.avbalance = Math.max(0, subAdmin.avbalance - balance);
      }

      console.log('🚨 [DEPOSIT] About to save user and admin');
      await subAdmin.save();
      await editUser.save();
      console.log('🚨 [DEPOSIT] User and admin saved successfully');

      await DepositHistory.create({
        userName: editUser.userName,
        amount: balance,
        remark: remark || 'Deposit',
        invite: subAdmin.code,
      });

      await TransactionHistory.create({
        userId: userId,
        userName: editUser.userName,
        withdrawl: 0,
        deposite: balance,
        amount: editUser.avbalance,
        balanceAfter:
          editUser.role === 'user' ? editUser.balance : editUser.avbalance,
        remark: remark || 'Transaction',
        from: subAdmin.userName,
        to: editUser.userName,
        invite: subAdmin.code,
      });
    }

    await updateAdmin(id);
    await updateAllUplines(userId);

    // ✅ Fetch updated user list
    const filter =
      role === 'supperadmin'
        ? { _id: { $ne: id }, role: { $ne: 'user' }, status: { $ne: 'delete' } }
        : { invite: subAdmin.code, role: 'user', status: { $ne: 'delete' } };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Transaction completed successfully',
      totalUsers,
      data: allUsers,
    });
  } catch (error) {
    console.error('Update SubAdmin Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

export const userSetting = async (req, res) => {
  try {
    const { id, role } = req; // Sub-admin ID (admin making the change)

    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { masterPassword, status, userId } = req.body;

    //  Find the admin making the change
    let subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }

    // console.log("masterPassword", masterPassword)

    //  Verify Master Password
    const isMatch = await verifyMasterPassword(subAdmin, masterPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Master password.' });
    }

    //  Find the user being updated
    let editUser = await SubAdmin.findById(userId);
    if (!editUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    editUser.status = status; // Admin receives the withdrawn amount
    await editUser.save();

    //  Fetch updated user list
    const filter =
      role === 'supperadmin'
        ? { _id: { $ne: id }, role: { $ne: 'user' }, status: { $ne: 'delete' } }
        : { invite: subAdmin.code, role: 'user', status: { $ne: 'delete' } };

    const allUsers = await SubAdmin.find(filter)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const totalUsers = await SubAdmin.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: `User ${status} successfully`,
      totalUsers,
      data: allUsers,
    });
  } catch (error) {
    console.error('Update SubAdmin Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};

export const changePasswordBySelf = async (req, res) => {
  const { id } = req; // Sub-admin ID (admin making the change)
  try {
    const { oldPassword, newPassword } = req.body;
    const subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, one number, and one special character.',
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, subAdmin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old Password Wrong !' });
    }
    subAdmin.password = newPassword;
    subAdmin.isPasswordChanged = false;
    subAdmin.masterPassword = undefined;
    await subAdmin.save();
    await passwordHistory.create({
      userName: subAdmin.userName,
      remark: 'Password Changed By Self.',
      userId: id,
    });
    return res
      .status(200)
      .json({ message: 'Password changed successfully', data: subAdmin });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};
export const changePasswordByDownline = async (req, res) => {
  const adminId = req.id; // Sub-admin ID (admin making the change)
  try {
    const { newPassword, id, masterPassword, oldPassword } = req.body;
    const Admin = await SubAdmin.findById(adminId);
    const subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }
    if (!Admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (subAdmin.invite !== Admin.code) {
      return res.status(403).json({
        message: 'You can change password only for your direct downline.',
      });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, one number, and one special character.',
      });
    }

    const authPassword = masterPassword || oldPassword;
    const isMatch = await verifyMasterPassword(Admin, authPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'master Password Wrong !' });
    }
    subAdmin.password = newPassword;
    subAdmin.isPasswordChanged = false;
    subAdmin.masterPassword = undefined;
    await subAdmin.save();
    await passwordHistory.create({
      userName: subAdmin.userName,
      remark: `Password Changed By ${Admin.userName}`,
      userId: id,
    });
    return res
      .status(200)
      .json({ message: 'Password changed successfully', data: subAdmin });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res
      .status(500)
      .json({ message: error.message, error: error.message });
  }
};

export const getPasswordHistoryByUserId = async (req, res) => {
  const { id } = req; // Sub-admin ID (admin making the change)
  try {
    // passed in route as /credit-ref-history/:userId
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const filter = {
      userId: id,
    };

    const data = await passwordHistory
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await passwordHistory.countDocuments(filter);

    return res.status(200).json({
      message: 'Password History fetched successfully',
      data,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching creditRefHistory:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
      success: false,
    });
  }
};

export const getAgentTransactionHistory = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const { id } = req;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: 'User ID is required' });
    }

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    // Collect all downline invite codes recursively (all levels)
    const allDownlineCodes = new Set([admin.code]);
    const codesToProcess = [admin.code];

    while (codesToProcess.length > 0) {
      const currentCode = codesToProcess.pop();
      const downlines = await SubAdmin.find(
        { invite: currentCode, status: { $ne: 'delete' } },
        { code: 1, role: 1 }
      ).lean();

      for (const dl of downlines) {
        if (dl.code && dl.role !== 'user') {
          allDownlineCodes.add(dl.code);
          codesToProcess.push(dl.code);
        }
      }
    }

    // Match transactions at ALL levels + own transactions from upline
    const filter = {
      $or: [{ invite: { $in: [...allDownlineCodes] } }, { userId: id }],
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      filter.date = { $gte: start, $lte: end };
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 10), 100);

    const totalCount = await TransactionHistory.countDocuments(filter);

    const transactions = await TransactionHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Privacy: replace from/to with relative labels and strip upline identifiers
    const adminUserName = admin.userName;
    const maskedTransactions = transactions.map((txn) => {
      const masked = { ...txn };

      // Always remove invite code — it reveals upline identity
      delete masked.invite;

      if (masked.from === adminUserName) {
        // Current admin performed this transaction on a downline
        masked.from = 'You';
      } else if (masked.to === adminUserName) {
        // Upline performed this transaction on current admin
        masked.from = 'Upline';
        masked.to = 'You';
      }
      // Otherwise: transaction between downlines — show actual names
      return masked;
    });

    return res.status(200).json({
      success: true,
      data: maskedTransactions,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      totalRecords: totalCount,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
export const getUserTransactionHistory = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const { userId } = req.params;
    const { id } = req; // Authenticated admin ID from middleware

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: 'User ID is required' });
    }

    // Verify the authenticated admin exists
    const admin = await SubAdmin.findById(id, {
      code: 1,
      userName: 1,
      role: 1,
    }).lean();
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    // Verify target user exists and is a downline of the authenticated admin
    const targetUser = await SubAdmin.findById(userId, {
      invite: 1,
      userName: 1,
      code: 1,
      role: 1,
    }).lean();
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    // Supperadmin can view any user; others must prove downline ownership
    if (admin.role !== 'supperadmin') {
      // Traverse upward from target user to verify the admin is an ancestor
      let isDownline = false;
      let currentInvite = targetUser.invite;
      const maxDepth = 10; // Safety limit to prevent infinite loops
      let depth = 0;

      while (currentInvite && depth < maxDepth) {
        if (currentInvite === admin.code) {
          isDownline = true;
          break;
        }
        const parent = await SubAdmin.findOne(
          { code: currentInvite },
          { invite: 1, code: 1 }
        ).lean();
        if (!parent) break;
        currentInvite = parent.invite;
        depth++;
      }

      if (!isDownline) {
        return res
          .status(403)
          .json({ success: false, message: 'Access denied' });
      }
    }

    // Collect target user's own code + all downline invite codes recursively
    const allDownlineCodes = new Set([targetUser.code]);
    const codesToProcess = [targetUser.code];

    while (codesToProcess.length > 0) {
      const currentCode = codesToProcess.pop();
      const downlines = await SubAdmin.find(
        { invite: currentCode, status: { $ne: 'delete' } },
        { code: 1, role: 1 }
      ).lean();

      for (const dl of downlines) {
        if (dl.code && dl.role !== 'user') {
          allDownlineCodes.add(dl.code);
          codesToProcess.push(dl.code);
        }
      }
    }

    // Match: target user's own transactions + all downline transactions
    const filter = {
      $or: [{ invite: { $in: [...allDownlineCodes] } }, { userId: userId }],
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 10), 100);

    const totalCount = await TransactionHistory.countDocuments(filter);

    const transactions = await TransactionHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Privacy: mask upline references and strip invite codes
    const adminUserName = admin.userName;
    const targetUserName = targetUser.userName;
    const maskedTransactions = transactions.map((txn) => {
      const masked = { ...txn };

      // Always remove invite code — it reveals upline identity
      delete masked.invite;

      // If someone sent funds TO the target user and it wasn't the viewing admin,
      // mask the sender as 'Upline' to hide superior identity
      if (masked.to === targetUserName && masked.from !== adminUserName) {
        masked.from = 'Upline';
      }

      // If the viewing admin performed the transaction, label as 'You'
      if (masked.from === adminUserName) {
        masked.from = 'You';
      }

      return masked;
    });

    return res.status(200).json({
      success: true,
      data: maskedTransactions,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      totalRecords: totalCount,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAllDownlineBets = async (req, res) => {
  try {
    const { id } = req;
    const { startDate, endDate, page, limit, selectedGame, selectedVoid } =
      req.query;

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    let queue = [admin.code];
    let userIds = [];

    while (queue.length > 0) {
      const currentCode = queue.shift();

      const downlineUsers = await SubAdmin.find({
        invite: currentCode,
        status: { $ne: 'delete' },
      });

      for (const user of downlineUsers) {
        if (user.role === 'user') {
          userIds.push(user._id); // Collect user ID for bet query
        } else {
          // Add agent/admin code to queue to go deeper
          queue.push(user.code);
        }
      }
    }

    const filter = { userId: { $in: userIds } };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lte: end };
    }

    if (selectedGame) {
      filter.gameName = selectedGame;
    }
    // Filter by selectedVoid if provided
    if (selectedVoid === 'settel') {
      filter.status = { $nin: [0, 4] };
    } else if (selectedVoid === 'void') {
      filter.status = 3;
    } else if (selectedVoid === 'unsettel') {
      filter.status = 0;
    }
    if (filter.status === undefined) {
      filter.status = { $ne: 4 };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Fetch bets for all collected users
    const betData = await betHistoryModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalCount = await betHistoryModel.countDocuments(filter);

    return res.status(200).json({
      success: true,
      totalUsers: userIds.length,
      totalBets: betData.length,
      data: betData,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error) {
    console.error('Error fetching bets:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
};

export const parentsDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const beta = await SubAdmin.findById(id);
    if (!beta) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const papa = (await SubAdmin.findOne({ code: beta.invite })) || null;
    const dada = papa ? await SubAdmin.findOne({ code: papa.invite }) : null;

    const dataArray = [beta];
    if (papa) dataArray.push(papa);
    if (dada) dataArray.push(dada);

    return res.status(200).json({
      success: true,
      message: 'Parent details fetched successfully',
      data: dataArray,
    });
  } catch (error) {
    console.error('Error fetching parent details:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const updateGameLock = async (req, res) => {
  try {
    const { id } = req.params;
    const { game, lock } = req.body;

    // Validate input
    if (typeof lock !== 'boolean' || typeof game !== 'string') {
      return res.status(400).json({
        success: false,
        message:
          "Invalid input. 'game' must be a string and 'lock' must be boolean.",
      });
    }

    const admin = await SubAdmin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const gameIndex = admin.gamelock.findIndex((g) => g.game === game);
    if (gameIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Game not found in user's gamelock list",
      });
    }

    // Server-side parent-lock validation: cannot enable a game the parent has disabled
    if (lock === true && admin.invite) {
      const parent = await SubAdmin.findOne({ code: admin.invite });
      if (parent) {
        const parentGameEntry = parent.gamelock.find((g) => g.game === game);
        if (parentGameEntry && parentGameEntry.lock === false) {
          return res.status(403).json({
            success: false,
            message: `Cannot enable '${game}' because it is locked by a higher-level admin`,
          });
        }
      }
    }

    admin.gamelock[gameIndex].lock = lock;
    admin.markModified('gamelock');
    await admin.save();

    // User-level update
    if (admin.role === 'user') {
      return res.status(200).json({
        success: true,
        message: `Lock status for ${admin.gamelock[gameIndex].game} updated successfully`,
        gamelock: admin.gamelock,
      });
    }
    // Agent/Admin hierarchical update
    else {
      let queue = [admin.code];
      let skippedUsers = 0;
      while (queue.length > 0) {
        const currentCode = queue.shift();

        const downlineUsers = await SubAdmin.find({
          invite: currentCode,
          status: { $ne: 'delete' },
        });

        for (const user of downlineUsers) {
          const userGameIndex = user.gamelock.findIndex((g) => g.game === game);
          if (userGameIndex === -1) {
            // Skip users missing this game entry instead of aborting the whole traversal
            skippedUsers++;
            if (user.code) {
              queue.push(user.code);
            }
            continue;
          }

          if (lock === false) {
            // Locking: always propagate lock down
            user.gamelock[userGameIndex].lock = false;
          } else {
            // Unlocking: only unlock if user's direct parent has the game enabled
            const directParent = await SubAdmin.findOne({ code: user.invite });
            if (directParent) {
              const parentEntry = directParent.gamelock.find(
                (g) => g.game === game
              );
              if (parentEntry && parentEntry.lock === true) {
                user.gamelock[userGameIndex].lock = true;
              }
              // If parent still has it locked, don't unlock this user
            }
          }

          user.markModified('gamelock');
          console.log(
            `🚨 [USER-SAVE] subAdminController saving user ${user.userName}`
          );
          await user.save();

          if (user.code) {
            queue.push(user.code);
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: `Game locked successfully`,
        gamelock: admin.gamelock,
        details: {
          game,
          lock,
          skippedUsers,
        },
      });
    }
  } catch (error) {
    console.error('Error updating game lock:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
