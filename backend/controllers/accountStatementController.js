import SubAdmin from '../models/subAdminModel.js';
import TransactionHistory from '../models/transtionHistoryModel.js';
import betHistoryModel from '../models/betHistoryModel.js';
import CasinoBetHistory from '../models/casinoBetHistory.model.js';
import {
  assignStatementRowClosings,
  betActivityDateExpr,
  buildCasinoUserMatch,
  casinoActivityDateExpr,
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
import {
  getViewerShareOfUserClientPL,
  roundMoney,
} from '../utils/partnershipCommissionUtils.js';

/**
 * Fast closing anchor for agents/masters: avbalance + My P/L.
 * Same number as Account List "Available Balance With Profit/Loss", without the
 * recursive down-level occupy walk used by computeAccountListHeaderStats.
 */
const computeStatementAvailableWithPL = async (subject) => {
  const ownAv = Number(subject.avbalance) || 0;
  const subjectId = String(subject._id);
  const downlineIds = await getAllDownlineMemberIds(SubAdmin, subjectId);
  const treeMembers = await SubAdmin.find(
    {
      _id: { $in: [...downlineIds, subject._id] },
      status: { $ne: 'delete' },
    },
    {
      code: 1,
      invite: 1,
      role: 1,
      userName: 1,
      partnership: 1,
      casinoPartnership: 1,
      ggrPercentage: 1,
      bettingProfitLoss: 1,
    }
  ).lean();

  const byCode = new Map(treeMembers.map((m) => [m.code, m]));
  byCode.set(subject.code, { ...subject, ...byCode.get(subject.code) });

  let walk = subject;
  for (let i = 0; i < 20 && walk?.invite; i++) {
    if (byCode.has(walk.invite)) {
      walk = byCode.get(walk.invite);
      continue;
    }
    const parent = await SubAdmin.findOne(
      { code: walk.invite },
      {
        code: 1,
        invite: 1,
        role: 1,
        userName: 1,
        partnership: 1,
        casinoPartnership: 1,
        ggrPercentage: 1,
      }
    ).lean();
    if (!parent) break;
    byCode.set(parent.code, parent);
    walk = parent;
  }

  let myProfitLoss = 0;
  for (const user of treeMembers) {
    if (user.role !== 'user') continue;
    myProfitLoss = roundMoney(
      myProfitLoss +
        getViewerShareOfUserClientPL(
          subject.code,
          user,
          byCode,
          Number(user.bettingProfitLoss) || 0,
          'sports'
        )
    );
  }

  return {
    availableBalanceWithProfitLoss: roundMoney(ownAv + myProfitLoss),
    downlineIds,
    treeMembers,
    byCode,
  };
};

/** Build code→account map for partnership share on All passbook. */
const buildAccountByCodeForStatement = async (subjectAdmin, memberIds) => {
  const ids = [...new Set([String(subjectAdmin._id), ...(memberIds || [])])];
  const treeMembers = await SubAdmin.find(
    { _id: { $in: ids }, status: { $ne: 'delete' } },
    {
      code: 1,
      invite: 1,
      role: 1,
      userName: 1,
      partnership: 1,
      casinoPartnership: 1,
      ggrPercentage: 1,
    }
  ).lean();

  const byCode = new Map(treeMembers.map((m) => [m.code, m]));
  const byId = new Map(treeMembers.map((m) => [String(m._id), m]));
  byCode.set(subjectAdmin.code, {
    ...subjectAdmin,
    ...byCode.get(subjectAdmin.code),
  });

  let walk = subjectAdmin;
  for (let i = 0; i < 20 && walk?.invite; i++) {
    if (byCode.has(walk.invite)) {
      walk = byCode.get(walk.invite);
      continue;
    }
    const parent = await SubAdmin.findOne(
      { code: walk.invite },
      {
        code: 1,
        invite: 1,
        role: 1,
        userName: 1,
        partnership: 1,
        casinoPartnership: 1,
        ggrPercentage: 1,
      }
    ).lean();
    if (!parent) break;
    byCode.set(parent.code, parent);
    byId.set(String(parent._id), parent);
    walk = parent;
  }

  return { byCode, byId, treeMembers };
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
      lineType = 'all',
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

    // Sports/Casino/Third-party: bets live on leaf users — include selected
    // client + their downline (e.g. master → agenttest → usertest Lucky5).
    const isGamePlReport =
      accountType === 'sports' ||
      accountType === 'casino' ||
      accountType === 'thirdparty';

    if (userName && canSearchByClient) {
      const selectedUser = await SubAdmin.findOne(
        { userName, status: { $ne: 'delete' } },
        { _id: 1 }
      ).lean();
      if (selectedUser?._id) {
        const selectedId = selectedUser._id.toString();
        let allowed = isSuperAdmin;
        if (!allowed) {
          const viewerDownline = await getAllDownlineMemberIds(SubAdmin, id);
          allowed = viewerDownline.includes(selectedId);
        }
        if (!allowed) {
          targetUserIds = ['non_existent_user'];
        } else if (isGamePlReport) {
          const clientDownline = await getAllDownlineMemberIds(
            SubAdmin,
            selectedId
          );
          targetUserIds = [...new Set([selectedId, ...clientDownline])];
        } else {
          targetUserIds = [selectedId];
        }
      } else {
        targetUserIds = ['non_existent_user'];
      }
    } else if (!isPrivileged) {
      // Sports/Casino P/L reports: agents see downline (and own) bets like cowexch
      if (isGamePlReport && canSearchByClient) {
        const downlineIds = await getAllDownlineMemberIds(SubAdmin, id);
        targetUserIds = [...new Set([String(id), ...downlineIds])];
        if (targetUserIds.length === 0) targetUserIds = ['no_downline_users'];
      } else {
        targetUserIds = [id];
      }
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

    // Closing anchor:
    // - users → ledger balance
    // - agents/masters → Account List "Available Balance" (avbalance + My P/L)
    let currentBalance = 0;
    if (
      targetUserIds.length > 0 &&
      targetUserIds[0] !== 'non_existent_user' &&
      targetUserIds[0] !== 'no_downline_users'
    ) {
      const users = await SubAdmin.find(
        { _id: { $in: targetUserIds } },
        { balance: 1, avbalance: 1, role: 1 }
      ).lean();
      currentBalance = users.reduce(
        (acc, u) => acc + Number(u.balance || 0),
        0
      );
    }

    const depositLine = String(lineType || 'all').toLowerCase().trim();
    let depositSubjectName = null;
    let statementSubjectId = null;
    /** Reused for All passbook partnership share (avoids a second graphLookup). */
    let cachedDownlineIds = null;
    let cachedStatementMaps = null;

    let transactionQuery = { userId: { $in: userIdMatch } };

    // Deposit report + All passbook: single-subject deposits (upper/down flip)
    if (accountType === 'deposit' || accountType === 'all') {
      let subject = null;
      if (userName && canSearchByClient) {
        subject = await SubAdmin.findOne(
          { userName, status: { $ne: 'delete' } }
        ).lean();
      } else {
        subject = await SubAdmin.findById(id).lean();
      }

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: 'User not found for account statement',
        });
      }

      const subjectId = subject._id.toString();
      const subjectName = subject.userName;
      depositSubjectName = subjectName;
      statementSubjectId = subjectId;
      targetUserIds = [subjectId];
      targetUserNames = [subjectName];
      if (String(subject.role || '').toLowerCase() === 'user') {
        currentBalance = Number(subject.balance || 0);
      } else if (accountType === 'all') {
        // All passbook closing tracks Available With P/L (fast path)
        const stats = await computeStatementAvailableWithPL(subject);
        currentBalance = Number(stats.availableBalanceWithProfitLoss || 0);
        cachedDownlineIds = stats.downlineIds;
        cachedStatementMaps = {
          byCode: stats.byCode,
          treeMembers: stats.treeMembers,
        };
      } else {
        // Deposit/Withdraw: closing = running total of shown rows only
        currentBalance = null;
      }

      // All passbook = subject book: own + downline sports/casino (same when
      // upline searches this client by name, e.g. master → agenttest).
      if (accountType === 'all') {
        const downlineIds =
          cachedDownlineIds ||
          (await getAllDownlineMemberIds(SubAdmin, subjectId));
        cachedDownlineIds = downlineIds;
        targetUserIds = [...new Set([subjectId, ...downlineIds])];
        if (cachedStatementMaps?.treeMembers?.length) {
          targetUserNames = cachedStatementMaps.treeMembers
            .map((u) => u.userName)
            .filter(Boolean);
          if (!targetUserNames.includes(subjectName)) {
            targetUserNames = [subjectName, ...targetUserNames];
          }
        } else {
          const profileUsers = await SubAdmin.find(
            { _id: { $in: targetUserIds } },
            { userName: 1 }
          ).lean();
          targetUserNames = profileUsers.map((u) => u.userName).filter(Boolean);
        }
      }

      // Skip empty Opening Balance placeholder rows (OPENING PTS is synthetic)
      const notSettlement = { remark: { $not: /Settlement/i } };
      const notEmptyOpening = {
        $nor: [
          {
            remark: /^Opening Balance$/i,
            deposite: { $in: [0, null] },
            withdrawl: { $in: [0, null] },
          },
        ],
      };

      const upperMatch = {
        $or: [
          {
            userId: { $in: normalizeUserIdsForQuery([subjectId]) },
            from: { $ne: subjectName },
          },
          { to: subjectName, from: { $ne: subjectName } },
        ],
      };
      // Txns I performed on downline wallets (stored on downline userId)
      const downMatch = { from: subjectName };

      const lineMatch =
        accountType === 'deposit' && depositLine === 'upper'
          ? upperMatch
          : accountType === 'deposit' && depositLine === 'down'
            ? downMatch
            : { $or: [upperMatch, downMatch] };

      transactionQuery = {
        $and: [notSettlement, notEmptyOpening, lineMatch],
      };
    } else if (accountType === 'settlement') {
      transactionQuery.remark = /Settlement/i;
    }

    const betQuery = {
      status: { $in: [1, 2] },
      ...buildCasinoUserMatch(targetUserIds, targetUserNames),
    };

    if (accountType === 'casino') {
      // Rental / in-house casino only — GGR mirrors use casinoSource: 'ggr'
      betQuery.betType = 'casino';
      betQuery.casinoSource = { $ne: 'ggr' };
    } else if (accountType === 'all') {
      // Cowexch All: sports + rental casino; GGR comes from CasinoBetHistory
      betQuery.$and = [
        {
          $or: [
            { betType: { $ne: 'casino' } },
            { casinoSource: { $ne: 'ggr' } },
          ],
        },
      ];
    } else if (accountType === 'sports') {
      betQuery.betType = { $ne: 'casino' };
    } else if (gameType === 'casino') {
      betQuery.betType = 'casino';
      betQuery.casinoSource = { $ne: 'ggr' };
    } else if (gameType === 'sports') {
      betQuery.betType = { $ne: 'casino' };
    }

    if (marketName) betQuery.marketName = { $regex: marketName, $options: 'i' };
    if (sportsName && sportsName !== 'all') {
      betQuery.gameName = { $regex: sportsName, $options: 'i' };
    }
    if (sportsGameType && sportsGameType !== 'all') {
      const gt = String(sportsGameType).toLowerCase().replace(/[\s_-]/g, '');
      if (gt === 'matchodds') {
        betQuery.gameType = { $regex: '^Match\\s*Odds$', $options: 'i' };
      } else if (gt === 'bookmaker') {
        betQuery.gameType = { $regex: 'bookmaker', $options: 'i' };
      } else if (gt === 'fancy' || gt === 'fancy1') {
        // "Normal" session markets are fancy-style in this stack
        betQuery.gameType = {
          $regex: gt === 'fancy1' ? 'fancy\\s*1|^fancy1$' : 'fancy|^normal$',
          $options: 'i',
        };
      } else if (gt === 'oddeven') {
        betQuery.gameType = { $regex: 'odd\\s*even|oddeven', $options: 'i' };
      } else if (gt === 'toss') {
        betQuery.gameType = { $regex: 'toss', $options: 'i' };
      } else {
        betQuery.gameType = { $regex: sportsGameType, $options: 'i' };
      }
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
          // Deposit report: txns I made on downline wallets are stored as their
          // deposit/withdraw. Flip so MY statement shows give=Debit, take=Credit.
          credit: depositSubjectName
            ? {
                $cond: [
                  { $eq: ['$from', depositSubjectName] },
                  { $toDouble: { $ifNull: ['$withdrawl', 0] } },
                  { $toDouble: { $ifNull: ['$deposite', 0] } },
                ],
              }
            : { $toDouble: { $ifNull: ['$deposite', 0] } },
          debit: depositSubjectName
            ? {
                $cond: [
                  { $eq: ['$from', depositSubjectName] },
                  { $toDouble: { $ifNull: ['$deposite', 0] } },
                  { $toDouble: { $ifNull: ['$withdrawl', 0] } },
                ],
              }
            : { $toDouble: { $ifNull: ['$withdrawl', 0] } },
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
              '/',
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
          // Real wallet balance after this deposit/withdraw (when stored)
          balanceAfter: {
            $cond: [
              { $ne: [{ $type: '$balanceAfter' }, 'missing'] },
              { $toDouble: '$balanceAfter' },
              null,
            ],
          },
          userId: { $ifNull: ['$userId', ''] },
          sourceId: '$_id',
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
          balanceAfter: {
            $toDouble: { $ifNull: ['$balanceAfterSettlement', null] },
          },
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
          balanceAfter: 1,
          category: {
            $cond: [{ $eq: ['$betType', 'casino'] }, 'Casino', 'Sports'],
          },
        },
      },
    ];

    // All passbook includes GGR casino; Casino Report is rental-only (no GGR)
    const includeLiveCasinoHistory =
      accountType === 'all' ||
      (accountType !== 'casino' &&
        accountType !== 'thirdparty' &&
        gameType === 'casino');

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
          userId: { $ifNull: ['$userId', ''] },
          fromto: { $ifNull: ['$userName', ''] },
          userName: { $ifNull: ['$userName', ''] },
          type: { $literal: 'casino' },
          balanceAfter: {
            $toDouble: { $ifNull: ['$wallet_after', null] },
          },
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
          userId: 1,
          credit: { $cond: [{ $gt: ['$pl', 0] }, '$pl', 0] },
          debit: { $cond: [{ $lt: ['$pl', 0] }, { $abs: '$pl' }, 0] },
          fromto: 1,
          userName: 1,
          type: 1,
          betAmount: '$bet_amount',
          price: { $literal: 0 },
          xValue: { $literal: 0 },
          balanceAfter: 1,
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
      // Rental / in-house casino only (betHistory) — not GGR CasinoBetHistory
      mainColl = betHistoryModel;
      pipeline = [...betPipeline, { $sort: { date: 1 } }];
    } else if (accountType === 'thirdparty') {
      // GGR / third-party casino only (CasinoBetHistory)
      mainColl = CasinoBetHistory;
      pipeline = [...casinoBetPipeline, { $sort: { date: 1 } }];
    } else {
      mainColl = betHistoryModel;
      pipeline = [...betPipeline, { $sort: { date: 1 } }];
    }

    const needsGameReportExpand =
      accountType === 'sports' ||
      accountType === 'all' ||
      accountType === 'casino' ||
      accountType === 'thirdparty';

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

    // Sports/Casino = betting P/L from 0.
    // Deposit/Withdraw = running total of shown deposit rows from 0 (cowexch).
    // All = OPENING PTS (0) + deposits + own/downline game reports (book side).
    const isPlStatement =
      accountType === 'sports' ||
      accountType === 'casino' ||
      accountType === 'thirdparty';
    const isDepositStatement = accountType === 'deposit';
    const isAllStatement = accountType === 'all';
    const useZeroOpening = isPlStatement || isDepositStatement || isAllStatement;

    let ledgerOpening = currentBalance;
    let ledgerClosingBalance = currentBalance;
    if (useZeroOpening) {
      ledgerOpening = 0;
      ledgerClosingBalance = 0;
    } else if (dateFilter && startDate && endDate) {
      [ledgerOpening, ledgerClosingBalance] = await Promise.all([
        getLedgerBalanceAtTimestamp(targetUserIds, startDate, 'opening'),
        getLedgerBalanceAtTimestamp(targetUserIds, endDate, 'closing'),
      ]);
    }

    // Drop leftover empty opening-balance placeholders if any slipped through
    allRowsForClosing = allRowsForClosing.filter((row) => {
      const desc = String(row.description || '').trim();
      const isOpeningPlaceholder = /^opening\s*balance$/i.test(desc);
      if (!isOpeningPlaceholder) return true;
      return Number(row.credit || 0) !== 0 || Number(row.debit || 0) !== 0;
    });

    // Sports / Casino / Third-party: resolve book subject (searched client or self)
    // so downline bets show as cowexch partnership share, not raw client P/L.
    if (isPlStatement && !statementSubjectId) {
      let subject = null;
      if (userName && canSearchByClient) {
        subject = await SubAdmin.findOne({
          userName,
          status: { $ne: 'delete' },
        }).lean();
      } else {
        subject = await SubAdmin.findById(id).lean();
      }
      if (!subject) {
        return res.status(404).json({
          success: false,
          message: 'User not found for account statement',
        });
      }
      statementSubjectId = subject._id.toString();
      depositSubjectName = subject.userName;
    }

    if ((isAllStatement || isPlStatement) && statementSubjectId) {
      // Downline bets = viewer partnership share (cowexch My book).
      // e.g. user +100 @ 40% keep → agent −40; user −100 → agent +40.
      const subjectAdmin = await SubAdmin.findById(statementSubjectId, {
        code: 1,
        invite: 1,
        role: 1,
        userName: 1,
        partnership: 1,
        casinoPartnership: 1,
        ggrPercentage: 1,
      }).lean();

      let byCode = new Map();
      let byId = new Map();
      if (subjectAdmin?.code) {
        if (cachedStatementMaps?.byCode) {
          byCode = cachedStatementMaps.byCode;
          byId = new Map(
            (cachedStatementMaps.treeMembers || []).map((m) => [
              String(m._id),
              m,
            ])
          );
        } else {
          const downlineIds =
            cachedDownlineIds ||
            (await getAllDownlineMemberIds(SubAdmin, statementSubjectId));
          const memberIds = [
            ...new Set([
              ...downlineIds,
              ...allRowsForClosing
                .map((r) => String(r.userId || ''))
                .filter(Boolean),
            ]),
          ];
          const maps = await buildAccountByCodeForStatement(
            subjectAdmin,
            memberIds
          );
          byCode = maps.byCode;
          byId = maps.byId;
          for (const m of maps.treeMembers) {
            if (m.userName) byId.set(String(m.userName).toLowerCase(), m);
          }
        }
        for (const m of byId.values()) {
          if (m?.userName) byId.set(String(m.userName).toLowerCase(), m);
        }
      }

      for (const row of allRowsForClosing) {
        const isGameRow =
          row.type === 'bet' ||
          row.type === 'casino' ||
          row.type === 'commission';
        if (!isGameRow) continue;

        // Preserve client wallet delta before partnership share rewrite
        row.walletDelta = roundMoney(
          Number(row.credit || 0) - Number(row.debit || 0)
        );

        const rowUserId = String(row.userId || '');
        const isDownlineBet =
          rowUserId &&
          rowUserId !== String(statementSubjectId) &&
          String(row.userName || '') !== String(depositSubjectName || '');

        if (isDownlineBet) {
          const clientPl = roundMoney(
            Number(row.credit || 0) - Number(row.debit || 0)
          );

          const userDoc =
            byId.get(rowUserId) ||
            byId.get(String(row.userName || '').toLowerCase());

          // Match Account List "My Profit/Loss" (sports partnership).
          // Only true GGR rows (CasinoBetHistory) use casino/GGR keep %.
          // Our-casino (Lucky5 etc. in betHistory) uses sports keep %.
          const isGgrCasinoRow =
            row.type === 'casino' || row.sourceType === 'casino';
          const shareGameType = isGgrCasinoRow ? 'casino' : 'sports';

          let share = roundMoney(-clientPl);
          if (subjectAdmin?.code && userDoc?.role === 'user') {
            share = getViewerShareOfUserClientPL(
              subjectAdmin.code,
              userDoc,
              byCode,
              clientPl,
              shareGameType
            );
          }

          row.pl = share;
          row.credit = share > 0 ? share : 0;
          row.debit = share < 0 ? Math.abs(share) : 0;
          row.walletDelta = share;
          row.balanceAfter = null;
        }
        // Cowexch: game rows leave Fromto empty
        row.fromto = '';
        row.userName = '';
      }

      const openingDate =
        startDate && dateFilter?.$gte
          ? dateFilter.$gte
          : startDate
            ? new Date(startDate)
            : new Date();

      allRowsForClosing.unshift({
        date: openingDate,
        credit: 0,
        debit: 0,
        closing: 0,
        description: 'OPENING PTS',
        fromto: '',
        userName: '',
        type: 'opening',
        category: 'Opening',
        sourceType: 'opening',
        sourceId: 'opening-pts',
      });

      // Clear snapshots so closing math stays consistent.
      for (const row of allRowsForClosing) {
        row.balanceAfter = null;
        if (row.type !== 'opening') delete row.closing;
      }
      if (isAllStatement) {
        // Newest Closing = live wallet (users) / Available With P/L (agents).
        assignStatementRowClosings(allRowsForClosing, 0, {
          currentBalance: Number(currentBalance || 0),
          subjectUserId: null,
        });
      } else {
        // Sports / Casino / Third-party: P/L running total from OPENING 0
        assignStatementRowClosings(allRowsForClosing, 0, {
          currentBalance: null,
          subjectUserId: null,
        });
      }
    } else if (isDepositStatement) {
      // Cowexch Deposit/Withdraw: running total from 0 (ignore wallet snapshots /
      // Available With P/L — those made 1000−500 show as 460).
      for (const row of allRowsForClosing) {
        row.balanceAfter = null;
        delete row.closing;
      }
      assignStatementRowClosings(allRowsForClosing, 0, {
        currentBalance: null,
        subjectUserId: null,
      });
    } else {
      assignStatementRowClosings(allRowsForClosing, ledgerOpening, {
        currentBalance,
        subjectUserId: statementSubjectId || targetUserIds?.[0] || null,
      });
    }

    if (useZeroOpening) {
      if (isAllStatement) {
        // Match Active Users balance / Available With P/L
        ledgerClosingBalance = Number((currentBalance || 0).toFixed(2));
      } else if (isDepositStatement || isPlStatement) {
        const chrono = [...allRowsForClosing].sort((a, b) => {
          const ta = new Date(a.date || 0).getTime();
          const tb = new Date(b.date || 0).getTime();
          return ta - tb;
        });
        const last = chrono[chrono.length - 1];
        ledgerClosingBalance = Number(last?.closing ?? 0);
      } else {
        ledgerClosingBalance = Number((currentBalance || 0).toFixed(2));
      }
    }
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

    const allowedIdSet = new Set(
      normalizeUserIdsForQuery(allowedUserIds).map((id) => String(id))
    );
    const canViewUser = (userId) =>
      userId != null && allowedIdSet.has(String(userId));

    let bet = null;
    let resolvedSourceType = sourceType;

    if (sourceType === 'casino' && sourceId) {
      bet = await CasinoBetHistory.findById(sourceId).lean();
      // Our-casino rows often share category "Casino" but live in betHistory
      if (!bet) {
        bet = await betHistoryModel.findById(sourceId).lean();
        if (bet) resolvedSourceType = 'sports';
      }
    } else if (sourceId) {
      bet = await betHistoryModel.findById(sourceId).lean();
      resolvedSourceType = 'sports';
      if (!bet) {
        bet = await CasinoBetHistory.findById(sourceId).lean();
        if (bet) resolvedSourceType = 'casino';
      }
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

    // Always include the clicked bet; optionally expand to same market/round
    let relatedBets = [bet];
    if (resolvedSourceType !== 'casino') {
      const marketQuery = {
        status: { $in: [1, 2, 3] },
        userId: { $in: [...allowedIdSet] },
      };
      if (bet.gameId) marketQuery.gameId = bet.gameId;
      if (bet.roundId) marketQuery.roundId = bet.roundId;
      else {
        if (bet.eventName) marketQuery.eventName = bet.eventName;
        if (bet.marketName) marketQuery.marketName = bet.marketName;
        if (bet.gameType) marketQuery.gameType = bet.gameType;
      }

      try {
        const siblings = await betHistoryModel
          .find(marketQuery)
          .sort({ settledAt: -1, date: -1 })
          .limit(200)
          .lean();
        if (siblings.length) relatedBets = siblings;
      } catch {
        relatedBets = [bet];
      }
    }

    const userNames = [
      ...new Set(relatedBets.map((b) => b.userName).filter(Boolean)),
    ];
    const users = await SubAdmin.find(
      { userName: { $in: userNames } },
      { userName: 1, lastIP: 1 }
    ).lean();
    const ipByUser = new Map(
      users.map((u) => [String(u.userName), u.lastIP || '-'])
    );

    const formatted = relatedBets.map((b) =>
      formatMarketBetForModal(
        b,
        ipByUser.get(String(b.userName)) || '-',
        resolvedSourceType
      )
    );

    const totalCount = formatted.length;
    const start = (pageNum - 1) * limitNum;
    const pageRows = formatted.slice(start, start + limitNum);

    return res.status(200).json({
      success: true,
      data: pageRows,
      pagination: {
        total: totalCount,
        page: pageNum,
        pages: Math.ceil(totalCount / limitNum) || 0,
      },
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
