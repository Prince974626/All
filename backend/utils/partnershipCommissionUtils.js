/**
 * PARTNERSHIP (`partnership` %): upline share on ALL settled P/L (wins and losses).
 * COMMISSION (`commition` %): match-odds client WINS only — never on losses.
 *
 * Stored on each agent row: `partnership` = % that account KEEPS from its downline
 * (e.g. 15 means agent keeps 15%, parent keeps 85%). Legacy rows may still store
 * parent take (e.g. 85); use normalizeStoredDownlineKeepPercent() to read either.
 */

const MATCH_ODDS_REGEX = /^match\s*odds$/i;

export const roundMoney = (value) =>
  Math.round((Number(value) || 0) * 100) / 100;

const normalizeMatchOddsLabel = (value) =>
  String(value || '')
    .trim()
    .replace(/_/g, ' ');

export const isMatchOddsGameType = (gameType) =>
  MATCH_ODDS_REGEX.test(normalizeMatchOddsLabel(gameType));

const MATCH_ODDS_LOOSE_REGEX = /match\s*odds/i;

const fieldIsMatchOdds = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  return (
    isMatchOddsGameType(raw) ||
    MATCH_ODDS_LOOSE_REGEX.test(raw.replace(/_/g, ' '))
  );
};

/** Match odds win on a settled bet/ history row (gameType or marketName). */
export const isMatchOddsBetRecord = (bet) => {
  if (!bet) return false;
  return [bet.gameType, bet.marketName, bet.market_type, bet.fancyType].some(
    fieldIsMatchOdds
  );
};

/** Settled bet history status: 1 = win, 2 = loss, 3 = void. */
export const BET_STATUS_WIN = 1;
export const BET_STATUS_LOSS = 2;
export const BET_STATUS_VOID = 3;

/** Client win P/L only (commission never applies to zero or negative P/L). */
export const isSettledClientWinPL = (profitLossChange, status) => {
  const pl = Number(profitLossChange) || 0;
  if (pl <= 0) return false;
  const s = Number(status);
  if (s === BET_STATUS_LOSS || s === BET_STATUS_VOID) return false;
  return true;
};

export const getMatchOddsCommissionFromNetWin = (
  netProfit,
  commissionPercent
) => {
  const net = Number(netProfit) || 0;
  const rate = Number(commissionPercent) || 0;
  if (net <= 0 || rate <= 0 || rate >= 100) return 0;
  const gross = roundMoney(net / (1 - rate / 100));
  return roundMoney(gross - net);
};

export const parseCommissionPercent = (commition) => {
  const raw = String(commition ?? '')
    .trim()
    .replace('%', '');
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 100);
};

export const parsePartnershipPercent = (partnership) => {
  const raw = String(partnership ?? '')
    .trim()
    .replace('%', '');
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 100);
};

export const getViewerMySharePercent = (partnership) =>
  roundMoney(Math.max(0, parsePartnershipPercent(partnership)));

export const isPartnershipRootAccount = (admin) =>
  !admin?.invite ||
  admin?.role === 'supperadmin' ||
  admin?.role === 'superadmin';

/**
 * Downline keep % stored on row (15 = downline keeps 15%).
 * Legacy: value may be parent take (85) — detected when stored > half of parent's keep.
 */
export const normalizeStoredDownlineKeepPercent = (downline, parent) => {
  const stored = parsePartnershipPercent(downline?.partnership);
  if (!parent) {
    if (stored >= 100) return 100;
    return roundMoney(stored);
  }
  const parentKeep = getAccountMyKeepPercent(parent);
  return roundMoney(Math.min(stored, parentKeep));
};

/** What this account keeps from its downline P/L. */
export const getAccountMyKeepPercent = (admin) => {
  if (isPartnershipRootAccount(admin)) {
    const p = parsePartnershipPercent(admin?.partnership);
    return roundMoney(p > 0 ? p : 100);
  }
  const stored = parsePartnershipPercent(admin?.partnership);
  if (stored >= 100) return 100;
  return roundMoney(stored);
};

