import React, { memo } from 'react';
import { formatChipAmount } from './rouletteBetUtils';
import { getChipColorForAmount } from './rouletteConstants';
import coin from '../../../../assets/coins/icon.svg';

const PlacedChip = memo(function PlacedChip({ amount, className = '' }) {
  if (!amount || amount <= 0) return null;

  return (
    <div
      className={`pointer-events-none absolute z-50 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md sm:h-10 sm:w-10 sm:text-[12px] ${className}`}
      style={{ backgroundColor: getChipColorForAmount(amount) }}
    >
      {formatChipAmount(amount)}
      <img src={coin} alt='' className='absolute inset-0' />
    </div>
  );
});

export default PlacedChip;
