import SubAdmin from '../../models/subAdminModel.js';
import betHistoryModel from '../../models/betHistoryModel.js';
import CasinoBetHistory from '../../models/casinoBetHistory.model.js';
import DepositHistory from '../../models/depositeHistoryModel.js';
import LoginHistory from '../../models/loginHistory.js';
import {
  getAllDownlineMemberIds,
  normalizeUserIdsForQuery,
} from '../../utils/accountStatementUtils.js';

const toMapSum = (rows, idKey = '_id', valueKey = 'total') => {
  const map = new Map();
  for (const row of rows) {
    map.set(String(row[idKey]), Number(row[valueKey] || 0));
  }
  return map;
};

const toMapDates = (rows) => {
  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), {
      first: row.firstDate || null,
      last: row.lastDate || null,
      total: Number(row.total || 0),
    });
  }
  return map;
};

/**
 * User Register Detail (cowexch-style)
 */
export const getRegisterDetailReport = async (req, res) => {
  try {
    const { id, role } = req;
    const { searchQuery = '', type = 'all' } = req.query;

    const requester = await SubAdmin.findById(id, {
      _id: 1,
      code: 1,
      userName: 1,
      role: 1,
    }).lean();

    if (!requester) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    const isSuperAdmin = role === 'supperadmin' || role === 'superadmin';
    let memberIds = [];

    if (isSuperAdmin) {
      const all = await SubAdmin.find(
        {
          status: { $ne: 'delete' },
          role: 'user',
        },
        { _id: 1 }
      ).lean();
      memberIds = all.map((u) => String(u._id));
    } else {
      const downlineIds = await getAllDownlineMemberIds(SubAdmin, id);
      memberIds = downlineIds.map(String);
    }

    if (memberIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const userFilter = {
      _id: { $in: memberIds },
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
      userName: 1,
      invite: 1,
      role: 1,
      createdAt: 1,
      lastLogin: 1,
      balance: 1,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (users.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const inviteCodes = [
      ...new Set(users.map((u) => u.invite).filter(Boolean)),
    ];
    const agents = inviteCodes.length
      ? await SubAdmin.find(
          { code: { $in: inviteCodes } },
          { code: 1, userName: 1 }
        ).lean()
      : [];
    const agentByCode = new Map(
      agents.map((a) => [String(a.code), a.userName])
    );

    const userIds = users.map((u) => String(u._id));
    const userNames = users.map((u) => u.userName).filter(Boolean);
    const userIdMatch = normalizeUserIdsForQuery(userIds);

    const [
      sportsAgg,
      rentalCasinoAgg,
      thirdPartyAgg,
      depositHistAgg,
      loginAgg,
    ] = await Promise.all([
      betHistoryModel.aggregate([
        {
          $match: {
            status: { $in: [1, 2] },
            betType: { $ne: 'casino' },
            $or: [
              { userId: { $in: userIdMatch } },
              { userName: { $in: userNames } },
            ],
          },
        },
        {
          $group: {
            _id: { $toString: '$userId' },
            total: {
              $sum: { $toDouble: { $ifNull: ['$profitLossChange', 0] } },
            },
            userName: { $first: '$userName' },
          },
        },
      ]),
      betHistoryModel.aggregate([
        {
          $match: {
            status: { $in: [1, 2] },
            betType: 'casino',
            casinoSource: { $ne: 'ggr' },
            $or: [
              { userId: { $in: userIdMatch } },
              { userName: { $in: userNames } },
            ],
          },
        },
        {
          $group: {
            _id: { $toString: '$userId' },
            total: {
              $sum: { $toDouble: { $ifNull: ['$profitLossChange', 0] } },
            },
            userName: { $first: '$userName' },
          },
        },
      ]),
      CasinoBetHistory.aggregate([
        {
          $match: {
            $or: [
              { userId: { $in: userIds } },
              { userName: { $in: userNames } },
            ],
          },
        },
        {
          $group: {
            _id: { $toString: '$userId' },
            total: {
              $sum: {
                $subtract: [
                  { $toDouble: { $ifNull: ['$win_amount', 0] } },
                  { $toDouble: { $ifNull: ['$bet_amount', 0] } },
                ],
              },
            },
            userName: { $first: '$userName' },
          },
        },
      ]),
      DepositHistory.aggregate([
        { $match: { userName: { $in: userNames } } },
        {
          $group: {
            _id: '$userName',
            firstDate: { $min: '$createdAt' },
            lastDate: { $max: '$createdAt' },
            total: { $sum: { $toDouble: { $ifNull: ['$amount', 0] } } },
          },
        },
      ]),
      LoginHistory.aggregate([
        {
          $match: {
            $or: [
              { userId: { $in: userIds } },
              { userName: { $in: userNames } },
            ],
          },
        },
        {
          $group: {
            _id: {
              $ifNull: ['$userName', { $toString: '$userId' }],
            },
            lastLogin: { $max: '$createdAt' },
          },
        },
      ]),
    ]);

    const sportsById = toMapSum(sportsAgg);
    const casinoById = toMapSum(rentalCasinoAgg);
    const thirdPartyById = toMapSum(thirdPartyAgg);
    const depositByName = toMapDates(depositHistAgg);
    const loginByKey = new Map(
      loginAgg.map((r) => [String(r._id), r.lastLogin])
    );

    const sportsByName = new Map(
      sportsAgg
        .filter((r) => r.userName)
        .map((r) => [String(r.userName), Number(r.total || 0)])
    );
    const casinoByName = new Map(
      rentalCasinoAgg
        .filter((r) => r.userName)
        .map((r) => [String(r.userName), Number(r.total || 0)])
    );
    const thirdPartyByName = new Map(
      thirdPartyAgg
        .filter((r) => r.userName)
        .map((r) => [String(r.userName), Number(r.total || 0)])
    );

    const pick = (byId, byName, user) => {
      const idKey = String(user._id);
      if (byId.has(idKey)) return byId.get(idKey);
      if (user.userName && byName.has(user.userName)) {
        return byName.get(user.userName);
      }
      return 0;
    };

    const rows = users.map((user) => {
      const idKey = String(user._id);
      const dep = depositByName.get(user.userName) || {
        first: null,
        last: null,
        total: 0,
      };
      const depositTotal = Number(dep.total || 0);

      const sportsBalance = Number(
        pick(sportsById, sportsByName, user).toFixed(2)
      );
      const casinoBalance = Number(
        pick(casinoById, casinoByName, user).toFixed(2)
      );
      const thirdPartyBalance = Number(
        pick(thirdPartyById, thirdPartyByName, user).toFixed(2)
      );

      const lastLoginDate =
        user.lastLogin ||
        loginByKey.get(user.userName) ||
        loginByKey.get(idKey) ||
        null;

      return {
        userName: user.userName,
        agentName: agentByCode.get(String(user.invite || '')) || '-',
        role: user.role,
        createdDate: user.createdAt || null,
        lastLoginDate,
        firstDepositDate: dep.first || null,
        lastDepositDate: dep.last || null,
        deposit: depositTotal,
        depositLabel: depositTotal > 0 ? depositTotal : 'No Deposit',
        sportsBalance,
        casinoBalance,
        thirdPartyBalance,
        sportBookBalance: 0,
        sportsPL: sportsBalance,
        casinoPL: casinoBalance,
      };
    });

    const filteredByType =
      type === 'createdDate'
        ? rows.filter((row) => row.createdDate)
        : type === 'lastLoginDate'
          ? rows.filter((row) => row.lastLoginDate)
          : rows;

    return res.status(200).json({
      success: true,
      data: filteredByType,
    });
  } catch (error) {
    console.error('Error fetching register detail report:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