export const getEffectiveKeepPercent = (admin, gameType = 'sports') => {
  const baseKeep = getAccountMyKeepPercent(admin);
  if (gameType !== 'casino') return baseKeep;
  if (!admin || admin.role === 'user') return 0;
  if (isPartnershipRootAccount(admin)) return baseKeep;

  const uplineTake = roundMoney(Math.max(0, 100 - baseKeep));
  if (uplineTake < 12 || Number(admin.ggrPercentage || 0) > 0) {
    const ggr =
      Number(admin.ggrPercentage || 0) > 0 ? Number(admin.ggrPercentage) : 12;
    return roundMoney(Math.max(0, 100 - ggr));
  }
  return baseKeep;
};

export const getDownlineKeepPercentOnRow = (downline, parent) =>
  normalizeStoredDownlineKeepPercent(downline, parent);

/** Parent's take from this downline row = parent keep − downline keep. */
export const getParentShareOnDownlineRow = (
  downline,
  parent,
  gameType = 'sports'
) => {
  const parentKeep = parent ? getEffectiveKeepPercent(parent, gameType) : 100;
  const downKeep = downline ? getEffectiveKeepPercent(downline, gameType) : 0;
  return roundMoney(Math.max(0, parentKeep - downKeep));
};

/** Convert UI/body value to downline keep for storage (accepts keep or legacy parent-take). */
export const toStoredDownlineKeepPercent = (rawValue, parent) => {
  const stored = parsePartnershipPercent(rawValue);
  const parentKeep = parent ? getAccountMyKeepPercent(parent) : 100;
  if (stored > parentKeep / 2) {
    return roundMoney(Math.max(0, parentKeep - stored));
  }
  return roundMoney(Math.min(stored, parentKeep));
};

/** Create-account API: body field is downline keep % from InsertAgent (not legacy parent-take). */
export const toStoredDownlineKeepFromCreateInput = (rawValue, parent) => {
  const parentKeep = parent ? getAccountMyKeepPercent(parent) : 100;
  const requested = parsePartnershipPercent(rawValue);
  return roundMoney(Math.min(requested, parentKeep));
};

/** GGR payer downline: parent's sports share from this row is under 12%. */
export const isGgrPayerDownlineSetup = (downlineKeep, parent) => {
  const parentKeep = parent ? getAccountMyKeepPercent(parent) : 100;
  const keep = parsePartnershipPercent(downlineKeep);
  const parentTake = roundMoney(Math.max(0, parentKeep - keep));
  return parentTake < 12;
};

/**
 * Runtime GGR payer flag (login, profile, casino GGR).
 * True when parent's sports take on this row is under 12%, or ggrPercentage is set.
 * Requires parent context — not the downline's own keep % alone.
 */
export const isGgrPayerAccount = (account, parent = null) => {
  if (
    !account ||
    account.role === 'supperadmin' ||
    account.role === 'superadmin' ||
    account.role === 'user'
  ) {
    return false;
  }
  if (Number(account.ggrPercentage || 0) > 0) {
    return true;
  }
  if (!parent) {
    return false;
  }
  const parentTake = getParentShareOnDownlineRow(account, parent, 'sports');
  return parentTake < 12;
};

const applyParentTakeFromChild = (parentViewPL, child, accountByCode) => {
  if (!child || child.role === 'user') return roundMoney(parentViewPL);
  const parent = accountByCode?.get(child.invite);
  const parentTake = getParentShareOnDownlineRow(child, parent);
  if (parentTake <= 0) return roundMoney(parentViewPL);
  return splitProfitLossByMyShare(parentViewPL, parentTake).myPL;
};

