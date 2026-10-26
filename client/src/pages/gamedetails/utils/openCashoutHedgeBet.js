import { toast } from 'react-toastify';
import api from '../../../redux/api';

/**
 * Fetch hedge cashout quote and open PlaceBet with pre-filled hedge leg.
 */
export async function openCashoutHedgeBet({
  gameId,
  gameType,
  gameName,
  teams,
  teamSections,
  teamOdds,
  onBetSelect,
  marketName,
  sid,
  minAmount,
  maxAmount,
}) {
  if (!gameId || !gameType || !teams?.length || !onBetSelect) {
    return false;
  }

  try {
    const response = await api.post(
      '/user/cashout/hedge-quote',
      {
        gameId,
        gameType,
        gameName: gameName || 'Cricket Game',
        teams,
        teamOdds,
      },
      { withCredentials: true }
    );

    const data = response.data;
    if (!data?.cashoutAvailable) {
      toast.error(data?.message || 'Cashout not available');
      return false;
    }

    if (data.alreadyBalanced) {
      toast.info(`Position already balanced at ${data.lockedPL}`);
      return false;
    }

    const hedgeSection = teamSections?.find(
      (entry) =>
        entry.team?.toLowerCase().trim() ===
        data.hedgeTeam?.toLowerCase().trim()
    );

    onBetSelect({
      team: data.hedgeTeam,
      odds: String(data.hedgeOdds),
      type: data.hedgeOtype,
      stake: String(data.hedgeStake),
      teams,
      marketName: data.marketName || marketName,
      gameType: data.gameType || gameType,
      sid: hedgeSection?.sid ?? sid,
      minAmount,
      maxAmount,
      isCashoutHedge: true,
      hedgedBetId: data.hedgedBetId,
      lockedPL: data.lockedPL,
      outcomeA: data.outcomeA,
      outcomeB: data.outcomeB,
    });

    return true;
  } catch (error) {
    toast.error(
      error?.response?.data?.message || 'Failed to load cashout quote'
    );
    return false;
  }
}
