import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaArrowRight } from 'react-icons/fa';
import { getPendingBetAmo, getPendingBet } from '../../redux/reducer/betReducer';
import { openCashoutHedgeBet } from './utils/openCashoutHedgeBet';
import { extractBookmakerTeamOdds } from './utils/extractMarketTeamOdds';

function Bookmaker2({
  onBetSelect,
  BookmakerList,
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

  // Transform API data similar to MatchOdds
  const bookmakerData = BookmakerList?.[0]?.section?.length
    ? BookmakerList[0].section.map((sec) => ({
        team: sec.nat,
        sid: sec.sid,
        odds: sec.odds,
        max: sec.maxb || sec.max,
        min: sec.min,
        mname: BookmakerList[0].mname || 'Bookmaker 2',
        gstatus: sec.gstatus,
        status: BookmakerList[0].status,
      }))
    : [];
  console.log('bookmakerData from bookmaker', bookmakerData);

  const CASHOUT_GAME_TYPES = ['Bookmaker 2'];

  const marketBetsForCashout =
    Array.isArray(eventName) && gameid
      ? eventName.filter(
          (b) =>
            String(b.gameId) === String(gameid) &&
            CASHOUT_GAME_TYPES.includes(b.gameType) &&
            !b.isCashoutHedge &&
            !b.isCashedOut
        )
      : [];

  const hasCashoutAvailable = marketBetsForCashout.length > 0;
  const cashoutTeams = bookmakerData.map((item) => item.team);

  const handleCashOutClick = async () => {
    if (!hasCashoutAvailable || cashoutLoading || !onBetSelect) return;

    setCashoutLoading(true);
    try {
      await openCashoutHedgeBet({
        gameId: gameid,
        gameType: 'Bookmaker 2',
        gameName: 'Cricket Game',
        teams: cashoutTeams,
        teamSections: bookmakerData.map((item) => ({
          team: item.team,
          sid: item.sid,
        })),
        teamOdds: bookmakerData.map((item) => ({
          team: item.team,
          ...extractBookmakerTeamOdds(item.odds),
        })),
        onBetSelect,
        marketName: BookmakerList?.[0]?.mname || 'Bookmaker 2',
        sid: bookmakerData[0]?.sid || 4,
        minAmount: BookmakerList?.[0]?.min || 0,
        maxAmount: BookmakerList?.[0]?.maxb || BookmakerList?.[0]?.max || 0,
      });
    } finally {
      setCashoutLoading(false);
    }
  };

  const formatMax = (max) => {
    if (!max || max === 0) return '0';
    if (max >= 100000) return `${(max / 100000).toFixed(0)}L`;
    if (max >= 1000) return `${(max / 1000).toFixed(0)}k`;
    return max.toString();
  };

  const BOOKMAKER_GAME_TYPES = ['Bookmaker 2'];

  const getHistoryMarketBets = () => {
    if (!Array.isArray(eventName) || !gameid) return [];
    return eventName
      .filter(
        (b) =>
          String(b.gameId) === String(gameid) &&
          BOOKMAKER_GAME_TYPES.includes(b.gameType)
      )
      .map((b) => ({
        teamName: b.teamName,
        otype: b.otype,
        totalBetAmount: b.betAmount,
        totalPrice: b.price,
      }));
  };

  const getMarketCashoutPL = () => cashoutPL?.['Bookmaker 2'] || 0;

  const getMarketBets = () => {
    const amountBets =
      pendingBetAmounts?.filter((item) =>
        BOOKMAKER_GAME_TYPES.includes(item.gameType)
      ) || [];
    // When this market has cashed-out bets, cashoutPL already represents their
    // locked P/L. The pending-bet history still contains those cashed-out legs
    // (betHistory rows are not flagged isCashedOut at cashout time), so using it
    // here would double-count them against cashoutPL. The grouped amounts
    // endpoint already excludes cashed-out bets, so use it instead.
    if (getMarketCashoutPL()) return amountBets;

    const historyBets = getHistoryMarketBets();
    if (historyBets.length > 0) return historyBets;
    return amountBets;
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
      totalBetAmount: isLay ? stakeNum : stakeNum * (oddsNum / 100),
      totalPrice: isLay ? stakeNum * (oddsNum / 100) : stakeNum,
    };
  };

  const getProjectedNetOutcome = (team, bet) => {
    const pendingLeg = buildPendingBetLeg(bet);
    if (!pendingLeg) return null;
    return computeNetOutcome(
      team,
      [...getMarketBets(), pendingLeg],
      getMarketCashoutPL()
    );
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

  const handleOddsClick = (team, rate, type, sid, oname) => {
    if (onBetSelect && rate && rate !== 0) {
      // Extract all teams from this BookmakerList
      const allTeams = bookmakerData.map((item) => item.team);

      onBetSelect({
        team: team,
        odds: rate.toString(),
        type: type, // 'back' or 'lay'
        oname: oname || '',
        stake: '',
        //sid: sid, // Include section id
        teams: allTeams, // Add all teams for Bookmaker
        marketName: BookmakerList?.[0]?.mname || 'Bookmaker 2',
        gameType: 'Bookmaker 2',
        maxAmount: BookmakerList?.[0]?.maxb || BookmakerList?.[0]?.max || 0,
        minAmount: BookmakerList?.[0]?.min || 0,
      });
    }
  };

  // Get min and max from API
  const minValue = BookmakerList?.[0]?.min || 0;
  const maxValue = BookmakerList?.[0]?.maxb || BookmakerList?.[0]?.max || 0;

  return (
    <div>
      <div className='text-secondary mt-1 flex items-center justify-between bg-secondary85 p-1'>
        <span className='text-[13px] font-bold lg:text-[15px]'>Bookmaker 2</span>
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
      <div className='grid grid-cols-[1fr_60px_60px] border-b border-b-[#c7c8ca]'>
        <div className='ml-2 flex items-center text-[12px] font-bold text-[#097c93]'>
          Min: {minValue} Max: {formatMax(maxValue)}
        </div>
        <div className='flex items-center justify-center bg-[#72bbef] p-[2px] font-[16px] font-bold text-[#333]'>
          Back
        </div>
        <div className='flex items-center justify-center bg-[#faa9ba] p-[2px] font-[16px] font-bold text-[#333]'>
          Lay
        </div>
      </div>

      {bookmakerData.length > 0 ? (
        bookmakerData.map(({ team, odds, sid, gstatus }, teamIndex) => {
          const isSuspended = gstatus === 'SUSPENDED';
          const backOdds = (odds || []).filter((odd) => odd.otype === 'back');
          const layOdds = (odds || []).filter((odd) => odd.otype === 'lay');
          const backItem = backOdds[backOdds.length - 1];
          const layItem = layOdds[0];

          return (
            <div
              key={teamIndex}
              className='grid grid-cols-[1fr_60px_60px] border-b border-b-[#c7c8ca] hover:bg-[#f7f7f7]'
            >
              {/* Team Name with suggestions */}
              <div className='ml-2 truncate text-[13px] font-bold text-[#333] lg:text-[14px]'>
                <div>{team}</div>
                {(() => {
                  const isBookmakerBet =
                    selectedBet?.gameType === 'Bookmaker 2' ||
                    selectedBet?.marketName === 'Bookmaker 2';

                  const {
                    otype,
                    totalBetAmount,
                    totalPrice,
                    teamName,
                    isHedged,
                    netOutcome,
                  } = getBetDetails(team);
                  const isMatchedTeam =
                    teamName?.toLowerCase() === team?.toLowerCase();
                  const existingBet =
                    isHedged ||
                    (otype && totalBetAmount) ||
                    (totalPrice && teamName && isMatchedTeam);

                  if (isBookmakerBet && selectedBet?.stake) {
                    const projectedNet = getProjectedNetOutcome(
                      team,
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
                              ({parseFloat(suggestionValue).toFixed(2)})
                            </span>
                          )}
                        </div>
                      );
                    } else {
                      if (suggestionValue !== null) {
                        return (
                          <span
                            style={{ color: suggestionColor }}
                            className='text-[11px]'
                          >
                            ({parseFloat(suggestionValue).toFixed(2)})
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

              {isSuspended ? (
                <div className='col-span-2 flex min-h-[30px] items-center justify-center bg-[#4b4b4b]'>
                  <span className='text-[14px] font-bold tracking-wide text-red-600 lg:text-[16px]'>
                    SUSPENDED
                  </span>
                </div>
              ) : (
                <>
                  <div
                    className={`flex min-h-[30px] max-w-[100%] flex-col items-center justify-center bg-[#72bbef] ${backItem?.odds > 0 ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                    onClick={() =>
                      backItem?.odds > 0 &&
                      handleOddsClick(
                        team,
                        backItem.odds,
                        'back',
                        sid,
                        backItem?.oname
                      )
                    }
                  >
                    {backItem?.odds > 0 ? (
                      <>
                        <span className='text-[15px] leading-4 font-bold text-[#333] lg:text-[16px]'>
                          {backItem.odds}
                        </span>
                        <span className='text-[11px] leading-4 font-[100] text-[#333] lg:text-[12px]'>
                          {backItem.size || 0}
                        </span>
                      </>
                    ) : (
                      <span className='text-[16px] font-bold text-[#333]'>-</span>
                    )}
                  </div>
                  <div
                    className={`flex min-h-[30px] max-w-[100%] flex-col items-center justify-center bg-[#faa9ba] ${layItem?.odds > 0 ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                    onClick={() =>
                      layItem?.odds > 0 &&
                      handleOddsClick(
                        team,
                        layItem.odds,
                        'lay',
                        sid,
                        layItem?.oname
                      )
                    }
                  >
                    {layItem?.odds > 0 ? (
                      <>
                        <span className='text-[15px] leading-4 font-bold text-[#333] lg:text-[16px]'>
                          {layItem.odds}
                        </span>
                        <span className='text-[11px] leading-4 font-[100] text-[#333] lg:text-[12px]'>
                          {layItem.size || 0}
                        </span>
                      </>
                    ) : (
                      <span className='text-[16px] font-bold text-[#333]'>-</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })
      ) : (
        <div className='py-4 text-center text-gray-500'>
          No bookmaker data available
        </div>
      )}
    </div>
  );
}

export default Bookmaker2;

// import React from "react";
// import { FaArrowRight } from "react-icons/fa";

// function Bookmaker({ onBetSelect, BookmakerList, pendingBetAmounts, selectedBet }) {
//   const backBg = ["bg-[#72bbef7f]", "bg-[#72bbefbf]", "bg-[#72bbef]"];
//   const layBg = ["bg-[#faa9ba]", "bg-[#faa9babf]", "bg-[#faa9ba7f]"];

//   const bookmakerData = BookmakerList?.[0]?.section?.length
//     ? BookmakerList[0].section.map((sec) => ({
//         team: sec.nat,
//         sid: sec.sid,
//         odds: sec.odds || [],
//         max: sec.max,
//         min: sec.min,
//         gstatus: sec.gstatus,
//         mname: BookmakerList[0].mname || "Bookmaker",
//       }))
//     : [];

//   const formatStake = (size) => {
//     if (!size || size === 0) return "0";
//     if (size < 1000) return size.toFixed(0);
//     return `${(size / 1000).toFixed(1)}k`;
//   };

//   const formatMax = (max) => {
//     if (!max || max === 0) return "0";
//     if (max < 1000) return max.toString();
//     return `${(max / 1000).toFixed(0)}K`;
//   };

//   const handleOddsClick = (team, rate, type, sid, gstatus) => {
//     if (gstatus === "SUSPENDED") return;

//     if (onBetSelect && rate && rate !== 0) {
//       const allTeams = bookmakerData.map((item) => item.team);

//       onBetSelect({
//         team,
//         odds: rate.toString(),
//         type,
//         stake: "",
//         sid,
//         teams: allTeams,
//         marketName: "Bookmaker",
//         gameType: "Bookmaker",
//         maxAmount: BookmakerList?.[0]?.max || 0,
//         minAmount: BookmakerList?.[0]?.min || 0,
//       });
//     }
//   };

//   const minValue = BookmakerList?.[0]?.min || 0;
//   const maxValue = BookmakerList?.[0]?.max || 0;

//   return (
//     <div>
//       {/* HEADER */}
//       <div className="bg-[#2C3E50D9] flex justify-between items-center p-1 mt-1 text-secondary">
//         <span className="text-[13px] lg:text-[15px] font-bold">Bookmaker</span>
//         <button className="bg-[#198754] text-white p-1">Cashout</button>
//       </div>

//       {/* COLUMN HEADER */}
//       <div className="grid grid-cols-[1fr_12%_12%_12%_12%_12%_12%] border-b">
//         <div className="text-[#097c93] text-[12px] font-bold ml-2">
//           Min: {minValue} Max: {formatMax(maxValue)}
//         </div>
//         <div></div><div></div>
//         <div className="bg-[#72bbef] text-center font-bold">Back</div>
//         <div className="bg-[#faa9ba] text-center font-bold">Lay</div>
//         <div></div><div></div>
//       </div>

//       {/* DATA ROWS */}
//       {bookmakerData.length > 0 ? (
//         bookmakerData.map(({ team, odds, sid, gstatus }, idx) => {
//           const isSuspended = gstatus === "SUSPENDED";

//           const backOdds = odds.filter(o => o.otype === "back").slice(0, 3);
//           const layOdds = odds.filter(o => o.otype === "lay").slice(0, 3);

//           return (
//             <div
//               key={idx}
//               className="grid grid-cols-[1fr_12%_12%_12%_12%_12%_12%] border-b hover:bg-[#f7f7f7]"
//             >
//               {/* TEAM */}
//               <div className="ml-2 font-bold text-[13px] truncate">
//                 {team}
//               </div>

//               {/* SUSPENDED VIEW */}
//               {isSuspended ? (
//                 <div className="col-span-6 flex justify-center items-center bg-[#4b4b4b] min-h-[30px]">
//                   <span className="text-red-600 font-bold tracking-wide">
//                     SUSPENDED
//                   </span>
//                 </div>
//               ) : (
//                 <>
//                   {/* BACK */}
//                   {[0, 1, 2].map((i) => {
//                     const item = backOdds[i];
//                     const hasOdds = item && item.odds > 0;
//                     return (
//                       <div
//                         key={`back-${i}`}
//                         className={`${backBg[i]} flex flex-col items-center justify-center min-h-[30px] ${
//                           hasOdds ? "cursor-pointer hover:opacity-80" : ""
//                         }`}
//                         onClick={() =>
//                           hasOdds &&
//                           handleOddsClick(team, item.odds, "back", sid, gstatus)
//                         }
//                       >
//                         {hasOdds ? (
//                           <>
//                             <span className="font-bold">{item.odds}</span>
//                             <span className="text-[11px]">
//                               {formatStake(item.size)}
//                             </span>
//                           </>
//                         ) : (
//                           <span>-</span>
//                         )}
//                       </div>
//                     );
//                   })}

//                   {/* LAY */}
//                   {[0, 1, 2].map((i) => {
//                     const item = layOdds[i];
//                     const hasOdds = item && item.odds > 0;
//                     return (
//                       <div
//                         key={`lay-${i}`}
//                         className={`${layBg[i]} flex flex-col items-center justify-center min-h-[30px] ${
//                           hasOdds ? "cursor-pointer hover:opacity-80" : ""
//                         }`}
//                         onClick={() =>
//                           hasOdds &&
//                           handleOddsClick(team, item.odds, "lay", sid, gstatus)
//                         }
//                       >
//                         {hasOdds ? (
//                           <>
//                             <span className="font-bold">{item.odds}</span>
//                             <span className="text-[11px]">
//                               {formatStake(item.size)}
//                             </span>
//                           </>
//                         ) : (
//                           <span>-</span>
//                         )}
//                       </div>
//                     );
//                   })}
//                 </>
//               )}
//             </div>
//           );
//         })
//       ) : (
//         <div className="text-center py-4 text-gray-500">
//           No bookmaker data available
//         </div>
//       )}
//     </div>
//   );
// }

// export default Bookmaker;
