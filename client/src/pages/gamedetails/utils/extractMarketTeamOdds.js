/** Primary bookmaker back/lay — same selection as the main odds cells in the UI. */
export function extractBookmakerTeamOdds(oddsArr) {
  if (!Array.isArray(oddsArr)) {
    return { bestBack: null, bestLay: null };
  }

  const backs = oddsArr.filter(
    (o) => o?.otype === 'back' && parseFloat(o.odds) > 0
  );
  const lays = oddsArr.filter(
    (o) => o?.otype === 'lay' && parseFloat(o.odds) > 0
  );
  const primaryBack =
    backs.find((o) => o.tno === 0) || backs[backs.length - 1] || null;
  const primaryLay = lays.find((o) => o.tno === 0) || lays[0] || null;

  return {
    bestBack: primaryBack ? parseFloat(primaryBack.odds) : null,
    bestLay: primaryLay ? parseFloat(primaryLay.odds) : null,
  };
}

/** Primary match-odds back/lay from the exchange-style odds array. */
export function extractMatchOddsTeamOdds(oddsArr) {
  if (!Array.isArray(oddsArr) || oddsArr.length < 4) {
    return { bestBack: null, bestLay: null };
  }

  const bestBack = oddsArr[2]?.odds ? parseFloat(oddsArr[2].odds) : null;
  const bestLay = oddsArr[3]?.odds ? parseFloat(oddsArr[3].odds) : null;

  return {
    bestBack: bestBack > 0 ? bestBack : null,
    bestLay: bestLay > 0 ? bestLay : null,
  };
}
