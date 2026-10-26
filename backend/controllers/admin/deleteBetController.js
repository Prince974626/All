import betModel from '../../models/betModel.js';
import betHistoryModel from '../../models/betHistoryModel.js';
import SubAdmin from '../../models/subAdminModel.js';
import { calculateAllExposure } from '../../utils/exposureUtils.js';
import { verifyTransactionPassword } from '../../utils/verifyTransactionPassword.js';
import {
  sendBalanceUpdates,
  sendExposureUpdates,
  sendOpenBetsUpdates,
} from '../../socket/bettingSocket.js';

const DELETED_STATUS = 4;
const OPEN_STATUS = 0;

const isSuperAdmin = (role) =>
  role === 'supperadmin' || role === 'superadmin';

const denyUnlessSuperAdmin = (req, res) => {
  if (isSuperAdmin(req.role)) return false;
  res.status(403).json({
    success: false,
    message: 'Only superadmin can delete or restore bets',
  });
  return true;
};

const casinoFilter = {
  $or: [
    { betType: 'casino' },
    { gameName: 'Casino' },
    { gameType: 'Casino' },
  ],
};

const gameFilter = (game) => {
  const kind = String(game || 'all').toLowerCase();
  if (kind === 'casino') return casinoFilter;
  if (kind === 'cricket') {
    return {
      gameName: /cricket/i,
      $nor: casinoFilter.$or,
    };
  }
  return {};
};

const applyUserExposure = async (userId, bet = null) => {
  const user = await SubAdmin.findById(userId);
  if (!user) return null;

  const pendingBets = await betModel.find({
    userId: String(userId),
    status: OPEN_STATUS,
  });
  user.exposure = calculateAllExposure(pendingBets);
  user.avbalance = Number(
    (Number(user.balance || 0) - Number(user.exposure || 0)).toFixed(2)
  );
  await user.save();

  sendExposureUpdates(String(userId), user.exposure);
  sendBalanceUpdates(String(userId), user.avbalance);
  sendOpenBetsUpdates(String(userId), {
    betId: bet?._id ? String(bet._id) : null,
    gameId: bet?.gameId || null,
    roundId: bet?.roundId || null,
    avbalance: user.avbalance,
    exposure: user.exposure,
  });

  return {
    exposure: user.exposure,
    avbalance: user.avbalance,
    balance: user.balance,
  };
};

const syncHistoryStatus = async (bet, status, extra) => {
  const id = String(bet._id);
  await betHistoryModel.updateMany(
    { $or: [{ betId: id }, { _id: bet._id }] },
    { $set: { status, ...extra } }
  );
};

