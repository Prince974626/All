import React from 'react';
import { IoMdClose } from 'react-icons/io';

const UserBookModal = ({ isOpen, onClose, userBets = [], teamHeaders = [] }) => {
  if (!isOpen) return null;

  // Group bets by username to aggregate P&L per user for each selection
  const userMap = {};
  (userBets || []).forEach((bet) => {
    const uname = bet.userName || bet.userId || 'Unknown';
    if (!userMap[uname]) {
      userMap[uname] = [];
    }
    userMap[uname].push(bet);
  });

  const usersList = Object.keys(userMap);

  return (
    <>
    <div
      className='fixed inset-0 z-99 flex items-center justify-center bg-black/60 overflow-y-auto'
      onClick={onClose}
    />
      <div
        className='fixed top-[24px] mb-[24px] left-1/2 -translate-x-1/2 z-99 flex max-h-[calc(100vh-48px)] w-full max-w-[90%] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className='flex items-center justify-between bg-white pl-[28px] pr-[14px] py-[14px]'>
          <h2 className='text-[21px] text-gray-900 tracking-tight'>User Book</h2>
          <button
            type='button'
            onClick={onClose}
            className='flex h-[35px] w-[35px] text-[22px] font-semibold text-shadow-[0_1px_0_#fff] items-center justify-center rounded-full bg-secondary text-white hover:bg-secondary70 transition-colors cursor-pointer'
          >
           ×
          </button>
        </div>

        {/* Body Table */}
        <div className='p-6 overflow-x-auto min-h-[140px]'>
          <table className='w-full text-center border-collapse text-sm'>
            <thead>
              <tr className='border-b border-gray-200 font-bold text-gray-800 text-sm'>
                <th className='py-3 px-4 text-center font-bold text-gray-900'>UserName</th>
                {teamHeaders.map((team, idx) => (
                  <th key={idx} className='py-3 px-4 text-center font-bold text-gray-900'>
                    {team}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersList.length > 0 ? (
                usersList.map((uname, idx) => {
                  const bets = userMap[uname];
                  return (
                    <tr key={idx} className='border-b border-gray-100 hover:bg-gray-50/80 transition-colors text-sm font-medium text-gray-700'>
                      <td className='py-3.5 px-4 text-center text-gray-700 font-normal'>
                        {uname}
                      </td>
                      {teamHeaders.map((team, tIdx) => {
                        let totalOutcome = 0;
                        bets.forEach((b) => {
                          const isMatchedTeam = b.teamName?.toLowerCase() === team?.toLowerCase();
                          if (b.otype === 'back') {
                            totalOutcome += isMatchedTeam ? Number(b.betAmount || 0) : -Number(b.price || 0);
                          } else {
                            totalOutcome += isMatchedTeam ? -Number(b.price || 0) : Number(b.betAmount || 0);
                          }
                        });

                        const rounded = Math.round(totalOutcome * 100) / 100;
                        return (
                          <td key={tIdx} className='py-3.5 px-4 text-center font-normal text-gray-700'>
                            {rounded}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={teamHeaders.length + 1 || 2} className='py-8 text-center text-gray-500 font-semibold'>
                    No user bets found for this market.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default UserBookModal;
