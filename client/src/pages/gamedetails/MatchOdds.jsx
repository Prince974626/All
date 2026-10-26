import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaArrowRight } from 'react-icons/fa';
import { getPendingBetAmo, getPendingBet } from '../../redux/reducer/betReducer';
import { openCashoutHedgeBet } from './utils/openCashoutHedgeBet';
import { extractMatchOddsTeamOdds } from './utils/extractMarketTeamOdds';

function MatchOdds({
  onBetSelect,
  matchOddsList,
  pendingBetAmounts,
  selectedBet,
  gameid,
}) {
  const dispatch = useDispatch();
  const { eventName, cashoutPL } = useSelector((state) => state.bet);

  const [cashoutLoading, setCashoutLoading] = useState(false);

  useEffect(() => {
    if (gameid) {
      dispatch(getPendingBetAmo(gameid));
      dispatch(getPendingBet(gameid));
    }
  }, [dispatch, gameid]);


  const backBg = ['bg-[#72bbef7f]', 'bg-[#72bbefbf]', 'bg-[#72bbef]'];
  const layBg = ['bg-[#faa9ba]', 'bg-[#faa9babf]', 'bg-[#faa9ba7f]'];

  // Transform API data similar to MatchOdd component
  const oddsData = matchOddsList?.[0]?.section?.length
    ? matchOddsList[0].section.map((sec) => ({
        team: sec.nat,
        sid: sec.sid,
        odds: sec.odds,
        max: sec.maxb || sec.max,
        min: sec.min,
        mname:
          matchOddsList[0].mname === 'MATCH_ODDS' ? 'Match Odds' : 'Winner',
        status: matchOddsList[0].status,
      }))
    : [];

  const CASHOUT_GAME_TYPES = ['Match Odds', 'MATCH_ODDS'];
  const MATCH_ODDS_GAME_TYPES = [
    'Match Odds',
    'Winner',
    'MATCH_ODDS',
    'TOURNAMENT_WINNER',
  ];

  const getHistoryMarketBets = (marketName) => {
    const mname = marketName === 'MATCH_ODDS' ? 'Match Odds' : marketName;
    if (!Array.isArray(eventName) || !gameid) return [];

    return eventName
      .filter((b) => {
        if (String(b.gameId) !== String(gameid)) return false;
        const gt = (b.gameType || '').toLowerCase();
        return MATCH_ODDS_GAME_TYPES.some((t) => t.toLowerCase() === gt);
      })
      .map((b) => ({
        gameType: b.gameType === 'MATCH_ODDS' ? 'Match Odds' : b.gameType,
        marketName: b.marketName,
        teamName: b.teamName,
        otype: b.otype,
        totalBetAmount: b.betAmount,
        totalPrice: b.price,
      }));
  };

  const marketBetsForCashout =
    Array.isArray(eventName) && oddsData?.[0]?.mname && gameid
      ? eventName.filter(
          (b) =>
            String(b.gameId) === String(gameid) &&
            CASHOUT_GAME_TYPES.includes(b.gameType) &&
            !b.isCashoutHedge &&
            !b.isCashedOut
        )
      : [];

  const hasCashoutAvailable = marketBetsForCashout.length > 0;

  const marketNameKey = matchOddsList?.[0]?.mname || 'MATCH_ODDS';
  const cashoutGameType =
    marketNameKey === 'MATCH_ODDS' || marketNameKey === 'TOURNAMENT_WINNER'
      ? 'Match Odds'
      : 'Winner';
  const cashoutTeams = oddsData.map((item) => item.team);

  const handleCashOutClick = async () => {
    if (!hasCashoutAvailable || cashoutLoading || !onBetSelect) return;

    setCashoutLoading(true);
    try {
      await openCashoutHedgeBet({
        gameId: gameid,
        gameType: cashoutGameType,
        gameName: 'Cricket Game',
        teams: cashoutTeams,
        teamSections: oddsData.map((item) => ({
          team: item.team,
          sid: item.sid,
        })),
        teamOdds: oddsData.map((item) => ({
          team: item.team,
          ...extractMatchOddsTeamOdds(item.odds),
        })),
        onBetSelect,
        marketName: marketNameKey,
        sid: oddsData[0]?.sid || 4,
        minAmount: matchOddsList?.[0]?.min || 0,
        maxAmount: matchOddsList?.[0]?.maxb || matchOddsList?.[0]?.max || 0,
      });
    } finally {
      setCashoutLoading(false);
    }
  };

  // Helper function to format stake/size
  const formatStake = (size) => {
    if (!size || size === 0) return '0';
    if (size < 1000) return size.toFixed(2);
    return `${(size / 1000).toFixed(1)}k`;
  };

  const getMarketCashoutPL = (marketName) => {
    const mname = marketName === 'MATCH_ODDS' ? 'Match Odds' : marketName;
    return cashoutPL?.[mname] || 0;
  };

  const getMarketBets = (marketName) => {
    const amountBets =
      pendingBetAmounts?.filter(
        (item) => item.gameType === 'Match Odds' || item.gameType === marketName
      ) || [];
    // When this market has cashed-out bets, cashoutPL already represents their
    // locked P/L. The pending-bet history still contains those cashed-out legs
    // (betHistory rows are not flagged isCashedOut at cashout time), so using it
    // here would double-count them against cashoutPL. The grouped amounts
    // endpoint already excludes cashed-out bets, so use it instead.
    if (getMarketCashoutPL(marketName)) return amountBets;

    const historyBets = getHistoryMarketBets(marketName);
    return historyBets.length > 0 ? historyBets : amountBets;
  };

  const computeNetOutcome = (team, marketBets, mCashoutPL = 0) => {
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
  };

  const buildPendingBetLeg = (bet) => {
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
  };

  const getProjectedNetOutcome = (team, marketName, bet) => {
    const pendingLeg = buildPendingBetLeg(bet);
    if (!pendingLeg) return null;
    const marketBets = getMarketBets(marketName);
    return computeNetOutcome(
      team,
      [...marketBets, pendingLeg],
      getMarketCashoutPL(marketName)
    );
  };

  const getBetDetails = (team, marketName) => {
    const mCashoutPL = getMarketCashoutPL(marketName);
    const marketBets = getMarketBets(marketName);

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

  const handleOddsClick = (team, rate, type, sid, oname) => {
    if (onBetSelect && rate) {
      // Extract all teams from this matchOddsList
      const allTeams = oddsData.map((item) => item.team);

      const marketName = matchOddsList?.[0]?.mname || 'MATCH_ODDS';
      const gameType =
        marketName === 'MATCH_ODDS' || marketName === 'TOURNAMENT_WINNER'
          ? 'Match Odds'
          : 'Winner';

      onBetSelect({
        team: team,
        odds: rate.toString(),
        type: type, // 'back' or 'lay'
        oname: oname || '',
        stake: '',
        //sid: sid, // Include section id
        teams: allTeams, // Add all teams for MatchOdds
        marketName: marketName,
        gameType: gameType,
        maxAmount: matchOddsList?.[0]?.maxb || matchOddsList?.[0]?.max || 0,
        minAmount: matchOddsList?.[0]?.min || 0,
      });
    }
  };

  // Get max value from API
  const maxValue = matchOddsList?.[0]?.maxb || matchOddsList?.[0]?.max || 0;

  return (
    <div>
      <div className='text-secondary mt-1 flex items-center justify-between bg-secondary85 p-1'>
        <span className='text-[13px] font-bold lg:text-[15px]'>MATCH_ODDS</span>
        {hasCashoutAvailable ? (
          <button
            type='button'
            disabled={cashoutLoading}
            onClick={handleCashOutClick}
            className={`cursor-pointer bg-[#198754] p-1 font-[400] text-white ${
              cashoutLoading ? 'opacity-60' : ''
            }`}
          >
            {cashoutLoading ? '...' : 'Cashout'}
          </button>
        ) : (
          <button
            disabled
            className='cursor-not-allowed bg-[#198754] p-1 font-[400] text-white opacity-60'
          >
            Cashout
          </button>
        )}
      </div>
      <div className='grid grid-cols-[1fr_12%_12%_12%_12%_12%_12%] border-b border-b-[#c7c8ca] lg:grid-cols-[1fr_60px_60px_60px_60px_60px_60px]'>
        <div className='ml-2 text-[12px] font-bold text-[#097c93]'>
          Max:{maxValue}
        </div>
        <div></div>
        <div></div>
        <div className='flex items-center justify-center bg-[#72bbef] p-[2px] font-[16px] font-bold text-[#333]'>
          Back
        </div>
        <div className='flex items-center justify-center bg-[#faa9ba] p-[2px] font-[16px] font-bold text-[#333]'>
          Lay
        </div>
        <div></div>
        <div></div>
      </div>

      {oddsData.length > 0 ? (
        oddsData.map(({ team, odds, sid }, teamIndex) => {
          // Separate back and lay odds
          const backOdds = odds
            .filter((odd) => odd.otype === 'back' && odd.odds > 0)
            .slice(0, 3); // Take only first 3

          const layOdds = odds
            .filter((odd) => odd.otype === 'lay' && odd.odds > 0)
            .slice(0, 3); // Take only first 3

          return (
            <div
              key={teamIndex}
              className='grid grid-cols-[1fr_12%_12%_12%_12%_12%_12%] border-b border-b-[#c7c8ca] hover:bg-[#f7f7f7] lg:grid-cols-[1fr_60px_60px_60px_60px_60px_60px]'
            >
              {/* Team with suggestions */}
              <div className='ml-2 truncate text-[13px] font-bold text-[#333] lg:text-[14px]'>
                <div>{team}</div>
                {(() => {
                  // Check if selectedBet belongs to Match Odds market
                  const isMatchOddsBet =
                    selectedBet?.gameType === 'Match Odds' ||
                    selectedBet?.gameType === 'Winner' ||
                    selectedBet?.marketName === 'MATCH_ODDS' ||
                    selectedBet?.marketName === 'TOURNAMENT_WINNER';

                  const {
                    otype,
                    totalBetAmount,
                    totalPrice,
                    teamName,
                    isHedged,
                    netOutcome,
                  } = getBetDetails(team, matchOddsList?.[0]?.mname);
                  const isMatchedTeam =
                    teamName?.toLowerCase() === team?.toLowerCase();
                  const existingBet =
                    isHedged ||
                    (otype && totalBetAmount) ||
                    (totalPrice && teamName && isMatchedTeam);

                  // Show projected P/L for every outcome when a bet is in the slip
                  if (isMatchOddsBet && selectedBet?.stake) {
                    const projectedNet = getProjectedNetOutcome(
                      team,
                      matchOddsList?.[0]?.mname,
                      selectedBet
                    );
                    const suggestionValue = projectedNet;
                    const suggestionColor =
                      projectedNet === null
                        ? 'green'
                        : projectedNet >= 0
                          ? 'green'
                          : 'red';

                    if (existingBet) {
                      let betColor;
                      let displayValue;

                      if (isHedged && netOutcome !== null) {
                        displayValue = netOutcome;
                        betColor = netOutcome >= 0 ? 'green' : 'red';
                      } else {
                        betColor =
                          otype === 'lay'
                            ? isMatchedTeam
                              ? 'red'
                              : 'green'
                            : otype === 'back'
                              ? isMatchedTeam
                                ? 'green'
                                : 'red'
                              : 'green';

                        displayValue = (() => {
                          if (otype === 'lay') {
                            return isMatchedTeam ? totalPrice : totalBetAmount;
                          } else if (otype === 'back') {
                            return isMatchedTeam ? totalBetAmount : totalPrice;
                          }
                          return '';
                        })();
                      }

                      return (
                        <div className='flex gap-1' style={{ color: betColor }}>
                          {displayValue !== '' &&
                            displayValue !== null &&
                            displayValue !== undefined && (
                              <span className='flex items-center gap-0.5 text-[11px]'>
                                <FaArrowRight />
                                {parseFloat(displayValue).toFixed(2)}
                              </span>
                            )}
                          {suggestionValue !== null && (
                            <span
                              style={{ color: suggestionColor }}
                              className='text-[11px]'
                            >
                              ({suggestionValue.toFixed(2)})
                            </span>
                          )}
                        </div>
                      );
                    } else {
                      // No existing bet, just show suggestion
                      if (suggestionValue !== null) {
                        return (
                          <span
                            style={{ color: suggestionColor }}
                            className='text-[11px]'
                          >
                            ({suggestionValue.toFixed(2)})
                          </span>
                        );
                      }
                    }
                  } else if (existingBet) {
                    let betColor;
                    let displayValue;

                    if (isHedged && netOutcome !== null) {
                      displayValue = netOutcome;
                      betColor = netOutcome >= 0 ? 'green' : 'red';
                    } else {
                      betColor =
                        otype === 'lay'
                          ? isMatchedTeam
                            ? 'red'
                            : 'green'
                          : otype === 'back'
                            ? isMatchedTeam
                              ? 'green'
                              : 'red'
                            : 'green';

                      displayValue = (() => {
                        if (otype === 'lay') {
                          return isMatchedTeam ? totalPrice : totalBetAmount;
                        } else if (otype === 'back') {
                          return isMatchedTeam ? totalBetAmount : totalPrice;
                        }
                        return '';
                      })();
                    }

                    return (
                      <div className='flex gap-1' style={{ color: betColor }}>
                        {displayValue !== '' &&
                          displayValue !== null &&
                          displayValue !== undefined && (
                            <span className='flex items-center gap-0.5 text-[11px]'>
                              <FaArrowRight />
                              {parseFloat(displayValue).toFixed(2)}
                            </span>
                          )}
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>

              {/* BACK - Fill 3 slots */}
              {[0, 1, 2].map((i) => {
                const backItem = backOdds[i];
                const formattedOdds = backItem ? backItem.odds : null;
                return (
                  <div
                    key={`back-${i}`}
                    className={`${backBg[i]} flex min-h-[30px] max-w-[100%] flex-col items-center justify-center ${formattedOdds ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                    onClick={() =>
                      formattedOdds &&
                      handleOddsClick(
                        team,
                        formattedOdds,
                        'back',
                        sid,
                        backItem?.oname
                      )
                    }
                  >
                    {formattedOdds ? (
                      <>
                        <span className='text-[15px] leading-4 font-bold text-[#333] lg:text-[16px]'>
                          {formattedOdds}
                        </span>
                        <span className='text-[11px] leading-4 font-[100] text-[#333] lg:text-[12px]'>
                          {formatStake(backItem.size)}
                        </span>
                      </>
                    ) : (
                      <span className='text-[15px] leading-4 font-bold text-[#333] lg:text-[16px]'>
                        -
                      </span>
                    )}
                  </div>
                );
              })}

              {/* LAY - Fill 3 slots */}
              {[0, 1, 2].map((i) => {
                const layItem = layOdds[i];
                const formattedOdds = layItem ? layItem.odds : null;
                return (
                  <div
                    key={`lay-${i}`}
                    className={`${layBg[i]} flex min-h-[30px] max-w-[100%] flex-col items-center justify-center ${formattedOdds ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                    onClick={() =>
                      formattedOdds &&
                      handleOddsClick(
                        team,
                        formattedOdds,
                        'lay',
                        sid,
                        layItem?.oname
                      )
                    }
                  >
                    {formattedOdds ? (
                      <>
                        <span className='text-[15px] leading-4 font-bold text-[#333] lg:text-[16px]'>
                          {formattedOdds}
                        </span>
                        <span className='text-[11px] leading-4 font-[100] text-[#333] lg:text-[12px]'>
                          {formatStake(layItem.size)}
                        </span>
                      </>
                    ) : (
                      <span className='text-[15px] leading-4 font-bold text-[#333] lg:text-[16px]'>
                        -
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })
      ) : (
        <div className='py-4 text-center text-gray-500'>
          No match odds available
        </div>
      )}
    </div>
  );
}

export default MatchOdds;
