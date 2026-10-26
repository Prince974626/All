import SubAdmin from '../../models/subAdminModel.js';
import {
  buildMarketLockEntry,
  LOCK_TYPES,
  marketLockApplies,
  stripMatchingMarketLocks,
} from '../../utils/marketLockUtils.js';
import { verifyTransactionPassword } from '../../utils/verifyTransactionPassword.js';

/**
 * GET /block-market/locks
 */
export const getMyBlockMarketLocks = async (req, res) => {
  try {
    const admin = await SubAdmin.findById(req.id)
      .select('marketLocks userName role')
      .lean();
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    return res.status(200).json({
      success: true,
      data: Array.isArray(admin.marketLocks) ? admin.marketLocks : [],
    });
  } catch (error) {
    console.error('getMyBlockMarketLocks:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch market locks',
    });
  }
};

async function requireAdminWithTxPassword(req, res) {
  const transactionCode = String(req.body?.transactionCode || '').trim();
  if (!transactionCode) {
    res.status(400).json({
      success: false,
      message: 'Transaction Code / Master Password is required',
    });
    return null;
  }

  const admin = await SubAdmin.findById(req.id);
  if (!admin) {
    res.status(404).json({ success: false, message: 'Admin not found' });
    return null;
  }
  if (admin.role === 'user') {
    res.status(403).json({
      success: false,
      message: 'Users cannot block markets',
    });
    return null;
  }

  const ok = await verifyTransactionPassword(admin, transactionCode);
  if (!ok) {
    res.status(400).json({
      success: false,
      message: 'Invalid Transaction Code / Master Password',
    });
    return null;
  }

  return admin;
}

/**
 * POST /block-market/toggle
 * body: { marketName, eventName, gameId, lockType, isLocked, transactionCode }
 */
export const toggleMyBlockMarket = async (req, res) => {
  try {
    const {
      marketName,
      eventName = '',
      gameId = '',
      lockType = LOCK_TYPES.MARKET,
      isLocked,
    } = req.body || {};

    if (!marketName || !String(marketName).trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'marketName is required' });
    }
    if (typeof isLocked !== 'boolean') {
      return res
        .status(400)
        .json({ success: false, message: 'isLocked (boolean) is required' });
    }

    const type = String(lockType || LOCK_TYPES.MARKET);
    if (type === LOCK_TYPES.MARKET && !String(gameId || '').trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'gameId is required for market locks' });
    }

    const admin = await requireAdminWithTxPassword(req, res);
    if (!admin) return;

    const lockContext = {
      marketName: String(marketName).trim(),
      eventName: String(eventName || '').trim(),
      gameId: String(gameId || '').trim(),
      lockType: type,
    };

    let locks = Array.isArray(admin.marketLocks) ? [...admin.marketLocks] : [];
    locks = stripMatchingMarketLocks(locks, lockContext);

    if (isLocked) {
      locks.push(
        buildMarketLockEntry({
          ...lockContext,
          lockedBy: admin.userName || String(req.id),
        })
      );
    }

    admin.marketLocks = locks;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: isLocked
        ? 'Blocked for your downline'
        : 'Unblocked for your downline',
      data: {
        ...lockContext,
        isLocked,
        marketLocks: admin.marketLocks,
      },
    });
  } catch (error) {
    console.error('toggleMyBlockMarket:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update market lock',
    });
  }
};

/**
 * POST /block-market/bulk
 * body: { locks: [...], transactionCode }
 */
export const bulkToggleMyBlockMarket = async (req, res) => {
  try {
    const { locks: items } = req.body || {};
    if (!Array.isArray(items) || !items.length) {
      return res
        .status(400)
        .json({ success: false, message: 'locks array is required' });
    }

    const admin = await requireAdminWithTxPassword(req, res);
    if (!admin) return;

    let next = Array.isArray(admin.marketLocks) ? [...admin.marketLocks] : [];

    for (const item of items) {
      const marketName = String(item.marketName || '').trim();
      const gameId = String(item.gameId || '').trim();
      const eventName = String(item.eventName || '').trim();
      const lockType = String(item.lockType || LOCK_TYPES.MARKET);
      if (!marketName || typeof item.isLocked !== 'boolean') continue;
      if (lockType === LOCK_TYPES.MARKET && !gameId) continue;

      const lockContext = { marketName, eventName, gameId, lockType };
      next = stripMatchingMarketLocks(next, lockContext);
      if (item.isLocked) {
        next.push(
          buildMarketLockEntry({
            ...lockContext,
            lockedBy: admin.userName || String(req.id),
          })
        );
      }
    }

    admin.marketLocks = next;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: 'Market locks updated',
      data: admin.marketLocks,
    });
  } catch (error) {
    console.error('bulkToggleMyBlockMarket:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update market locks',
    });
  }
};

export function isLockedInList(locks, { marketName, gameId, lockType }) {
  return (locks || []).some((lock) =>
    marketLockApplies(lock, {
      marketName,
      gameType: marketName,
      gameId,
      sport: lockType === 'sport' ? marketName : undefined,
      casinoCategory: lockType === 'casinoCategory' ? marketName : undefined,
      ggrProvider: lockType === 'ggrProvider' ? marketName : undefined,
    })
  );
}