export const getViewerShareOfUserClientPL = (
  viewerCode,
  user,
  accountByCode,
  clientPL,
  gameType = 'sports'
) => {
  if (!viewerCode || !user || user.role !== 'user') return 0;

  let node = user;
  let childOfViewer = null;

  while (node?.invite && node.invite !== viewerCode) {
    const parent = accountByCode.get(node.invite);
    if (!parent) return 0;
    node = parent;
  }

  if (node && node.invite === viewerCode) {
    childOfViewer = node;
  } else if (node && node.code === viewerCode) {
    childOfViewer = node; // self
  } else {
    return 0; // Not in upline
  }

  const viewer = accountByCode.get(viewerCode);

  if (typeof clientPL === 'object' && clientPL !== null) {
    let totalMyPL = 0;
    if (clientPL.sports) {
      const parentViewSports = roundMoney(-clientPL.sports);
      const takeSports = getParentShareOnDownlineRow(
        childOfViewer,
        viewer,
        'sports'
      );
      totalMyPL += splitProfitLossByMyShare(parentViewSports, takeSports).myPL;
    }
    if (clientPL.casino) {
      const parentViewCasino = roundMoney(-clientPL.casino);
      const takeCasino = getParentShareOnDownlineRow(
        childOfViewer,
        viewer,
        'casino'
      );
      totalMyPL += splitProfitLossByMyShare(parentViewCasino, takeCasino).myPL;
    }
    return roundMoney(totalMyPL);
  }

  const parentViewPL = roundMoney(-(Number(clientPL) || 0));
  if (parentViewPL === 0) return 0;

  if (node && node.code === viewerCode) {
    return parentViewPL;
  }

  const parentTake = getParentShareOnDownlineRow(
    childOfViewer,
    viewer,
    gameType
  );
  return splitProfitLossByMyShare(parentViewPL, parentTake).myPL;
};

export const getViewerReceivedFromDownlineOfUserClientPL = (
  viewerCode,
  user,
  accountByCode,
  clientPL
) => {
  if (!viewerCode || !user || user.role !== 'user') return 0;

  let node = user;
  let childOfViewer = null;

  while (node?.invite && node.invite !== viewerCode) {
    const parent = accountByCode.get(node.invite);
    if (!parent) return 0;
    node = parent;
  }

  if (node && node.invite === viewerCode) {
    childOfViewer = node;
  } else {
    return 0;
  }

  const viewer = accountByCode.get(viewerCode);
  const downlineKeep = getDownlineKeepPercentOnRow(childOfViewer, viewer);

  if (typeof clientPL === 'object' && clientPL !== null) {
    let received = 0;
    if (clientPL.sports) {
      received += splitProfitLossByMyShare(
        roundMoney(-clientPL.sports),
        roundMoney(100 - downlineKeep)
      ).myPL;
    }
    if (clientPL.casino) {
      received += splitProfitLossByMyShare(
        roundMoney(-clientPL.casino),
        roundMoney(100 - downlineKeep)
      ).myPL;
    }
    return roundMoney(received);
  }

  const parentViewPL = roundMoney(-(Number(clientPL) || 0));
  if (parentViewPL === 0) return 0;

  return splitProfitLossByMyShare(parentViewPL, roundMoney(100 - downlineKeep))
    .myPL;
};

export const clampDownlineSharingPercent = (raw, maxMyShare) => {
  const max = Number(maxMyShare) || 0;
  return roundMoney(Math.min(parsePartnershipPercent(raw), max));
};

export const getRemainingMySharePercent = (parentMyShare, downlineSharing) => {
  const parent = Number(parentMyShare) || 0;
  const down = clampDownlineSharingPercent(downlineSharing, parent);
  return roundMoney(Math.max(0, parent - down));
};

/** Value for API from InsertAgent: still parent-share; convert with toStoredDownlineKeepPercent on save. */
export const getParentShareStoredOnDownline = (
  parentMyShare,
  downlineSharing
) => getRemainingMySharePercent(parentMyShare, downlineSharing);

