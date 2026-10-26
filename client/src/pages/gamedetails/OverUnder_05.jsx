import React, { useState } from 'react';
import TeamOutcomeLabels from './components/TeamOutcomeLabels';
import { useMarketNetOutcome } from './hooks/useMarketNetOutcome';

const MARKET_GAME_TYPES = ['OVER_UNDER_05'];
function OverUnder_05({
  onBetSelect,
  matcUnder5List,
  pendingBetAmounts,
  selectedBet,
  gameid,
}) {
  const { getBetDetails, getProjectedNetOutcome, isSelectedBetInMarket } =
    useMarketNetOutcome({
      gameTypes: MARKET_GAME_TYPES,
      gameId: gameid,
      cashoutPLKey: 'OVER_UNDER_05',
    });
  const backBg = ['bg-[#72bbef7f]', 'bg-[#72bbefbf]', 'bg-[#72bbef]'];
  const layBg = ['bg-[#faa9ba]', 'bg-[#faa9babf]', 'bg-[#faa9ba7f]'];
  const [showCashoutOptions, setShowCashoutOptions] = useState(false);
  console.log('matcUnder5List from OverUnder_05', matcUnder5List);
  // Transform API data similar to MatchOdds component
  const oddsData = matcUnder5List?.[0]?.section?.length
    ? matcUnder5List[0].section.map((sec) => ({
        team: sec.nat,
        sid: sec.sid,
        odds: sec.odds,
        max: sec.max,
        min: sec.min,
        mname: matcUnder5List[0].mname,
        gstatus: sec.gstatus,
        status: matcUnder5List[0].status,
      }))
    : [];

  // Helper function to format stake/size
  const formatStake = (size) => {
    if (!size || size === 0) return '0';
    if (size < 1000) return size.toFixed(2);
    return `${(size / 1000).toFixed(1)}k`;
  };

  const handleOddsClick = (team, rate, type, sid, oname) => {
    if (onBetSelect && rate) {
      // Extract all teams/options from OverUnder (e.g., "Over 0.5 Goals", "Under 0.5 Goals")
      const allTeams = oddsData.map((item) => item.team);

      onBetSelect({
        team: team,
        odds: rate.toString(),
        type: type, // 'back' or 'lay'
        oname: oname || '',
        stake: '',
        //sid: sid, // Include section id
        teams: allTeams, // Add all options for OverUnder
        marketName: 'OVER_UNDER_05',
        gameType: 'OVER_UNDER_05',
        maxAmount: matcUnder5List?.[0]?.max || matcUnder5List?.[0]?.maxb || 0,
        minAmount: matcUnder5List?.[0]?.min || 0,
      });
    }
  };

  // Get max value from API
  const maxValue = matcUnder5List?.[0]?.max || matcUnder5List?.[0]?.maxb || 0;
  return (
    <div>
      <div className='text-secondary mt-1 flex items-center justify-between bg-secondary85 p-1'>
        <span className='text-[13px] font-bold lg:text-[15px]'>
          OVER_UNDER_05
        </span>
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

      {oddsData.length > 0 ? (
        oddsData.map(({ team, odds, sid, gstatus }, teamIndex) => {
          const isSuspended = gstatus === 'SUSPENDED';
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
                </>
              )}
            </div>
          );
        })
      ) : (
        <div className='py-4 text-center text-gray-500'>No data available</div>
      )}
    </div>
  );
}

export default OverUnder_05;
