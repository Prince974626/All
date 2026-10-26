import React, { useMemo } from 'react';
import { FaArrowRight } from 'react-icons/fa';

function OddEven({ onBetSelect, oddEvenData, pendingBetAmounts, selectedBet }) {
  console.log('oddEvenData from oddEven', oddEvenData);

  // Helper function to format max value (handle numbers and strings like "1L")
  const formatMax = (max) => {
    if (typeof max === 'string') return max;
    if (max >= 100000) return `${(max / 100000).toFixed(0)}L`;
    if (max >= 1000) return `${(max / 1000).toFixed(0)}k`;
    return max;
  };

  // Transform API data to component format
  const transformedData = useMemo(() => {
    if (!oddEvenData || oddEvenData.length === 0) {
      return [];
    }

    return oddEvenData.map((item, index) => {
      // Get back and lay odds
      const backOdd = item.odds?.find((odd) => odd.otype === 'back');
      const layOdd = item.odds?.find((odd) => odd.otype === 'lay');

      return {
        id: index + 1,
        label: item.team || `Item ${index + 1}`,
        no:
          backOdd && backOdd.odds > 0
            ? {
                rate: backOdd.odds,
                size: backOdd.size || 0,
              }
            : { rate: null, size: null },
        yes:
          layOdd && layOdd.odds > 0
            ? {
                rate: layOdd.odds,
                size: layOdd.size || 0,
              }
            : { rate: null, size: null },
        min: item.min || 0,
        max: formatMax(item.max || 0),
        sid: item.sid,
        status: item.status, // Status from API
      };
    });
  }, [oddEvenData]);

  // Split data into left and right columns
  const mid = Math.ceil(transformedData.length / 2);
  const leftData = transformedData.slice(0, mid);
  const rightData = transformedData.slice(mid);

  const getBetDetails = (team) => {
    const marketBets =
      pendingBetAmounts?.filter(
        (item) =>
          item.gameType === 'oddeven' &&
          item.marketName?.toLowerCase() === team?.toLowerCase()
      ) || [];

    if (marketBets.length === 0) {
      return { hasBet: false, displayValue: null, color: 'red' };
    }

    let oddOutcome = 0;
    let evenOutcome = 0;

    marketBets.forEach((bet) => {
      const isOddSelection = bet.teamName?.toLowerCase() === 'odd';
      const betAmt = Number(bet.totalBetAmount) || 0;
      const stake = Number(bet.totalPrice) || 0;

      if (bet.otype === 'back') {
        oddOutcome += isOddSelection ? betAmt : -stake;
        evenOutcome += isOddSelection ? -stake : betAmt;
      } else {
        // Keep this branch for safety in case lay bets are introduced later.
        oddOutcome += isOddSelection ? -stake : betAmt;
        evenOutcome += isOddSelection ? betAmt : -stake;
      }
    });

    const worstOutcome = Math.min(oddOutcome, evenOutcome);
    const bestOutcome = Math.max(oddOutcome, evenOutcome);

    if (worstOutcome < 0) {
      return {
        hasBet: true,
        displayValue: Math.round(Math.abs(worstOutcome) * 100) / 100,
        color: 'red',
      };
    }

    return {
      hasBet: true,
      displayValue: Math.round(bestOutcome * 100) / 100,
      color: 'green',
    };
  };

  const handleOddsClick = (team, rate, type, sid, min, max) => {
    if (onBetSelect && rate) {
      // The provider exposes a single section per odd/even proposition with
      // back/lay odds. The user's mental model treats the back column as
      // "back Odd" and the lay column as "back Even" — two independent
      // outcomes. Store each click as a back bet on a synthetic runner
      // ("Odd" / "Even") scoped by the proposition as marketName, mirroring
      // how fancy1 stores one row = one market. Exposure offsets like Match
      // Odds within the same proposition; settlement matches proposition by
      // fancyId and compares teamName to the parsed result parity.
      const side = type === 'back' ? 'Odd' : 'Even';
      onBetSelect({
        team: side,
        odds: rate.toString(),
        type: 'back',
        stake: '',
        teams: ['Odd', 'Even'],
        marketName: team,
        gameType: 'oddeven',
        maxAmount: max || 0,
        minAmount: min || 0,
      });
    }
  };
  return (
    <div>
      <div className='text-secondary mt-1 flex items-center justify-between bg-secondary85 p-1'>
        <span className='text-[15px] font-bold'>OddEven</span>
      </div>
      <div className='grid grid-cols-1 gap-0 lg:grid-cols-2 lg:gap-2'>
        <div className=''>
          {leftData.length > 0 ? (
            leftData.map((item) => {
              const hasStatus = item.status && item.status.trim() !== '';

              return (
                <div
                  key={item.id}
                  className='grid grid-cols-[1fr_60px_60px] border-b border-b-[#c7c8ca] hover:bg-[#f7f7f7] lg:grid-cols-[1fr_60px_60px_60px]'
                >
                  <div className='ml-2 text-[13px] font-[400] text-[#333]'>
                    <div>{item.label}</div>
                    {(() => {
                      const { hasBet, displayValue, color } = getBetDetails(
                        item.label
                      );

                      if (hasBet && displayValue !== null) {
                        return (
                          <div className='flex gap-1 text-[11px]'>
                            {displayValue > 0 && (
                              <span
                                className='flex items-center gap-0.5'
                                style={{ color }}
                              >
                                <FaArrowRight />
                                {displayValue}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {hasStatus ? (
                    <div className='col-span-2 flex min-h-[30px] items-center justify-center bg-[#4b4b4b] lg:col-span-3'>
                      <span className='text-[14px] font-bold tracking-wide text-red-600 lg:text-[16px]'>
                        {item.status}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`flex min-h-[30px] flex-col items-center justify-center bg-[#72bbef] ${item.no.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                        onClick={() =>
                          item.no.rate &&
                          handleOddsClick(
                            item.label,
                            item.no.rate,
                            'back',
                            item.sid,
                            item.min,
                            item.max
                          )
                        }
                      >
                        {item.no.rate ? (
                          <>
                            <span className='text-[16px] font-bold'>
                              {item.no.rate}
                            </span>
                            <span className='text-[12px]'>{item.no.size}</span>
                          </>
                        ) : (
                          <span className='text-[16px] font-bold'>-</span>
                        )}
                      </div>

                      <div
                        className={`flex min-h-[30px] flex-col items-center justify-center bg-[#faa9ba] ${item.yes.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                        onClick={() =>
                          item.yes.rate &&
                          handleOddsClick(
                            item.label,
                            item.yes.rate,
                            'lay',
                            item.sid,
                            item.min,
                            item.max
                          )
                        }
                      >
                        {item.yes.rate ? (
                          <>
                            <span className='text-[16px] font-bold'>
                              {item.yes.rate}
                            </span>
                            <span className='text-[12px]'>{item.yes.size}</span>
                          </>
                        ) : (
                          <span className='text-[16px] font-bold'>-</span>
                        )}
                      </div>

                      <div className='hidden flex-col items-center justify-center lg:flex'>
                        <span className='text-[10px] leading-4 font-bold text-[#097c93]'>
                          Min:{item.min}
                        </span>
                        <span className='text-[10px] leading-4 font-bold text-[#097c93]'>
                          Max:{item.max}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div className='py-4 text-center text-gray-500'>
              No data available
            </div>
          )}
        </div>
        <div className=''>
          {/* <div className="grid grid-cols-[1fr_60px_60px] lg:grid-cols-[1fr_60px_60px_60px] border-b border-b-[#c7c8ca]">
            <div></div>
            <div className="bg-[#72bbef] p-[2px] hidden lg:flex justify-center items-center font-[16px] font-bold text-[#333]  ">
              Back
            </div>
            <div className="bg-[#faa9ba] p-[2px] hidden lg:flex justify-center items-center font-[16px] font-bold text-[#333] ">
              Lay
            </div>
            <div></div>
          </div> */}
          {rightData.length > 0 ? (
            rightData.map((item) => {
              const hasStatus = item.status && item.status.trim() !== '';

              return (
                <div
                  key={item.id}
                  className='grid grid-cols-[1fr_60px_60px] border-b border-b-[#c7c8ca] hover:bg-[#f7f7f7] lg:grid-cols-[1fr_60px_60px_60px]'
                >
                  <div className='ml-2 text-[13px] font-[400] text-[#333]'>
                    <div>{item.label}</div>
                    {(() => {
                      const { hasBet, displayValue, color } = getBetDetails(
                        item.label
                      );

                      if (hasBet && displayValue !== null) {
                        return (
                          <div className='flex gap-1 text-[11px]'>
                            {displayValue > 0 && (
                              <span
                                className='flex items-center gap-0.5'
                                style={{ color }}
                              >
                                <FaArrowRight />
                                {displayValue}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {hasStatus ? (
                    <div className='col-span-2 flex min-h-[30px] items-center justify-center bg-[#4b4b4b] lg:col-span-3'>
                      <span className='text-[14px] font-bold tracking-wide text-red-600 lg:text-[16px]'>
                        {item.status}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`flex min-h-[30px] flex-col items-center justify-center bg-[#72bbef] ${item.no.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                        onClick={() =>
                          item.no.rate &&
                          handleOddsClick(
                            item.label,
                            item.no.rate,
                            'back',
                            item.sid,
                            item.min,
                            item.max
                          )
                        }
                      >
                        {item.no.rate ? (
                          <>
                            <span className='text-[16px] font-bold'>
                              {item.no.rate}
                            </span>
                            <span className='text-[12px]'>{item.no.size}</span>
                          </>
                        ) : (
                          <span className='text-[16px] font-bold'>-</span>
                        )}
                      </div>

                      <div
                        className={`flex min-h-[30px] flex-col items-center justify-center bg-[#faa9ba] ${item.yes.rate ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
                        onClick={() =>
                          item.yes.rate &&
                          handleOddsClick(
                            item.label,
                            item.yes.rate,
                            'lay',
                            item.sid,
                            item.min,
                            item.max
                          )
                        }
                      >
                        {item.yes.rate ? (
                          <>
                            <span className='text-[16px] font-bold'>
                              {item.yes.rate}
                            </span>
                            <span className='text-[12px]'>{item.yes.size}</span>
                          </>
                        ) : (
                          <span className='text-[16px] font-bold'>-</span>
                        )}
                      </div>

                      <div className='hidden flex-col items-center justify-center lg:flex'>
                        <span className='text-[10px] leading-4 font-bold text-[#097c93]'>
                          Min:{item.min}
                        </span>
                        <span className='text-[10px] leading-4 font-bold text-[#097c93]'>
                          Max:{item.max}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OddEven;
