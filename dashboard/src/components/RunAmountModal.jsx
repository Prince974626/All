import React from 'react';
import { IoClose } from 'react-icons/io5';

const RunAmountModal = ({
  isOpen,
  onClose,
  teamName,
  bets = [],
  isAdmin = true,
}) => {
  if (!isOpen) return null;

  // Gather all fancy bets for this team / market
  const parsedBets = (bets || [])
    .map((b) => ({
      fancyScore: Number(b.fancyScore ?? b.rate ?? b.odds ?? 0),
      otype: b.otype || 'back',
      price: Number(b.price ?? b.totalPrice ?? 0),
      betAmount: Number(b.betAmount ?? b.totalBetAmount ?? 0),
    }))
    .filter((b) => b.fancyScore > 0 || b.price > 0 || b.betAmount > 0);

  // Generate unique scores to show in table
  const scoresSet = new Set();
  parsedBets.forEach((b) => {
    if (b.fancyScore > 0) {
      scoresSet.add(b.fancyScore - 1);
      scoresSet.add(b.fancyScore);
    }
  });

  const sortedScores = Array.from(scoresSet).sort((a, b) => a - b);

  // For each score, calculate net P&L
  const rows = sortedScores.map((score) => {
    let userPnl = 0;
    parsedBets.forEach((bet) => {
      if (bet.otype === 'back') {
        if (score >= bet.fancyScore) {
          userPnl += bet.betAmount;
        } else {
          userPnl -= bet.price;
        }
      } else {
        // lay bet
        if (score < bet.fancyScore) {
          userPnl += bet.betAmount;
        } else {
          userPnl -= bet.price;
        }
      }
    });

    const finalPnl = isAdmin ? -userPnl : userPnl;
    return {
      score,
      pnl: Math.round(finalPnl * 100) / 100,
    };
  });

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
      onClick={onClose}
    >
      <div
        className='w-full max-w-md overflow-hidden rounded-md bg-white shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between bg-[#a26819] px-4 py-3 text-white'>
          <h3 className='text-lg font-bold'>Run Amount</h3>
          <button
            onClick={onClose}
            className='rounded-full p-1 transition-colors hover:bg-white/20'
          >
            <IoClose className='h-6 w-6' />
          </button>
        </div>

        {/* Content Table */}
        <div className='max-h-[60vh] overflow-y-auto p-4'>
          <table className='w-full border-collapse text-sm'>
            <thead>
              <tr className='border-b-2 border-gray-300 text-gray-700'>
                <th className='py-2 text-left font-bold'>Run</th>
                <th className='py-2 text-right font-bold'>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.score} className='border-b border-gray-200'>
                    <td className='py-2.5 text-left font-semibold text-gray-800'>
                      {row.score}
                    </td>
                    <td
                      className={`py-2.5 text-right font-bold ${
                        row.pnl < 0 ? 'text-red-500' : 'text-green-600'
                      }`}
                    >
                      {row.pnl}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className='py-4 text-center text-gray-500'>
                    No run amounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RunAmountModal;
