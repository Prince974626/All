export const CASHOUT_GAME_TYPES = [
  'Match Odds',
  'MATCH_ODDS',
  'Tied Match',
  'Bookmaker',
  'Bookmaker 2',
  'Bookmaker IPL CUP',
  'Toss',
  '1st 6 over',
  'Winner',
  'OVER_UNDER_05',
  'OVER_UNDER_15',
  'OVER_UNDER_25',
];

//bet is eligible for cashout or not
export function isCashoutEligible(bet) {
  return (
    bet.status === 0 &&
    CASHOUT_GAME_TYPES.includes(bet.gameType) &&
    bet.betType !== 'casino' &&
    !bet.isCashoutHedge &&
    !bet.isCashedOut
  );
}

export const BOOKMAKER_GAME_TYPES = [
  'Bookmaker',
  'Bookmaker 2',
  'Bookmaker IPL CUP',
];

export function isBookmakerGameType(gameType) {
  return BOOKMAKER_GAME_TYPES.includes(gameType);
}

export function computeNetIfTeamWins(targetTeam, bets) {
  let net = 0;
  for (const bet of bets) {
    const onTeam =
      bet.teamName?.toLowerCase().trim() === targetTeam?.toLowerCase().trim();
    const betAmt = parseFloat(bet.betAmount) || 0;
    const stake = parseFloat(bet.price) || 0;

    if (bet.otype === 'back') {
      net += onTeam ? betAmt : -stake;
    } else {
      net += onTeam ? -stake : betAmt;
    }
  }
  return net;
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Hedge cashout quote for Place-Bet style cashout (Match Odds decimal / Bookmaker bhav).
 *
 * Matches the reference sites (allpanelexch / d247): cashout always BACKs the team currently on
 * the losing (more negative) side of the user's position, regardless of which selection the user
 * originally bet on:
 *   - BACK the lower-outcome team at its back odds (primary)
 *   - LAY the higher-outcome team at its lay odds (fallback, if back odds unavailable)
 * Either way both outcomes collapse to a single locked P/L.
 */
export function calculateHedgeQuote(
  bets,
  gameType,
  teamA,
  teamB,
  oddsA,
  oddsB
) {
  if (!Array.isArray(bets) || bets.length === 0 || !teamA || !teamB) {
    return null;
  }

  const outcomeA = computeNetIfTeamWins(teamA, bets);
  const outcomeB = computeNetIfTeamWins(teamB, bets);

  if (Math.abs(outcomeA - outcomeB) < 0.001) {
    return {
      hedgeOtype: null,
      hedgeTeam: teamA,
      hedgeOdds: null,
      hedgeStake: 0,
      lockedPL: round2(outcomeA),
      outcomeA: round2(outcomeA),
      outcomeB: round2(outcomeB),
    };
  }

  const isBookmaker = isBookmakerGameType(gameType);
  const minOdds = isBookmaker ? 1 : 1.01;
  const gap = Math.abs(outcomeA - outcomeB);
  const round2A = round2(outcomeA);
  const round2B = round2(outcomeB);

  // Cashout BACKs the team on the losing (lower-outcome) side. Identify loser vs winner.
  const aIsLoser = outcomeA <= outcomeB;
  const loserTeam = aIsLoser ? teamA : teamB;
  const loserOdds = aIsLoser ? oddsA : oddsB;
  const winnerTeam = aIsLoser ? teamB : teamA;
  const winnerOdds = aIsLoser ? oddsB : oddsA;
  const loserOutcome = aIsLoser ? outcomeA : outcomeB;
  const winnerOutcome = aIsLoser ? outcomeB : outcomeA;

  // BACK `team`: team is the losing side; opposite side just loses the stake.
  // Hedging the OTHER team, the per-unit swing is the FULL decimal odds:
  // bookmaker -> 1 + bhav/100, match odds -> the decimal odds itself.
  const buildBack = (team, odds, oppositeOutcome) => {
    const bb = odds?.bestBack;
    if (!bb || bb < minOdds) return null;
    const divisor = isBookmaker ? 1 + bb / 100 : bb;
    if (divisor < 0.001) return null;
    const hedgeStake = gap / divisor;
    return {
      hedgeOtype: 'back',
      hedgeTeam: team,
      hedgeOdds: bb,
      hedgeStake: round2(hedgeStake),
      lockedPL: round2(oppositeOutcome - hedgeStake),
      outcomeA: round2A,
      outcomeB: round2B,
    };
  };

  // LAY `team`: team is the winning side; opposite side gains the stake.
  // Hedging the OTHER team, the per-unit swing is the FULL decimal odds:
  // bookmaker -> 1 + bhav/100, match odds -> the decimal odds itself.
  const buildLay = (team, odds, oppositeOutcome) => {
    const bl = odds?.bestLay;
    if (!bl || bl < minOdds) return null;
    const divisor = isBookmaker ? 1 + bl / 100 : bl;
    if (divisor < 0.001) return null;
    const hedgeStake = gap / divisor;
    return {
      hedgeOtype: 'lay',
      hedgeTeam: team,
      hedgeOdds: bl,
      hedgeStake: round2(hedgeStake),
      lockedPL: round2(oppositeOutcome + hedgeStake),
      outcomeA: round2A,
      outcomeB: round2B,
    };
  };

  // Two equivalent hedges exist: BACK the losing team, or LAY the winning team.
  // Both collapse the position to a single locked P/L. The reference sites (d247)
  // pick the leg priced at the LOWER decimal odds (the tighter / more-liquid side),
  // not the one with the best value. On a tie prefer LAY the winner.
  const backLeg = buildBack(loserTeam, loserOdds, winnerOutcome);
  const layLeg = buildLay(winnerTeam, winnerOdds, loserOutcome);

  const legDecimal = (leg) =>
    isBookmaker ? 1 + leg.hedgeOdds / 100 : leg.hedgeOdds;

  if (backLeg && layLeg) {
    return legDecimal(layLeg) <= legDecimal(backLeg) ? layLeg : backLeg;
  }
  return backLeg || layLeg;
}

export function calculateCashoutValue(bets, currentBestLay, currentBestBack) {
  if (!Array.isArray(bets) || bets.length === 0) return null;

  let W = 0;
  let L = 0;

  for (const bet of bets) {
    if (bet.otype === 'back') {
      W += bet.betAmount;
      L -= bet.price;
    } else {
      W -= bet.price;
      L += bet.betAmount;
    }
  }
  const diff = W - L;

  if (Math.abs(diff) < 0.001) {
    return Math.round(W);
  }

  let cashout;
  if (diff > 0) {
    if (!currentBestLay || currentBestLay < 1.01) return null;
    const H = diff / currentBestLay;
    cashout = L + H;
  } else {
    if (!currentBestBack || currentBestBack < 1.01) return null;
    const H = Math.abs(diff) / currentBestBack;
    cashout = L - H;
  }
  return Math.round(cashout);
}

export function calculateSingleBackCashout(
  originalOdds,
  stake,
  currentBestLay
) {
  if (!currentBestLay || currentBestLay < 1.01) return null;
  return Math.round(stake * (originalOdds / currentBestLay - 1));
}

export default {
  CASHOUT_GAME_TYPES,
  BOOKMAKER_GAME_TYPES,
  isBookmakerGameType,
  isCashoutEligible,
  computeNetIfTeamWins,
  calculateHedgeQuote,
  calculateCashoutValue,
  calculateSingleBackCashout,
};
