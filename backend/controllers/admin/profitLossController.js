import SubAdmin from '../../models/subAdminModel.js';
import betHistoryModel from '../../models/betHistoryModel.js';
import CasinoBetHistory from '../../models/casinoBetHistory.model.js';
import {
  betActivityDateExpr,
  casinoActivityDateExpr,
  getAllDownlineMemberIds,
  normalizeUserIdsForQuery,
} from '../../utils/accountStatementUtils.js';
import { getDateRangeUTC } from '../../utils/dateUtils.js';
import {
  getAccountMyKeepPercent,
  splitProfitLossByMyShare,
} from '../../utils/partnershipCommissionUtils.js';

const formatLevel = (role = '') => {
  const r = String(role || 'user').toLowerCase();
  if (r === 'supperadmin' || r === 'superadmin') return 'Super Admin';
  if (r === 'admin') return 'Admin';
  if (r === 'master') return 'Master';
  if (r === 'super') return 'Super';
  if (r === 'white') return 'White Label';
  if (r === 'agent') return 'Agent';
  return 'User';
};

const toNetMap = (rows) => {
  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), Number(row.net || 0));
  }
  return map;
};

/**
 * Profit Loss by user (cowexch-style):
 * Casino Pts = rental/in-house casino
 * Sport Pts = sports bets
 * Third Party Pts = GGR casino (CasinoBetHistory)
 */
