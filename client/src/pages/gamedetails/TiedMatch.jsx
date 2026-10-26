import React, { useState } from 'react';
import TeamOutcomeLabels from './components/TeamOutcomeLabels';
import { useMarketNetOutcome } from './hooks/useMarketNetOutcome';

const MARKET_GAME_TYPES = ['Tied Match'];
function TiedMatch({
  onBetSelect,
  tiedMatchList,
  pendingBetAmounts,
  selectedBet,
  gameid,
}) {
  const { getBetDetails, getProjectedNetOutcome, isSelectedBetInMarket } =
    useMarketNetOutcome({
      gameTypes: MARKET_GAME_TYPES,
      gameId: gameid,
      cashoutPLKey: 'Tied Match',
      // Tied Match uses Bookmaker math (odds / 100), not Match Odds (odds - 1)
      oddsStyle: 'bookmaker',
    });
  console.log('tiedmatch from tiedmatch', tiedMatchList);
  const backBg = ['bg-[#72bbef7f]', 'bg-[#72bbefbf]', 'bg-[#72bbef]'];
  const layBg = ['bg-[#faa9ba]', 'bg-[#faa9babf]', 'bg-[#faa9ba7f]'];
  const [showCashoutOptions, setShowCashoutOptions] = useState(false);
  // Transform API data similar to MatchOdds/Bookmaker
  const tiedMatchData = tiedMatchList?.[0]?.section?.length
    ? tiedMatchList[0].section.map((sec) => ({
        team: sec.nat,
        sid: sec.sid,
        odds: sec.odds,
        max: sec.maxb || sec.max,
        min: sec.min,
        mname: tiedMatchList[0].mname || 'Tied Match',
        gstatus: sec.gstatus,
        status: tiedMatchList[0].status,
      }))
    : [];

  // Helper function to format stake/size
  const formatStake = (size) => {
    if (!size || size === 0) return '0';
    if (size < 1000) return size.toFixed(0);
    return `${(size / 1000).toFixed(1)}k`;
  };

  const handleOddsClick = (team, rate, type, sid, oname) => {
    if (onBetSelect && rate && rate !== 0) {
      // Extract all teams/options from TiedMatch (typically YES/NO)
      const allTeams = tiedMatchData.map((item) => item.team);

      onBetSelect({
        team: team,
        odds: rate.toString(),
        type: type, // 'back' or 'lay'
        oname: oname || '',
        stake: '',
        // sid: sid, // Include section id
        teams: allTeams, // Add all options (YES/NO) for TiedMatch
        marketName: tiedMatchList?.[0]?.mname || 'Tied Match',
        gameType: 'Tied Match',
        maxAmount: tiedMatchList?.[0]?.maxb || tiedMatchList?.[0]?.max || 0,
        minAmount: tiedMatchList?.[0]?.min || 0,
      });
    }
  };

  // Get max value from API
  const maxValue = tiedMatchList?.[0]?.maxb || tiedMatchList?.[0]?.max || 0;

  return (
    <div>
      <div className='text-secondary mt-1 flex items-center justify-between bg-secondary85 p-1'>
        <span className='text-[13px] font-bold lg:text-[15px]'>TIED MATCH</span>
        <button
          disabled={!showCashoutOptions}
          className={`p-1 font-[400] text-white ${
            showCashoutOptions
              ? 'cursor-pointer bg-[#198754]'
              : ' bg-[#198754] opacity-60'
          }`}
        >
          Cashout
        </button>
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
      {tiedMatchData.length > 0 ? (
        tiedMatchData.map(({ team, odds, sid, gstatus }, teamIndex) => {
          const isSuspended = gstatus === 'SUSPENDED';
          // Get back and lay odds (Tied Match typically has only 1 back and 1 lay)
          // API order: back3, back2, back1, lay1, lay2, lay3 (left → right)
          const backOdds = odds.filter((odd) => odd.otype === 'back').slice(0, 3);
          const layOdds = odds.filter((odd) => odd.otype === 'lay').slice(0, 3);

          return (
            <div
              key={teamIndex}
              className='grid grid-cols-[1fr_12%_12%_12%_12%_12%_12%] border-b border-b-[#c7c8ca] hover:bg-[#f7f7f7] lg:grid-cols-[1fr_60px_60px_60px_60px_60px_60px]'
            >
              {/* Team with suggestions */}
              <div className='ml-2 truncate text-[13px] font-bold text-[#333] lg:text-[14px]'>
                <div>{team}</div>
                <TeamOutcomeLabels
                  team={team}
                  selectedBet={selectedBet}
                  getBetDetails={getBetDetails}
                  getProjectedNetOutcome={getProjectedNetOutcome}
                  isSelectedBetInMarket={isSelectedBetInMarket}
                />
              </div>

              {isSuspended ? (
                <div className='col-span-6 flex min-h-[30px] items-center justify-center bg-[#4b4b4b]'>
                  <span className='font-bold tracking-wide text-red-600'>
                    SUSPENDED
                  </span>
                </div>
              ) : (
                <>
                  {/* BACK - Fill 3 slots */}
                  {[0, 1, 2].map((i) => {
                    const backItem = backOdds[i];
                    const hasOdds = backItem && backItem.odds > 0;
                    return (
                      <div
                        key={`back-${i}`}
                        className={`${backBg[i]} flex min-h-[30px] max-w-[100%] flex-col items-center justify-center ${hasOdds ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                        onClick={() =>
                          hasOdds &&
                          handleOddsClick(
                            team,
                            backItem.odds,
                            'back',
                            sid,
                            backItem?.oname
                          )
                        }
                      >
                        {hasOdds ? (
                          <>
                            <span className='text-[15px] leading-4 font-bold text-[#333] lg:text-[16px]'>
                              {backItem.odds}
                            </span>
                            <span className='text-[11px] leading-4 font-[100] text-[#333] lg:text-[12px]'>
                              {formatStake(backItem.size)}
                            </span>
                          </>
                        ) : (
                          <span className='text-[16px] leading-4 font-bold text-[#333]'>
                            -
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* LAY - Fill 3 slots */}
                  {[0, 1, 2].map((i) => {
                    const layItem = layOdds[i];
                    const hasOdds = layItem && layItem.odds > 0;
                    return (
                      <div
                        key={`lay-${i}`}
                        className={`${layBg[i]} flex min-h-[30px] max-w-[100%] flex-col items-center justify-center ${hasOdds ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                        onClick={() =>
                          hasOdds &&
                          handleOddsClick(
                            team,
                            layItem.odds,
                            'lay',
                            sid,
                            layItem?.oname
                          )
                        }
                      >
                        {hasOdds ? (
                          <>
                            <span className='text-[15px] leading-4 font-bold text-[#333] lg:text-[16px]'>
                              {layItem.odds}
                            </span>
                            <span className='text-[11px] leading-4 font-[100] text-[#333] lg:text-[12px]'>
                              {formatStake(layItem.size)}
                            </span>
                          </>
                        ) : (
                          <span className='text-[16px] leading-4 font-bold text-[#333]'>
                            -
                          </span>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })
      ) : (
        <div className='py-4 text-center text-gray-500'>
          No tied match data available
        </div>
      )}
    </div>
  );
}

export default TiedMatch;
