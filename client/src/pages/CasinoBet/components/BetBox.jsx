import React, { memo } from 'react';
import { FaLock } from 'react-icons/fa';

const BetBox = memo(function BetBox({ option, onBetClick, pl }) {
  if (!option) return null;

  const handleClick = async () => {
    if (option.b > 0 && onBetClick) {
      await onBetClick(option);
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className='relative flex h-full flex-col items-center justify-center gap-0.5 p-2.5'
      >
        <span className='leading-none'>{option.nat}</span>
        <span className='leading-none'>{option.b}</span>
        {option.gstatus === 'SUSPENDED' && (
          <div className='absolute inset-0 flex items-center justify-center rounded bg-gray-950/70 text-lg font-bold text-white'>
            <FaLock />
          </div>
        )}
      </div>
      {pl != null && (
        <div className='flex min-h-[12px] items-center justify-center'>
          {pl}
        </div>
      )}
    </>
  );
});

export default BetBox;