export const getProfitLossByUser = async (req, res) => {
  try {
    const { id } = req;
    const {
      startDate,
      endDate,
      role: roleFilter = 'all',
      searchQuery = '',
    } = req.query;

    const self = await SubAdmin.findById(id, {
      _id: 1,
      userName: 1,
      role: 1,
      status: 1,
    }).lean();

    if (!self) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const downlineIds = await getAllDownlineMemberIds(SubAdmin, id);
    const memberIdStrings = [
      ...new Set([String(id), ...downlineIds.map(String)]),
    ];

    let members = await SubAdmin.find(
      {
        _id: { $in: memberIdStrings },
        status: { $ne: 'delete' },
      },
      { _id: 1, userName: 1, role: 1 }
    ).lean();

    const roleNorm = String(roleFilter || 'all').toLowerCase();
    if (roleNorm && roleNorm !== 'all' && roleNorm !== 'all roles') {
      members = members.filter(
        (m) => String(m.role || '').toLowerCase() === roleNorm
      );
    }

    const search = String(searchQuery || '').trim().toLowerCase();
    if (search) {
      members = members.filter((m) =>
        String(m.userName || '')
          .toLowerCase()
          .includes(search)
      );
    }

    if (members.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const userIdMatch = normalizeUserIdsForQuery(
      members.map((m) => String(m._id))
    );
    const userNames = members.map((m) => m.userName).filter(Boolean);

    let dateFilter = null;
    if (startDate && endDate) {
      dateFilter = getDateRangeUTC(
        `${String(startDate).substring(0, 10)}T00:00:00`,
        `${String(endDate).substring(0, 10)}T23:59:59`
      );
    }

    const sportsMatch = {
      status: { $in: [1, 2] },
      betType: { $ne: 'casino' },
      $or: [
        { userId: { $in: userIdMatch } },
        { userName: { $in: userNames } },
      ],
    };

    const rentalCasinoMatch = {
      status: { $in: [1, 2] },
      betType: 'casino',
      casinoSource: { $ne: 'ggr' },
      $or: [
        { userId: { $in: userIdMatch } },
        { userName: { $in: userNames } },
      ],
    };

    const thirdPartyMatch = {
      $or: [
        { userId: { $in: userIdMatch.map(String) } },
        { userName: { $in: userNames } },
      ],
    };

    const groupByUser = [
      {
        $group: {
          _id: {
            $cond: [
              {
                $and: [
                  { $ne: ['$userId', null] },
                  { $ne: ['$userId', ''] },
                ],
              },
              { $toString: '$userId' },
              '$userName',
            ],
          },
          net: { $sum: '$pl' },
          userName: { $first: '$userName' },
        },
      },
    ];

    const sportsPipeline = [
      { $match: sportsMatch },
      { $addFields: { activityDate: betActivityDateExpr } },
      ...(dateFilter ? [{ $match: { activityDate: dateFilter } }] : []),
      {
        $addFields: {
          pl: { $toDouble: { $ifNull: ['$profitLossChange', 0] } },
        },
      },
      ...groupByUser,
    ];

    const rentalCasinoPipeline = [
      { $match: rentalCasinoMatch },
      { $addFields: { activityDate: betActivityDateExpr } },
      ...(dateFilter ? [{ $match: { activityDate: dateFilter } }] : []),
      {
        $addFields: {
          pl: { $toDouble: { $ifNull: ['$profitLossChange', 0] } },
        },
      },
      ...groupByUser,
    ];

    const thirdPartyPipeline = [
      { $match: thirdPartyMatch },
      { $addFields: { activityDate: casinoActivityDateExpr } },
      ...(dateFilter ? [{ $match: { activityDate: dateFilter } }] : []),
      {
        $addFields: {
          pl: {
            $subtract: [
              { $toDouble: { $ifNull: ['$win_amount', 0] } },
              { $toDouble: { $ifNull: ['$bet_amount', 0] } },
            ],
          },
        },
      },
      ...groupByUser,
    ];

    const [sportsAgg, casinoAgg, thirdPartyAgg] = await Promise.all([
      betHistoryModel.aggregate(sportsPipeline),
      betHistoryModel.aggregate(rentalCasinoPipeline),
      CasinoBetHistory.aggregate(thirdPartyPipeline),
    ]);

    const sportsById = toNetMap(sportsAgg);
    const casinoById = toNetMap(casinoAgg);
    const thirdPartyById = toNetMap(thirdPartyAgg);

    // Also index by userName for rows keyed on username fallback
    const indexByUserName = (rows) => {
      const map = new Map();
      for (const row of rows) {
        if (row.userName) map.set(String(row.userName), Number(row.net || 0));
      }
      return map;
    };
    const sportsByName = indexByUserName(sportsAgg);
    const casinoByName = indexByUserName(casinoAgg);
    const thirdPartyByName = indexByUserName(thirdPartyAgg);

    const lookup = (byId, byName, member) => {
      const idKey = String(member._id);
      if (byId.has(idKey)) return byId.get(idKey);
      if (member.userName && byName.has(member.userName)) {
        return byName.get(member.userName);
      }
      return 0;
    };

    const data = members
      .map((member) => {
        const casinoPts = Number(
          lookup(casinoById, casinoByName, member).toFixed(2)
        );
        const sportsPts = Number(
          lookup(sportsById, sportsByName, member).toFixed(2)
        );
        const thirdPartyPts = Number(
          lookup(thirdPartyById, thirdPartyByName, member).toFixed(2)
        );
        const profitLoss = Number(
          (casinoPts + sportsPts + thirdPartyPts).toFixed(2)
        );

        return {
          id: String(member._id),
          userName: member.userName,
          level: formatLevel(member.role),
          role: member.role,
          casinoPts,
          sportsPts,
          thirdPartyPts,
          profitLoss,
        };
      })
      // Always include full downline (agents/masters/users), even at 0 P/L
      .sort((a, b) => {
        if (a.id === String(id)) return -1;
        if (b.id === String(id)) return 1;
        const roleOrder = {
          supperadmin: 0,
          superadmin: 0,
          admin: 1,
          white: 2,
          super: 3,
          master: 4,
          agent: 5,
          user: 6,
        };
        const ra = roleOrder[String(a.role || '').toLowerCase()] ?? 99;
        const rb = roleOrder[String(b.role || '').toLowerCase()] ?? 99;
        if (ra !== rb) return ra - rb;
        return String(a.userName).localeCompare(String(b.userName));
      });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching profit loss by user:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * User Win Loss (cowexch-style) — downline users only:
 * Casino = rental/in-house, Sport = sports, Third Party = GGR
 */
export const getUsersWinLoss = async (req, res) => {
  try {
    const { id } = req;
    const { startDate, endDate, searchQuery = '' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    const admin = await SubAdmin.findById(id, { _id: 1, code: 1 }).lean();
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    const downlineIds = await getAllDownlineMemberIds(SubAdmin, id);
    if (!downlineIds.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const userFilter = {
      _id: { $in: downlineIds },
      status: { $ne: 'delete' },
      role: 'user',
    };
    if (String(searchQuery || '').trim()) {
      userFilter.userName = {
        $regex: String(searchQuery).trim(),
        $options: 'i',
      };
    }

    const users = await SubAdmin.find(userFilter, {
      _id: 1,
      userName: 1,
    })
      .sort({ userName: 1 })
      .lean();

    if (!users.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const userIds = users.map((u) => String(u._id));
    const userNames = users.map((u) => u.userName).filter(Boolean);
    const userIdMatch = normalizeUserIdsForQuery(userIds);
    const dateFilter = getDateRangeUTC(
      `${String(startDate).substring(0, 10)}T00:00:00`,
      `${String(endDate).substring(0, 10)}T23:59:59`
    );

    const sportsMatch = {
      status: { $in: [1, 2] },
      betType: { $ne: 'casino' },
      $or: [
        { userId: { $in: userIdMatch } },
        { userName: { $in: userNames } },
      ],
    };
    const rentalCasinoMatch = {
      status: { $in: [1, 2] },
      betType: 'casino',
      casinoSource: { $ne: 'ggr' },
      $or: [
        { userId: { $in: userIdMatch } },
        { userName: { $in: userNames } },
      ],
    };
    const thirdPartyMatch = {
      $or: [
        { userId: { $in: userIds } },
        { userName: { $in: userNames } },
      ],
    };

    const groupByUser = [
      {
        $group: {
          _id: {
            $cond: [
              {
                $and: [
                  { $ne: ['$userId', null] },
                  { $ne: ['$userId', ''] },
                ],
              },
              { $toString: '$userId' },
              '$userName',
            ],
          },
          net: { $sum: '$pl' },
          userName: { $first: '$userName' },
        },
      },
    ];

    const [sportsAgg, casinoAgg, thirdPartyAgg] = await Promise.all([
      betHistoryModel.aggregate([
        { $match: sportsMatch },
        { $addFields: { activityDate: betActivityDateExpr } },
        { $match: { activityDate: dateFilter } },
        {
          $addFields: {
            pl: { $toDouble: { $ifNull: ['$profitLossChange', 0] } },
          },
        },
        ...groupByUser,
      ]),
      betHistoryModel.aggregate([
        { $match: rentalCasinoMatch },
        { $addFields: { activityDate: betActivityDateExpr } },
        { $match: { activityDate: dateFilter } },
        {
          $addFields: {
            pl: { $toDouble: { $ifNull: ['$profitLossChange', 0] } },
          },
        },
        ...groupByUser,
      ]),
      CasinoBetHistory.aggregate([
        { $match: thirdPartyMatch },
        { $addFields: { activityDate: casinoActivityDateExpr } },
        { $match: { activityDate: dateFilter } },
        {
          $addFields: {
            pl: {
              $subtract: [
                { $toDouble: { $ifNull: ['$win_amount', 0] } },
                { $toDouble: { $ifNull: ['$bet_amount', 0] } },
              ],
            },
          },
        },
        ...groupByUser,
      ]),
    ]);

    const sportsById = toNetMap(sportsAgg);
    const casinoById = toNetMap(casinoAgg);
    const thirdPartyById = toNetMap(thirdPartyAgg);
    const byName = (rows) => {
      const map = new Map();
      for (const row of rows) {
        if (row.userName) map.set(String(row.userName), Number(row.net || 0));
      }
      return map;
    };
    const sportsByName = byName(sportsAgg);
    const casinoByName = byName(casinoAgg);
    const thirdPartyByName = byName(thirdPartyAgg);

    const lookup = (byId, byNameMap, user) => {
      const idKey = String(user._id);
      if (byId.has(idKey)) return byId.get(idKey);
      if (user.userName && byNameMap.has(user.userName)) {
        return byNameMap.get(user.userName);
      }
      return 0;
    };

    const data = users
      .map((user) => {
        const casinoPL = Number(
          lookup(casinoById, casinoByName, user).toFixed(2)
        );
        const sportsPL = Number(
          lookup(sportsById, sportsByName, user).toFixed(2)
        );
        const thirdPartyPL = Number(
          lookup(thirdPartyById, thirdPartyByName, user).toFixed(2)
        );
        const totalPL = Number(
          (casinoPL + sportsPL + thirdPartyPL).toFixed(2)
        );
        return {
          userId: String(user._id),
          userName: user.userName,
          casinoPL,
          sportsPL,
          thirdPartyPL,
          totalPL,
        };
      })
      .filter(
        (row) =>
          row.casinoPL !== 0 ||
          row.sportsPL !== 0 ||
          row.thirdPartyPL !== 0
      );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getUsersWinLoss error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

const sportLabelFromGameName = (gameName) => {
  const g = String(gameName || '')
    .toLowerCase()
    .trim();
  if (g.includes('cricket')) return 'Cricket';
  if (g.includes('tennis')) return 'Tennis';
  if (g.includes('soccer') || g.includes('football')) return 'Soccer';
  if (g.includes('basketball')) return 'Basketball';
  if (g.includes('horse')) return 'Horse Racing';
  if (g.includes('greyhound')) return 'Greyhound Racing';
  if (!g) return 'Sports';
  return String(gameName)
    .replace(/\s*game\s*$/i, '')
    .trim() || 'Sports';
};

const sportsGameTypeLabel = (bet) => {
  const blob = `${bet.gameType || ''} ${bet.marketName || ''} ${bet.fancyType || ''}`
    .toLowerCase()
    .replace(/_/g, ' ');
  if (/bookmaker/.test(blob)) return 'Bookmaker';
  if (/match\s*odds/.test(blob)) return 'Match Odds';
  if (/toss/.test(blob)) return 'Toss';
  if (
    /fancy|session|over\s*run|meter|khado|line|odd\s*even|ball\s*by\s*ball|^normal$/.test(
      blob
    ) ||
    /^normal$/i.test(String(bet.gameType || '').trim())
  ) {
    return 'Fancy';
  }
  return (
    String(bet.gameType || bet.marketName || '-')
      .trim() || '-'
  );
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Total Profit Loss (cowexch-style): Sports / Casino / Third Party tables.
 * Values are book (agent) view: opposite of client settled P/L.
 * Opening starts at 0; Closing = period P/L.
 */
export const getTotalProfitLossReport = async (req, res) => {
  try {
    const { id } = req;
    const { startDate, endDate, searchQuery = '', userName = '' } = req.query;

    const admin = await SubAdmin.findById(id, { _id: 1, code: 1 }).lean();
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    const downlineIds = await getAllDownlineMemberIds(SubAdmin, id);
    if (!downlineIds.length) {
      return res.status(200).json({
        success: true,
        data: {
          sportsReport: [],
          casinoReport: [],
          thirdPartyReport: [{ name: 'Third Party', opening: 0, closing: 0, profitLoss: 0 }],
          sportsTotal: 0,
          casinoTotal: 0,
          thirdPartyTotal: 0,
        },
      });
    }

    const userFilter = {
      _id: { $in: downlineIds },
      status: { $ne: 'delete' },
      role: 'user',
    };
    const escapeRegex = (value) =>
      String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (String(userName || '').trim()) {
      userFilter.userName = {
        $regex: `^${escapeRegex(String(userName).trim())}$`,
        $options: 'i',
      };
    } else if (String(searchQuery || '').trim()) {
      userFilter.userName = {
        $regex: String(searchQuery).trim(),
        $options: 'i',
      };
    }

    const users = await SubAdmin.find(userFilter, {
      _id: 1,
      userName: 1,
    }).lean();

    if (!users.length) {
      return res.status(200).json({
        success: true,
        data: {
          sportsReport: [],
          casinoReport: [],
          thirdPartyReport: [{ name: 'Third Party', opening: 0, closing: 0, profitLoss: 0 }],
          sportsTotal: 0,
          casinoTotal: 0,
          thirdPartyTotal: 0,
        },
      });
    }

    const userIds = users.map((u) => String(u._id));
    const userNames = users.map((u) => u.userName).filter(Boolean);
    const userIdMatch = normalizeUserIdsForQuery(userIds);

    let dateFilter = null;
    if (startDate && endDate) {
      dateFilter = getDateRangeUTC(
        `${String(startDate).substring(0, 10)}T00:00:00`,
        `${String(endDate).substring(0, 10)}T23:59:59`
      );
    }

    const sportsMatch = {
      status: { $in: [1, 2] },
      betType: { $ne: 'casino' },
      $or: [
        { userId: { $in: userIdMatch } },
        { userName: { $in: userNames } },
      ],
    };
    const rentalCasinoMatch = {
      status: { $in: [1, 2] },
      betType: 'casino',
      casinoSource: { $ne: 'ggr' },
      $or: [
        { userId: { $in: userIdMatch } },
        { userName: { $in: userNames } },
      ],
    };
    const thirdPartyMatch = {
      $or: [
        { userId: { $in: userIds } },
        { userName: { $in: userNames } },
      ],
    };

    const sportsPipeline = [{ $match: sportsMatch }];
    const casinoPipeline = [{ $match: rentalCasinoMatch }];
    const thirdPartyPipeline = [{ $match: thirdPartyMatch }];
    if (dateFilter) {
      sportsPipeline.push(
        { $addFields: { activityDate: betActivityDateExpr } },
        { $match: { activityDate: dateFilter } }
      );
      casinoPipeline.push(
        { $addFields: { activityDate: betActivityDateExpr } },
        { $match: { activityDate: dateFilter } }
      );
      thirdPartyPipeline.push(
        { $addFields: { activityDate: casinoActivityDateExpr } },
        { $match: { activityDate: dateFilter } }
      );
    }

    const [sportsBets, casinoBets, thirdPartyBets] = await Promise.all([
      betHistoryModel.aggregate(sportsPipeline),
      betHistoryModel.aggregate(casinoPipeline),
      CasinoBetHistory.aggregate(thirdPartyPipeline),
    ]);

    // Searching a client → show that user's P/L (+win).
    // Agent aggregate → My share via partnership keep % (house view × keep).
    const clientView = Boolean(
      String(userName || '').trim() || String(searchQuery || '').trim()
    );
    const adminDoc = await SubAdmin.findById(id, { partnership: 1, role: 1, invite: 1, ggrPercentage: 1 }).lean();
    const keepPct = getAccountMyKeepPercent(adminDoc || {});
    const toReportPL = (clientPL) => {
      const pl = Number(clientPL) || 0;
      if (clientView) return round2(pl);
      return splitProfitLossByMyShare(round2(-pl), keepPct).myPL;
    };

    const sportsMap = new Map();
    for (const bet of sportsBets) {
      const eventName = sportLabelFromGameName(bet.gameName);
      const gameType = sportsGameTypeLabel(bet);
      const profitLoss = toReportPL(bet.profitLossChange);
      const key = `${eventName}__${gameType}`;
      if (!sportsMap.has(key)) {
        sportsMap.set(key, {
          eventName,
          gameType,
          opening: 0,
          closing: 0,
          profitLoss: 0,
        });
      }
      const row = sportsMap.get(key);
      row.profitLoss = round2(row.profitLoss + profitLoss);
      row.closing = row.profitLoss;
    }

    const casinoMap = new Map();
    for (const bet of casinoBets) {
      const name =
        bet.eventName || bet.gameName || bet.marketName || 'Casino';
      const profitLoss = toReportPL(bet.profitLossChange);
      if (!casinoMap.has(name)) {
        casinoMap.set(name, {
          name,
          eventName: name,
          opening: 0,
          closing: 0,
          profitLoss: 0,
        });
      }
      const row = casinoMap.get(name);
      row.profitLoss = round2(row.profitLoss + profitLoss);
      row.closing = row.profitLoss;
    }

    let thirdPartyPL = 0;
    for (const bet of thirdPartyBets) {
      const clientPL =
        (Number(bet.win_amount) || 0) - (Number(bet.bet_amount) || 0);
      thirdPartyPL = round2(thirdPartyPL + toReportPL(clientPL));
    }

    const sportsReport = [...sportsMap.values()].sort((a, b) =>
      String(a.eventName).localeCompare(String(b.eventName))
    );
    const casinoReport = [...casinoMap.values()].sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );
    const thirdPartyReport = [
      {
        name: 'Third Party',
        opening: 0,
        closing: thirdPartyPL,
        profitLoss: thirdPartyPL,
      },
    ];

    const sportsTotal = round2(
      sportsReport.reduce((sum, row) => sum + Number(row.profitLoss || 0), 0)
    );
    const casinoTotal = round2(
      casinoReport.reduce((sum, row) => sum + Number(row.profitLoss || 0), 0)
    );
    const thirdPartyTotal = thirdPartyPL;

    return res.status(200).json({
      success: true,
      data: {
        sportsReport,
        casinoReport,
        thirdPartyReport,
        sportsTotal,
        casinoTotal,
        thirdPartyTotal,
      },
    });
  } catch (error) {
    console.error('getTotalProfitLossReport error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
