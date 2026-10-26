export function computeNetOutcome(team, marketBets, mCashoutPL = 0) {
  let netOutcome = 0;
  marketBets.forEach((bet) => {
    const isBetOnThisTeam =
      bet.teamName?.toLowerCase() === team?.toLowerCase();
    const betAmt = parseFloat(bet.totalBetAmount) || 0;
    const stake = parseFloat(bet.totalPrice) || 0;

    if (bet.otype === 'back') {
      netOutcome += isBetOnThisTeam ? betAmt : -stake;
    } else {
      netOutcome += isBetOnThisTeam ? -stake : betAmt;
    }
  });
  return Math.round((netOutcome + mCashoutPL) * 100) / 100;
}

export function buildMatchOddsStylePendingLeg(bet) {
  if (!bet?.stake || !bet?.odds || !bet?.team || !bet?.type) return null;
  const stakeNum = parseFloat(bet.stake);
  const oddsNum = parseFloat(bet.odds);
  if (isNaN(stakeNum) || isNaN(oddsNum) || stakeNum <= 0) return null;

  const isLay = bet.type === 'lay';
  return {
    teamName: bet.team,
    otype: bet.type,
    totalBetAmount: isLay ? stakeNum : stakeNum * (oddsNum - 1),
    totalPrice: isLay ? stakeNum * (oddsNum - 1) : stakeNum,
  };
}

// Bookmaker / Tied Match: profit = stake * (odds / 100), liability = stake * (odds / 100) on lay
export function buildBookmakerStylePendingLeg(bet) {
  if (!bet?.stake || !bet?.odds || !bet?.team || !bet?.type) return null;
  const stakeNum = parseFloat(bet.stake);
  const oddsNum = parseFloat(bet.odds);
  if (isNaN(stakeNum) || isNaN(oddsNum) || stakeNum <= 0) return null;

  const isLay = bet.type === 'lay';
  return {
    teamName: bet.team,
    otype: bet.type,
    totalBetAmount: isLay ? stakeNum : stakeNum * (oddsNum / 100),
    totalPrice: isLay ? stakeNum * (oddsNum / 100) : stakeNum,
  };
}

export function createMarketNetOutcomeHelpers({
  gameTypes,
  gameId,
  pendingBetHistory,
  pendingBetAmounts,
  cashoutPL,
  cashoutPLKey,
  // 'matchOdds' (odds - 1) | 'bookmaker' (odds / 100)
  oddsStyle = 'matchOdds',
}) {
  const matchesGameType = (value) =>
    gameTypes.some((t) => t.toLowerCase() === (value || '').toLowerCase());

  const getHistoryMarketBets = () => {
    if (!Array.isArray(pendingBetHistory) || !gameId) return [];

    return pendingBetHistory
      .filter((b) => {
        if (String(b.gameId) !== String(gameId)) return false;
        return matchesGameType(b.gameType);
      })
      .map((b) => ({
        gameType: b.gameType,
        teamName: b.teamName,
        otype: b.otype,
        totalBetAmount: b.betAmount,
        totalPrice: b.price,
      }));
  };

  const getMarketCashoutPL = () => cashoutPL?.[cashoutPLKey] || 0;

  const getMarketBets = () => {
    const amountBets =
      pendingBetAmounts?.filter((item) => matchesGameType(item.gameType)) ||
      [];
    // When this market has cashed-out bets, cashoutPL already represents their
    // locked P/L. The pending-bet history still contains those cashed-out legs
    // (betHistory rows are not flagged isCashedOut at cashout time), so using it
    // here would double-count them against cashoutPL. The grouped amounts
    // endpoint already excludes cashed-out bets, so use it instead.
    if (getMarketCashoutPL()) return amountBets;

    const historyBets = getHistoryMarketBets();
    return historyBets.length > 0 ? historyBets : amountBets;
  };

  const getBetDetails = (team) => {
    const mCashoutPL = getMarketCashoutPL();
    const marketBets = getMarketBets();

    const matchedTeamBet = marketBets.find(
      (item) => item.teamName?.toLowerCase() === team?.toLowerCase()
    );
    const otherTeamBet = marketBets[0];

    const otype = matchedTeamBet?.otype || otherTeamBet?.otype || '';
    const totalBetAmount =
      matchedTeamBet?.totalBetAmount || otherTeamBet?.totalBetAmount || '';
    const totalPrice =
      matchedTeamBet?.totalPrice || otherTeamBet?.totalPrice || '';
    const teamName = matchedTeamBet?.teamName || otherTeamBet?.teamName || '';

    if (marketBets.length === 0) {
      if (mCashoutPL) {
        return {
          isHedged: true,
          netOutcome: Math.round(mCashoutPL * 100) / 100,
          otype: '',
          totalBetAmount: '',
          totalPrice: '',
          teamName: '',
        };
      }
      return {
        isHedged: false,
        netOutcome: null,
        otype,
        totalBetAmount,
        totalPrice,
        teamName,
      };
    }

    return {
      isHedged: true,
      netOutcome: computeNetOutcome(team, marketBets, mCashoutPL),
      otype,
      totalBetAmount,
      totalPrice,
      teamName,
    };
  };

  const getProjectedNetOutcome = (team, bet) => {
    const pendingLeg =
      oddsStyle === 'bookmaker'
        ? buildBookmakerStylePendingLeg(bet)
        : buildMatchOddsStylePendingLeg(bet);
    if (!pendingLeg) return null;
    return computeNetOutcome(
      team,
      [...getMarketBets(), pendingLeg],
      getMarketCashoutPL()
    );
  };

  const isSelectedBetInMarket = (bet) => {
    if (!bet) return false;
    return (
      matchesGameType(bet.gameType) || matchesGameType(bet.marketName)
    );
  };

  return {
    getBetDetails,
    getProjectedNetOutcome,
    isSelectedBetInMarket,
  };
}
