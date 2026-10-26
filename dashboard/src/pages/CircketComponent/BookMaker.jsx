import React from 'react';
import { useSelector } from 'react-redux';
import { HiOutlineExclamationCircle } from 'react-icons/hi2';
import { FaArrowRight } from 'react-icons/fa';

const BookMaker = ({ BookmakerList, onUserBook, onBetLock, gameid, match }) => {
  const { pendingBet } = useSelector((state) => state.market);

  // console.log("BookmakerList", BookmakerList);
  const bookmakerData =
    Array.isArray(BookmakerList) &&
    BookmakerList.length > 0 &&
    BookmakerList[0].section
      ? BookmakerList[0].section.map((sec) => ({
          team: sec.nat,
          sid: sec.sid,
          odds: sec.odds,
          max: sec.max,
          min: sec.min,
          mname: 'Bookmaker',
          status: sec.gstatus,
        }))
      : [];

  // Helper function
  const getBetDetails = (pendingBet, matchData, team) => {
    const marketBets =
      pendingBet?.filter((item) => item.gameType === matchData?.mname) || [];

    if (marketBets.length === 0) {
      return {
        isHedged: false,
        netOutcome: null,
        displayAmount: null,
        otype: '',
        totalBetAmount: '',
        totalPrice: '',
        teamName: '',
        isMatchedTeam: false,
      };
    }

    const matchedTeamBet = marketBets.find(
      (item) => item.teamName?.toLowerCase() === team?.toLowerCase()
    );
    let netOutcome = 0;
    marketBets.forEach((bet) => {
      const isBetOnThisTeam =
        bet.teamName?.toLowerCase() === team?.toLowerCase();
      const betAmount = parseFloat(bet.totalBetAmount) || 0;
      const stake = parseFloat(bet.totalPrice) || 0;

      if (bet.otype === 'back') {
        if (isBetOnThisTeam) {
          netOutcome += betAmount;
        } else {
          netOutcome -= stake;
        }
      } else {
        if (isBetOnThisTeam) {
          netOutcome -= stake;
        } else {
          netOutcome += betAmount;
        }
      }
    });

    return {
      isHedged: true,
      netOutcome: -Math.round(netOutcome * 100) / 100,
      otype: matchedTeamBet?.otype || marketBets[0]?.otype || '',
      totalBetAmount:
        matchedTeamBet?.totalBetAmount || marketBets[0]?.totalBetAmount || '',
      totalPrice: matchedTeamBet?.totalPrice || marketBets[0]?.totalPrice || '',
      teamName: matchedTeamBet?.teamName || marketBets[0]?.teamName || '',
      isMatchedTeam: !!matchedTeamBet,
    };
  };

  // Inside your React functional component (e.g., in a file like MyComponent.jsx)
  function MyComponent({ team, matchData, pendingBet }) {
    const betDetails = getBetDetails(pendingBet, matchData, team);
    const {
      isHedged,
      netOutcome,
      displayAmount,
      otype,
      totalBetAmount,
      totalPrice,
      teamName,
      isMatchedTeam: isMatchedFromDetails,
    } = betDetails;

    const isMatchedTeam =
      isMatchedFromDetails !== undefined
        ? isMatchedFromDetails
        : teamName?.toLowerCase() === team?.toLowerCase();

    const existingBet =
      (otype && totalBetAmount) ||
      (totalPrice && teamName) ||
      isHedged ||
      displayAmount !== null
        ? true
        : false;

    // Determine the actual value to display
    let actualDisplayValue;
    if (isHedged) {
      actualDisplayValue = netOutcome;
    } else if (displayAmount !== null && displayAmount !== undefined) {
      actualDisplayValue = displayAmount;
    } else if (otype === 'lay') {
      actualDisplayValue = isMatchedTeam ? totalPrice : totalBetAmount;
    } else if (otype === 'back') {
      actualDisplayValue = isMatchedTeam ? totalBetAmount : totalPrice;
    } else {
      actualDisplayValue = null;
    }

    // Color based on actual value - simple logic: negative = red, positive/zero = green
    const numericValue = parseFloat(actualDisplayValue) || 0;
    const betColor =
      existingBet && actualDisplayValue !== null
        ? numericValue >= 0
          ? 'green'
          : 'red'
        : 'green';

    const displayValue = (() => {
      if (!existingBet || actualDisplayValue === null) {
        return null;
      }

      return (
        <span className='flex items-center gap-0.5'>{actualDisplayValue}</span>
      );
    })();

    return (
      <div className='w-[calc(100%-510px)] pr-[5px]'>
        <div>
          <p className='text-[14px] leading-none text-[#333]'>{team}</p>
          <p className='leading-none' style={{ color: betColor }}>
            {displayValue || '0.00'}
          </p>
        </div>
      </div>
    );
  }
  // Inside your React functional component (e.g., in a file like MyComponent.jsx)
  const formatToK = (num) => {
    if (!num || num < 1000) return num;
    const n = Number(num);
    return `${n / 1000}k`;
  };

  const getOddBg = (index) => {
    switch (index) {
      case 0:
        return 'hidden bg-[#72bbefa3] md:flex';
      case 1:
        return 'hidden bg-[#72bbefcc] md:flex';
      case 2:
        return 'bg-[#72bbef]';
      case 3:
        return 'bg-[#f994ba]';
      case 4:
        return 'hidden bg-[#f994bacc] md:flex';
      default:
        return 'hidden bg-[#f994baa3] md:flex';
    }
  };

  return (
    <div>
      <div>
        {bookmakerData.length > 0 && (
          <div className='mt-2.5'>
            <div className='mx-auto text-[14px]'>
              <div className='flex items-center justify-between bg-secondary70 p-[5px] font-bold text-white uppercase'>
                <span>{bookmakerData[0]?.mname}</span>
                <div className='flex'>
                  <span className='mr-[6px] block rounded-[3px] border border-[#2c3e50] bg-[#2c3e50] px-[5px] py-0.5 text-[12px] font-normal uppercase leading-[1.5] cursor-pointer hover:bg-slate-700 transition-colors' onClick={() => onBetLock && onBetLock('Bookmaker', match, gameid)}>
                    Bet Lock
                  </span>
                  <span className='mr-[3px] block rounded-[3px] border border-[#2c3e50] bg-[#2c3e50] px-[5px] py-0.5 text-[12px] font-normal uppercase leading-[1.5] cursor-pointer hover:bg-slate-700 transition-colors' onClick={() => onUserBook && onUserBook('Bookmaker', BookmakerList)}>
                    user book
                  </span>
                </div>
              </div>

              <div className='shadow-[0_0_5px_#c7c7c7]'>
                <div className='flex flex-wrap items-center border-b border-white pl-2'>
                  <div className='w-[calc(100%-340px)] py-1 pr-[5px] text-right'>
                    <span className='text-[12px] font-bold text-[#333]'>
                      Min:{BookmakerList[0]?.min} Max:{BookmakerList[0]?.maxb}
                    </span>
                  </div>
                  <div className='flex h-[30px] w-[85px] items-center justify-center bg-[#4fa1dc] text-center text-[14px] font-bold'>
                    Back
                  </div>
                  <div className='flex h-[30px] w-[85px] items-center justify-center bg-[#e16f9a] text-center text-[14px] font-bold'>
                    Lay
                  </div>
                </div>

                {bookmakerData.map(({ team, odds, status }, index) => {
                  const isRowSuspended = status === 'SUSPENDED';

                  return (
                    <div key={index} className={`flex flex-wrap items-center border-b border-white bg-[#ececec] pl-2`}>
                      <MyComponent
                        key={team}
                        team={team}
                        matchData={bookmakerData[0]}
                        pendingBet={pendingBet}
                        index={index}
                      />
                      <div className='relative flex'>
                        {odds.map((odd, i) => (
                          <div
                            key={i}
                            className={`flex min-h-[45px] w-[85px] flex-col flex-wrap items-center justify-center border-l border-white py-1 ${getOddBg(i)}`}
                          >
                            {odd?.odds > 0 ? (
                              <>
                              <div className='mb-[1px] mt-[3px] h-[16px] text-[16px] font-bold leading-[16px]'>
                                {odd?.odds}
                              </div>
                              <div className='mt-[3px] h-[14px] text-[12px] leading-[14px]'>
                                {odd?.size}
                              </div>
                              </>
                            ) : (
                              <span className='text-[#aaafb5] mb-[1px] mt-[3px] h-[16px] leading-[16px] text-[16px]'>—</span>
                            )}
                          </div>
                        ))}
                        {isRowSuspended && (
                          <div className='absolute inset-0 h-[2.87rem] flex items-center justify-center bg-[#131313c2]'>
                            <p className='text-[16px] font-bold text-[#fc4242]'>SUSPENDED</p>
                          </div>
                        )}
                      </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookMaker;
