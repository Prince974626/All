import mongoose from 'mongoose';

import betHistoryModel from '../models/betHistoryModel.js';
import betModel from '../models/betModel.js';
import CasinoBetHistory from '../models/casinoBetHistory.model.js';
import SubAdmin from '../models/subAdminModel.js';
import TransactionHistory from '../models/transtionHistoryModel.js';
import { calculateAllExposure } from './exposureUtils.js';
import {
  isMatchOddsBetRecord,
  parseCommissionPercent,
  resolveMatchOddsWinCommission,
} from './partnershipCommissionUtils.js';

const INVALID_TARGET_IDS = new Set(['non_existent_user', 'no_downline_users']);

const roundMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return parseFloat(n.toFixed(2));
};

export const formatSettlementAmount = (value) => {
  const n = roundMoney(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

export const formatSettlementDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** e.g. Settlement on 05/31/2026 23:21:48 by hero87 : (103003.09) hero87 received cash from mike999 */
export const formatSettlementDescription = ({
  date,
  userName,
  from,
  to,
  deposite,
  withdrawl,
}) => {
  const dep = Number(deposite || 0);
  const wit = Number(withdrawl || 0);
  const amount = formatSettlementAmount(dep > 0 ? dep : wit);
  const dateStr = formatSettlementDate(date);
  const actor = userName || '-';
  const fromName = from || '-';
  const toName = to || '-';

  const action =
    dep > 0
      ? `${toName} paid cash to ${fromName}`
      : `${toName} received cash from ${fromName}`;

  return `Settlement on ${dateStr} by ${actor} : (${amount}) ${action}`;
};

/** e.g. hero87 -> mike999 or apptesting123 -> mike999 */
export const formatSettlementFromTo = ({ from, to, deposite }) => {
  const fromName = from || '-';
  const toName = to || '-';
  return Number(deposite || 0) > 0
    ? `${fromName} -> ${toName}`
    : `${toName} -> ${fromName}`;
};

/** e.g. Indian Premier League/Sunrisers Hyderabad v Rajasthan Royals/Match Odds/Rajasthan Royals */
export const formatGameReportPath = (parts) =>
  parts
    .map((p) => String(p ?? '').trim())
    .filter((p) => p && p !== '-')
    .join('/');

export const formatSportsBetDescription = ({
  gameName,
  eventName,
  marketName,
  teamName,
  fancyScore,
  betResult,
}) => {
  const hasFancyScore =
    fancyScore !== undefined &&
    fancyScore !== null &&
    String(fancyScore) !== '' &&
    String(fancyScore) !== '0';

  const trimmedMarketName = String(marketName || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const trimmedTeamName = String(teamName || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  let selection = teamName || '';
  if (
    trimmedMarketName &&
    (trimmedMarketName === trimmedTeamName ||
      trimmedMarketName.startsWith(trimmedTeamName) ||
      trimmedTeamName.startsWith(trimmedMarketName))
  ) {
    selection = '';
  }

  if (hasFancyScore) {
    if (selection) {
      selection = `${selection} / ${fancyScore}`;
    } else {
      selection = String(fancyScore);
    }
  }

  const basePath = formatGameReportPath([
    gameName,
    eventName,
    marketName,
    selection,
  ]);
  if (betResult && String(betResult).trim() !== '') {
    return `${basePath} (Result : ${String(betResult).toUpperCase().trim()})`;
  }
  return basePath;
};

/** e.g. SPRIBE/CASINO/CASINO/0 */
export const formatCasinoBetDescription = ({ game_name, game_uid }) => {
  const provider = String(game_name || game_uid || 'Casino')
    .trim()
    .toUpperCase();
  return `${provider}/CASINO/CASINO/${game_uid ?? '0'}`;
};

const stripGameReportFields = (row) => {
  delete row.gameName;
  delete row.eventName;
  delete row.marketName;
  delete row.teamName;
  delete row.fancyScore;
  delete row.gameType;
  delete row.pl;
  delete row.game_name;
  delete row.game_uid;
  delete row._id;
  return row;
};

export const formatMarketBetForModal = (
  bet,
  clientIp,
  sourceType = 'sports'
) => {
  if (sourceType === 'casino') {
    const pl =
      Number(bet.win_amount || 0) - Number(bet.bet_amount || 0) ||
      Number(bet.change || 0);
    return {
      userName: bet.userName,
      competition: String(
        bet.game_name || bet.game_uid || 'Casino'
      ).toUpperCase(),
      eventName: 'CASINO',
      marketName: 'CASINO',
      runner: bet.game_uid ?? '0',
      side: '-',
      line: '-',
      rate: '-',
      amount: Number(bet.bet_amount || 0).toFixed(2),
      profitLoss: pl.toFixed(2),
      status: pl >= 0 ? 'WON' : 'LOST',
      clientIp: clientIp || '-',
      date: bet.processedAt || bet.createdAt,
      otype: '',
    };
  }

  const statusMap = { 1: 'WON', 2: 'LOST', 3: 'VOID' };
  const pl = Number(bet.profitLossChange || 0);
  const fancyLine =
    bet.fancyScore !== undefined &&
    fancyScore !== null &&
    String(bet.fancyScore) !== '' &&
    String(bet.fancyScore) !== '0'
      ? String(bet.fancyScore)
      : '-';

  const isBack = String(bet.otype).toLowerCase() === 'back';
  const stake = isBack ? Number(bet.price || 0) : Number(bet.betAmount || 0);
  const odds = Number(bet.xValue || 0);

  return {
    userName: bet.userName,
    competition: bet.gameName || '-',
    eventName: bet.eventName || '-',
    marketName: bet.marketName || '-',
    runner: bet.teamName || fancyLine,
    side: bet.otype || '-',
    line: fancyLine,
    rate: odds > 0 ? odds.toFixed(2) : '-',
    amount: stake.toFixed(2),
    profitLoss: pl.toFixed(2),
    status: statusMap[bet.status] || bet.betResult || '-',
    clientIp: clientIp || '-',
    date: bet.settledAt || bet.date || bet.createdAt,
    otype: bet.otype || '',
  };
};

export const parseGameReportDescription = (description = '') => {
  const raw = String(description)
    .replace(/^Commission:\s*/i, '')
    .trim();
  const parts = raw
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 4 && parts[1] === 'CASINO') {
    return {
      gameName: parts[0],
      eventName: parts[1],
      marketName: parts[2],
      runner: parts[3],
      isCasino: true,
    };
  }
  return {
    gameName: parts[0] || '',
    eventName: parts[1] || '',
    marketName: parts[2] || '',
    runner: parts[3] || '',
    isCasino: false,
  };
};

const rowChronoTime = (row) => {
  const d = new Date(row.date);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

const rowObjectIdTime = (row) => {
  const sourceId = String(row.sourceId || row._id || '');
  if (mongoose.Types.ObjectId.isValid(sourceId)) {
    return new mongoose.Types.ObjectId(sourceId).getTimestamp().getTime();
  }
  return 0;
};

export const compareStatementRowsChrono = (a, b) => {
  const diff = rowChronoTime(a) - rowChronoTime(b);
  if (diff !== 0) return diff;
  const idDiff = rowObjectIdTime(a) - rowObjectIdTime(b);
  if (idDiff !== 0) return idDiff;
  const typeOrder = { txn: 0, bet: 1, commission: 2, casino: 3 };
  const typeDiff = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
  if (typeDiff !== 0) return typeDiff;
  return String(a.sourceId || a._id || '').localeCompare(
    String(b.sourceId || b._id || '')
  );
};

export const compareStatementRowsNewestFirst = (a, b) =>
  -compareStatementRowsChrono(a, b);

export const sortStatementRowsNewestFirst = (rows) => {
  rows.sort(compareStatementRowsNewestFirst);
  return rows;
};

export const expandGameReportRows = async (rows, options = {}) => {
  const { includeCommission = true } = options;
  const betUserIds = [
    ...new Set(
      rows
        .filter((r) => r.type === 'bet')
        .map((r) => r.userId)
        .filter(Boolean)
    ),
  ];

  const commMap = new Map();
  if (betUserIds.length > 0) {
    const users = await SubAdmin.find(
      { _id: { $in: betUserIds } },
      { commition: 1 }
    ).lean();
    for (const u of users) {
      commMap.set(String(u._id), parseCommissionPercent(u.commition));
    }
  }

  const out = [];
  for (const row of rows) {
    if (row.type === 'bet') {
      const description = formatSportsBetDescription(row);
      const sourceId = String(row.sourceId || row._id || '');
      const isBack = String(row.otype).toLowerCase() === 'back';
      const stake = isBack
        ? Number(row.price || 0)
        : Number(row.betAmount || 0);
      const odds = Number(row.xValue || 0);

      out.push(
        stripGameReportFields({
          ...row,
          description,
          sourceType: 'sports',
          sourceId,
          stake,
          odds,
        })
      );

      const pl = Number(row.pl ?? 0);
      const rate = commMap.get(String(row.userId)) || 0;
      if (
        includeCommission &&
        isMatchOddsBetRecord(row) &&
        pl > 0 &&
        rate > 0
      ) {
        const { commission } = resolveMatchOddsWinCommission(pl, rate, 1);
        if (commission > 0) {
          out.push({
            date: new Date(new Date(row.date).getTime() - 1000),
            credit: 0,
            debit: commission,
            description: `Commission: ${description}`,
            fromto: row.fromto || row.userName || '',
            userName: row.userName,
            type: 'commission',
            category: 'Sports',
            sourceType: 'sports',
            sourceId,
            stake: 0,
            odds: 0,
          });
        }
      }
      continue;
    }

    if (row.type === 'casino') {
      out.push(
        stripGameReportFields({
          ...row,
          description: formatCasinoBetDescription(row),
          sourceType: 'casino',
          sourceId: String(row.sourceId || row._id || ''),
          stake: Number(row.betAmount || 0),
          odds: 0,
        })
      );
      continue;
    }

    out.push(row);
  }

  out.sort(compareStatementRowsChrono);
  return out;
};

export const normalizeUserIdsForQuery = (targetUserIds) => {
  const out = new Set();
  for (const id of targetUserIds) {
    const s = String(id);
    out.add(s);
    if (mongoose.Types.ObjectId.isValid(s)) {
      out.add(new mongoose.Types.ObjectId(s));
    }
  }
  return [...out];
};

export const txnActivityDateExpr = {
  $ifNull: ['$createdAt', '$date'],
};

export const betActivityDateExpr = {
  $ifNull: ['$settledAt', { $ifNull: ['$date', '$createdAt'] }],
};

export const casinoActivityDateExpr = {
  $ifNull: [
    '$processedAt',
    {
      $ifNull: [
        '$provider_timestamp',
        { $ifNull: ['$updatedAt', '$createdAt'] },
      ],
    },
  ],
};

const isValidTargetIds = (targetUserIds) =>
  targetUserIds.length > 0 && !INVALID_TARGET_IDS.has(targetUserIds[0]);

const settledAtExpr = betActivityDateExpr;

const casinoSettledAtExpr = casinoActivityDateExpr;

const mapAggregateByUserId = (rows) => {
  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), Number(row.net || 0));
  }
  return map;
};

const lookupNetForUser = (aggregateRows, user) => {
  const uid = String(user._id);
  const name = user.userName ? String(user.userName) : '';
  let net = 0;
  let matched = false;
  for (const row of aggregateRows) {
    const key = String(row._id);
    if (key === uid || (name && key === name)) {
      net += Number(row.net || 0);
      matched = true;
    }
  }
  return matched ? net : null;
};

export const buildCasinoUserMatch = (targetUserIds, userNames = []) => {
  const stringIds = [...new Set(targetUserIds.map((id) => String(id)))];
  const names = [
    ...new Set((userNames || []).map((n) => String(n)).filter(Boolean)),
  ];
  const or = [];
  if (stringIds.length) or.push({ userId: { $in: stringIds } });
  if (names.length) or.push({ userName: { $in: names } });
  return or.length ? { $or: or } : { userId: { $in: [] } };
};

/** When casino history under-counts vs wallet P/L, scale casino timing from recorded rows. */
export const resolveBettingWalletAfter = (
  sportsAfter,
  casinoAfter,
  sportsTotal,
  casinoTotal,
  bettingProfitLoss
) => {
  const sportsAfterN = Number(sportsAfter || 0);
  const casinoAfterN = Number(casinoAfter || 0);
  const sportsTotalN = Number(sportsTotal || 0);
  const casinoTotalN = Number(casinoTotal || 0);
  const plTotal = Number(bettingProfitLoss || 0);
  const historyTotal = sportsTotalN + casinoTotalN;

  if (Math.abs(plTotal) <= Math.abs(historyTotal) + 0.01) {
    return sportsAfterN + casinoAfterN;
  }

  const impliedCasinoTotal = plTotal - sportsTotalN;
  if (Math.abs(casinoTotalN) < 0.01) {
    if (Math.abs(sportsTotalN) < 0.01) {
      return sportsAfterN;
    }
    const ratio = sportsAfterN / sportsTotalN;
    return sportsAfterN + impliedCasinoTotal * ratio;
  }

  const ratio = casinoAfterN / casinoTotalN;
  return sportsAfterN + impliedCasinoTotal * ratio;
};

export const getStatementRowKey = (row) =>
  [row.sourceId, row.date, row.type, row.credit, row.debit, row.description]
    .map((v) => String(v ?? ''))
    .join('|');

/** Forward ledger balance after each row from opening B/F. */
export const assignStatementRowClosings = (rows, openingBalance) => {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const chrono = [...rows].sort(compareStatementRowsChrono);
  let running = Number(openingBalance || 0);

  for (const row of chrono) {
    running += Number(row.credit || 0) - Number(row.debit || 0);
    row.closing = Number(running.toFixed(2));
  }

  return rows;
};

export const applyStatementClosingsToPaginatedRows = (
  paginatedRows,
  allRows
) => {
  const closingByKey = new Map(
    allRows.map((row) => [getStatementRowKey(row), row.closing])
  );
  for (const row of paginatedRows) {
    const closing = closingByKey.get(getStatementRowKey(row));
    if (closing !== undefined) {
      row.closing = closing;
    }
  }
  return paginatedRows;
};

export const resolvePassbookSummaryOpening = (ledgerOpening, rows) => {
  const opening = Number(ledgerOpening || 0);
  if (Math.abs(opening) > 0.01 || !Array.isArray(rows) || rows.length === 0) {
    return opening;
  }

  const first = [...rows].sort(compareStatementRowsChrono)[0];
  if (!first) return opening;

  const isOpeningDeposit =
    first.type === 'txn' &&
    Number(first.credit || 0) > 0 &&
    (first.category === 'Deposit' ||
      /opening balance/i.test(String(first.description || '')));

  return isOpeningDeposit ? Number(first.credit) : opening;
};

async function rewindWalletAtTimestamp(
  targetUserIds,
  atTime,
  boundary = 'closing',
  mode = 'av'
) {
  if (!isValidTargetIds(targetUserIds) || !atTime) return 0;

  const userIdMatch = normalizeUserIdsForQuery(targetUserIds);
  const userFields =
    mode === 'ledger'
      ? { baseBalance: 1, balance: 1, bettingProfitLoss: 1, userName: 1 }
      : { avbalance: 1, bettingProfitLoss: 1, userName: 1 };
  const users = await SubAdmin.find(
    { _id: { $in: targetUserIds } },
    userFields
  ).lean();
  const userNames = users.map((u) => u.userName).filter(Boolean);
  const casinoUserMatch = buildCasinoUserMatch(targetUserIds, userNames);

  const at = new Date(atTime);
  const afterBalanceFilter =
    boundary === 'opening' ? { $gte: at } : { $gt: at };

  const [
    txnByUser,
    sportsAfterByUser,
    casinoAfterByUser,
    sportsTotalByUser,
    casinoTotalByUser,
    currentOpenBets,
    openBets,
  ] = await Promise.all([
    TransactionHistory.aggregate([
      { $match: { userId: { $in: userIdMatch } } },
      { $addFields: { activityDate: txnActivityDateExpr } },
      { $match: { activityDate: afterBalanceFilter } },
      {
        $group: {
          _id: '$userId',
          net: {
            $sum: {
              $subtract: [
                { $toDouble: { $ifNull: ['$deposite', 0] } },
                { $toDouble: { $ifNull: ['$withdrawl', 0] } },
              ],
            },
          },
        },
      },
    ]),
    betHistoryModel.aggregate([
      {
        $match: {
          userId: { $in: userIdMatch },
          status: { $in: [1, 2] },
          betType: { $ne: 'casino' },
        },
      },
      { $addFields: { settledAtResolved: settledAtExpr } },
      { $match: { settledAtResolved: afterBalanceFilter } },
      {
        $group: {
          _id: '$userId',
          net: { $sum: { $toDouble: { $ifNull: ['$profitLossChange', 0] } } },
        },
      },
    ]),
    CasinoBetHistory.aggregate([
      { $match: casinoUserMatch },
      { $addFields: { settledAtResolved: casinoSettledAtExpr } },
      { $match: { settledAtResolved: afterBalanceFilter } },
      {
        $group: {
          _id: '$userId',
          net: {
            $sum: {
              $subtract: [
                { $toDouble: { $ifNull: ['$win_amount', 0] } },
                { $toDouble: { $ifNull: ['$bet_amount', 0] } },
              ],
            },
          },
        },
      },
    ]),
    betHistoryModel.aggregate([
      {
        $match: {
          userId: { $in: userIdMatch },
          status: { $in: [1, 2] },
          betType: { $ne: 'casino' },
        },
      },
      {
        $group: {
          _id: '$userId',
          net: { $sum: { $toDouble: { $ifNull: ['$profitLossChange', 0] } } },
        },
      },
    ]),
    CasinoBetHistory.aggregate([
      { $match: casinoUserMatch },
      {
        $group: {
          _id: '$userId',
          net: {
            $sum: {
              $subtract: [
                { $toDouble: { $ifNull: ['$win_amount', 0] } },
                { $toDouble: { $ifNull: ['$bet_amount', 0] } },
              ],
            },
          },
        },
      },
    ]),
    mode === 'av'
      ? betModel
          .find({ userId: { $in: userIdMatch }, status: 0 })
          .select(
            'userId price betAmount otype gameType teamName marketName xValue status'
          )
          .lean()
      : Promise.resolve([]),
    mode === 'av'
      ? betModel
          .find(
            boundary === 'opening'
              ? {
                  userId: { $in: userIdMatch },
                  createdAt: { $lt: at },
                  $or: [{ status: 0 }, { settledAt: { $gte: at } }],
                }
              : {
                  userId: { $in: userIdMatch },
                  createdAt: { $lte: at },
                  $or: [{ status: 0 }, { settledAt: { $gt: at } }],
                }
          )
          .select(
            'userId price betAmount otype gameType teamName marketName xValue status'
          )
          .lean()
      : Promise.resolve([]),
  ]);

  const txnMap = mapAggregateByUserId(txnByUser);
  const sportsMap = mapAggregateByUserId(sportsAfterByUser);
  const casinoMap = mapAggregateByUserId(casinoAfterByUser);
  const sportsTotalMap = mapAggregateByUserId(sportsTotalByUser);
  const casinoTotalMap = mapAggregateByUserId(casinoTotalByUser);

  const currentExposureByUser = new Map();
  for (const bet of currentOpenBets) {
    const uid = String(bet.userId);
    if (!currentExposureByUser.has(uid)) currentExposureByUser.set(uid, []);
    currentExposureByUser.get(uid).push(bet);
  }

  const openBetsByUser = new Map();
  for (const bet of openBets) {
    const uid = String(bet.userId);
    if (!openBetsByUser.has(uid)) openBetsByUser.set(uid, []);
    openBetsByUser.get(uid).push(bet);
  }

  let total = 0;
  for (const user of users) {
    const uid = String(user._id);
    const txnNet = txnMap.get(uid) || 0;
    const sportsNet = sportsMap.get(uid) || 0;
    const casinoNet =
      lookupNetForUser(casinoAfterByUser, user) ?? casinoMap.get(uid) ?? 0;
    const sportsTotal = sportsTotalMap.get(uid) || 0;
    const casinoTotal =
      lookupNetForUser(casinoTotalByUser, user) ?? casinoMap.get(uid) ?? 0;
    const bettingWalletAfter = resolveBettingWalletAfter(
      sportsNet,
      casinoNet,
      sportsTotal,
      casinoTotal,
      user.bettingProfitLoss
    );

    if (mode === 'ledger') {
      const currentLedger =
        Number(user.baseBalance ?? user.balance ?? 0) +
        Number(user.bettingProfitLoss || 0);
      total += currentLedger - txnNet - bettingWalletAfter;
      continue;
    }

    const exposureNow = calculateAllExposure(
      currentExposureByUser.get(uid) || []
    );
    const exposureAt = calculateAllExposure(openBetsByUser.get(uid) || []);
    const avAt =
      Number(user.avbalance || 0) +
      exposureNow -
      txnNet -
      bettingWalletAfter -
      exposureAt;

    total += avAt;
  }

  return roundMoney(total);
}

export async function getLedgerBalanceAtTimestamp(
  targetUserIds,
  atTime,
  boundary = 'closing'
) {
  return rewindWalletAtTimestamp(targetUserIds, atTime, boundary, 'ledger');
}

export async function getAvbalanceAtTimestamp(
  targetUserIds,
  atTime,
  boundary = 'closing'
) {
  return rewindWalletAtTimestamp(targetUserIds, atTime, boundary, 'av');
}

export async function getAllDownlineMemberIds(SubAdmin, adminId) {
  const objectId =
    adminId instanceof mongoose.Types.ObjectId
      ? adminId
      : new mongoose.Types.ObjectId(adminId);
  const result = await SubAdmin.aggregate([
    { $match: { _id: objectId } },
    {
      $graphLookup: {
        from: 'subadmins',
        startWith: '$code',
        connectFromField: 'code',
        connectToField: 'invite',
        as: 'downline',
        restrictSearchWithMatch: { status: { $ne: 'delete' } },
      },
    },
  ]);

  // Unwrap graphLookup downline subadmins
  const downline = result[0]?.downline || [];
  return downline.map((d) => d._id.toString());
}