export const calculateWinCommission = (winProfit, commissionPercent) => {
  const profit = Number(winProfit) || 0;
  const rate = Number(commissionPercent) || 0;
  if (profit <= 0 || rate <= 0) {
    return { netProfit: roundMoney(profit), commission: 0 };
  }
  const commission = roundMoney((profit * rate) / 100);
  const netProfit = roundMoney(profit - commission);
  return { netProfit, commission };
};

/**
 * Match-odds commission from a settled win row (gross or net profit in DB).
 * Returns zeros when P/L is not a client win.
 */
export const resolveMatchOddsWinCommission = (
  profitLossChange,
  commissionPercent,
  status
) => {
  const pl = Number(profitLossChange) || 0;
  if (!isSettledClientWinPL(pl, status)) {
    return { grossWin: 0, netProfit: roundMoney(pl), commission: 0 };
  }
  const rate = Number(commissionPercent) || 0;
  if (rate <= 0) {
    return {
      grossWin: roundMoney(pl),
      netProfit: roundMoney(pl),
      commission: 0,
    };
  }
  const fromNet = getMatchOddsCommissionFromNetWin(pl, rate);
  const fromGross = calculateWinCommission(pl, rate);
  const commission = roundMoney(Math.max(fromNet, fromGross.commission));
  const useGrossStored = fromGross.commission >= fromNet;
  const netProfit = useGrossStored ? fromGross.netProfit : roundMoney(pl);
  const grossWin = useGrossStored
    ? roundMoney(pl)
    : roundMoney(pl + commission);
  return { grossWin, netProfit, commission };
};

export const getMatchOddsCommissionAmount = (
  profitLossChange,
  commissionPercent,
  status
) =>
  resolveMatchOddsWinCommission(profitLossChange, commissionPercent, status)
    .commission;

export const getPartnershipUplineShare = (totalPL, partnershipPercent) => {
  const pl = Number(totalPL) || 0;
  const pct = Number(partnershipPercent) || 0;
  if (pl === 0 || pct <= 0) return 0;
  if (pct >= 100) return roundMoney(pl);
  return roundMoney((pl * pct) / 100);
};

export const splitProfitLossByMyShare = (totalPL, mySharePercent) => {
  const pl = Number(totalPL) || 0;
  const myPct = Number(mySharePercent) || 0;
  if (pl === 0 || myPct <= 0) {
    return { myPL: 0, uplinePL: roundMoney(pl), totalPL: roundMoney(pl) };
  }
  if (myPct >= 100) {
    return { myPL: roundMoney(pl), uplinePL: 0, totalPL: roundMoney(pl) };
  }
  const myPL = roundMoney((pl * myPct) / 100);
  const uplinePL = roundMoney(pl - myPL);
  return { myPL, uplinePL, totalPL: roundMoney(pl) };
};

export const getDownlineUplineBettingContribution = ({
  totalPL,
  partnershipPercent,
  isEndUser,
}) => {
  const total = Number(totalPL) || 0;
  if (isEndUser) {
    return splitProfitLossByMyShare(total, partnershipPercent).myPL;
  }
  return getPartnershipUplineShare(total, partnershipPercent);
};

export const adjustUserUpdatesForCommission = (userUpdates, commission) => {
  if (!userUpdates || commission <= 0) return userUpdates;
  return {
    balanceChange: roundMoney(userUpdates.balanceChange - commission),
    avBalanceChange: roundMoney(userUpdates.avBalanceChange - commission),
    profitLossChange: roundMoney(userUpdates.profitLossChange - commission),
  };
};

export const adjustHistoryProfitLossForCommission = (
  profitLossChange,
  commission
) => {
  if (commission <= 0) return profitLossChange;
  return roundMoney(profitLossChange - commission);
};

export const aggregateSportsBetPLForUserIds = async (
  betHistoryModel,
  userIds
) => {
  if (!userIds?.length) return 0;
  const ids = userIds.map((id) => id.toString());
  const plResult = await betHistoryModel.aggregate([
    {
      $match: {
        userId: { $in: ids },
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
  return plResult.length > 0 ? roundMoney(plResult[0].totalPL) : 0;
};
