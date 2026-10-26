import React, { memo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { QUICK_AMOUNTS } from '../constants';
import { formatToK } from '../utils/bettingUtils';

/**
 * BetControlPanel - Sidebar bet slip for casino games
 */
const BetControlPanel = memo(function BetControlPanel({
  betControl,
  betOdds,
  setBetOdds,
  betAmount,
  updateAmount,
  loading,
  onCancel,
  onPlaceBet,
  isVisible = true,
}) {
  const { userInfo } = useSelector((state) => state.auth);
  const amounts = (() => {
    const saved = userInfo?.casinoQuickStakes;
    if (!saved?.length) return QUICK_AMOUNTS;
    return QUICK_AMOUNTS.map((def, i) => {
      const item = saved[i];
      if (!item) return def;
      if (typeof item === 'object' && item.label && item.value) {
        return { amt: item.value, label: item.label, img: def.img };
      }
      if (typeof item === 'number' && item > 0) {
        return { amt: item, label: def.label, img: def.img };
      }
      return def;
    });
  })();

  const [selectedIncrement, setSelectedIncrement] = useState(amounts[0].amt);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isVisible || !betControl) return null;

  const minAmount = betControl?.min ?? 100;
  const maxAmount = betControl?.max || 100000;
  const oddsValue = betOdds || betControl?.odds || 1.01;
  const stake = Number(betAmount) || 0;
  const profit =
    betControl?.type === 'lay' ? stake : Math.max(0, stake * (oddsValue - 1));
  const selectedCardCount = String(
    betControl?.card || betControl?.fancyScore || ''
  )
    .split(',')
    .filter(Boolean).length;
  const needsMoreCards =
    betControl?.requiredCardCount &&
    selectedCardCount !== betControl.requiredCardCount;

  const handlePlaceBet = async () => {
    if (loading || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const betType = betControl?.type;
      let teamName = betControl?.nat;
      let subtype = '';

      if (betControl?.requiredCardCount) {
        if (selectedCardCount !== betControl.requiredCardCount) {
          toast.error(
            `Please select exactly ${betControl.requiredCardCount} cards to place bet`
          );
          return;
        }
      }

      if (betControl?.subtype === 'poker20') {
        const suffix = betControl?.sid >= 11 && betControl?.sid <= 19 ? 'A' : 'B';
        teamName = `${betControl?.nat}#${suffix}`;
        subtype = `${betControl?.nat} ${suffix}`;
      }

      await onPlaceBet(
        betType,
        teamName,
        maxAmount,
        oddsValue,
        subtype,
        minAmount,
        betControl?.marketName,
        betControl?.teamCount
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const rowBg = betControl?.type === 'back' ? 'bg-[#72bbef]' : 'bg-[#faa9ba]';

  return (
    <div className={`w-full text-black bg-[#cccccc]`}>
      <div className='flex items-center border-b border-gray-300 px-2 py-1 text-[13px] font-bold'>
        <div className='w-[42%] me-auto'>(Bet for)</div>
        <div className='w-[18%] text-center'>Odds</div>
        <div className='w-[20%] text-center'>Stake</div>
        <div className='w-[20%] text-right'>Profit</div>
      </div>

      <div className={`flex items-center border-b border-gray-300 px-2 py-1.5 text-[14px] ${rowBg}`}>
        <div className='flex w-[42%] items-center gap-1 font-bold'>
          <button
            type='button'
            onClick={onCancel}
            className='text-[#ca1010] hover:text-red-700'
            aria-label='Remove bet'
          >
            x
          </button>
          <span className='truncate'>{betControl?.nat}</span>
        </div>
        <div className='w-[18%] text-center font-bold'>
          {Number(oddsValue).toFixed(2)}
        </div>
        <div className='w-[20%] px-1'>
          <input
            type='number'
            value={betAmount || ''}
            onChange={(e) => updateAmount(parseInt(e.target.value, 10) || 0)}
            className='w-full rounded-sm border border-gray-400 bg-white px-1 py-0.5 text-center text-[14px] outline-none'
            placeholder='0'
          />
        </div>
        <div className='w-[20%] text-right font-bold'>
          {stake > 0 ? profit.toFixed(0) : ''}
        </div>
      </div>

      <div className={`grid grid-cols-3 gap-1 p-1 ${rowBg}`}>
        {amounts.slice(0, 6).map((val) => (
          <button
            key={val.amt}
            type='button'
            className={`border border-[#7dbbe9] bg-[#cccccc] py-1.5 text-[13px] font-semibold text-black transition-colors hover:brightness-105 ${
              betAmount === val.amt ? 'ring-2 ring-[#1a8ee1]' : ''
            }`}
            onClick={() => {
              setSelectedIncrement(val.amt);
              updateAmount((betAmount || 0) + val.amt);
            }}
          >
            +{val.label || formatToK(val.amt) || val.amt}
          </button>
        ))}
      </div>

      <div className={`flex justify-end ${rowBg} px-2 pb-2`}>
        <button
          type='button'
          onClick={() => updateAmount(0)}
          className='text-[13px] text-[blue] underline'
        >
          clear
        </button>
      </div>
      <div className={`flex items-center justify-between gap-1 px-2 pb-2 ${rowBg}`}>
        <button
          type='button'
          className='min-w-[80px] h-[38px] bg-[#097c93] px-3 py-1.5 text-[16px] font-medium text-white'
        >
          Edit
        </button>
        <div className='flex gap-1'>
          <button
            type='button'
            onClick={onCancel}
            className='min-w-[80px] h-[38px] bg-[#bd1828] px-3 py-1.5 text-[16px] font-medium text-white'
          >
            Reset
          </button>
          <button
            type='button'
            disabled={stake === 0 || loading || isSubmitting || needsMoreCards}
            onClick={handlePlaceBet}
            className={`min-w-[80px] h-[38px] px-3 py-1.5 text-[16px] font-medium text-white ${
              stake === 0 || loading || isSubmitting || needsMoreCards
                ? 'cursor-not-allowed bg-[#198754] opacity-[0.5]'
                : 'bg-[#198754]'
            }`}
          >
            {loading || isSubmitting ? '...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>


    
  );
});

export default BetControlPanel;