export const listManageableBets = async (req, res) => {
  try {
    if (denyUnlessSuperAdmin(req, res)) return;

    const view = String(req.query.view || 'open').toLowerCase();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 300);
    const search = String(req.query.search || '').trim();

    const filter = {
      status: view === 'deleted' ? DELETED_STATUS : OPEN_STATUS,
      ...gameFilter(req.query.game),
    };
    if (search) {
      filter.userName = { $regex: search, $options: 'i' };
    }

    const [rows, total] = await Promise.all([
      betModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      betModel.countDocuments(filter),
    ]);

    const data = rows.map((bet) => ({
      ...bet,
      isDeleted: bet.status === DELETED_STATUS,
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('Error listing manageable bets:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load bets',
    });
  }
};

const requireMasterPassword = async (req, res) => {
  const password = req.body?.masterPassword;
  if (!password) {
    res.status(400).json({
      success: false,
      message: 'Master Password is required',
    });
    return false;
  }
  const admin = await SubAdmin.findById(req.id).select('+password');
  const ok = await verifyTransactionPassword(admin, password);
  if (!ok) {
    res.status(401).json({
      success: false,
      message: 'Invalid Master Password',
    });
    return false;
  }
  return true;
};

const softDeleteBet = async (bet, deletedBy) => {
  const deletedAt = new Date();
  bet.status = DELETED_STATUS;
  bet.deletedAt = deletedAt;
  bet.deletedBy = deletedBy;
  await bet.save();
  await syncHistoryStatus(bet, DELETED_STATUS, { deletedAt, deletedBy });
  return applyUserExposure(bet.userId, bet);
};

const money = (value) => Number(Number(value || 0).toFixed(2));

const restoreBalanceBlock = async (bet) => {
  const user = await SubAdmin.findById(bet.userId);
  if (!user) {
    return { ok: false, message: 'User not found', statusCode: 404 };
  }

  const openBets = await betModel.find({
    userId: String(bet.userId),
    status: OPEN_STATUS,
  });
  const nextExposure = money(calculateAllExposure([...openBets, bet]));
  const balance = money(user.balance);

  if (balance < nextExposure) {
    return {
      ok: false,
      statusCode: 400,
      message: `Not enough balance to restore this bet. Balance is ${balance} and exposure would be ${nextExposure}.`,
    };
  }
  return { ok: true };
};

const reopenBet = async (bet) => {
  bet.status = OPEN_STATUS;
  bet.deletedAt = null;
  bet.deletedBy = null;
  await bet.save();
  await syncHistoryStatus(bet, OPEN_STATUS, {
    deletedAt: null,
    deletedBy: null,
  });
  return applyUserExposure(bet.userId, bet);
};

export const deleteOpenBet = async (req, res) => {
  try {
    if (denyUnlessSuperAdmin(req, res)) return;

    const bet = await betModel.findById(req.params.id);
    if (!bet) {
      return res.status(404).json({ success: false, message: 'Bet not found' });
    }
    if (bet.status !== OPEN_STATUS) {
      return res.status(400).json({
        success: false,
        message: 'Only an open bet can be deleted',
      });
    }

    const wallet = await softDeleteBet(
      bet,
      String(req.admin || req.id || 'superadmin')
    );

    return res.status(200).json({
      success: true,
      message: 'Bet deleted. It is hidden from the user.',
      data: { betId: String(bet._id), wallet, isDeleted: true },
    });
  } catch (error) {
    console.error('Error deleting open bet:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete bet',
    });
  }
};

export const deleteOpenBetWithPassword = async (req, res) => {
  try {
    if (denyUnlessSuperAdmin(req, res)) return;
    if (!(await requireMasterPassword(req, res))) return;
    return deleteOpenBet(req, res);
  } catch (error) {
    console.error('Error deleting open bet:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete bet',
    });
  }
};

export const restoreDeletedBet = async (req, res) => {
  try {
    if (denyUnlessSuperAdmin(req, res)) return;

    const bet = await betModel.findById(req.params.id);
    if (!bet) {
      return res.status(404).json({ success: false, message: 'Bet not found' });
    }
    if (bet.status !== DELETED_STATUS) {
      return res.status(400).json({
        success: false,
        message: 'Only a deleted bet can be restored',
      });
    }

    const balanceCheck = await restoreBalanceBlock(bet);
    if (!balanceCheck.ok) {
      return res.status(balanceCheck.statusCode || 400).json({
        success: false,
        message: balanceCheck.message,
      });
    }

    const wallet = await reopenBet(bet);

    return res.status(200).json({
      success: true,
      message: 'Bet restored. The user can see it again.',
      data: { betId: String(bet._id), wallet, isDeleted: false },
    });
  } catch (error) {
    console.error('Error restoring bet:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to restore bet',
    });
  }
};

export const restoreDeletedBetWithPassword = async (req, res) => {
  try {
    if (denyUnlessSuperAdmin(req, res)) return;
    if (!(await requireMasterPassword(req, res))) return;
    return restoreDeletedBet(req, res);
  } catch (error) {
    console.error('Error restoring bet:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to restore bet',
    });
  }
};

export const listDeletedBets = async (req, res) => {
  try {
    if (denyUnlessSuperAdmin(req, res)) return;
    req.query.view = 'deleted';
    if (req.query.userName && !req.query.search) {
      req.query.search = req.query.userName;
    }
    return listManageableBets(req, res);
  } catch (error) {
    console.error('Error listing deleted bets:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load deleted bets',
    });
  }
};
