import React from 'react';

const FALLBACK_ICON =
  'https://sitethemedata.com/casino_icons/other/bcslot/creedroomz/500000674.jpg';

function Casino({ casinos, onLaunchGame, providerId = '' }) {
  return (
    <div className='flex flex-wrap'>
      {casinos.map((casino, index) => {
        const stableId =
          casino.game_uid || casino.id || casino.game_name || index;
        return (
          <div
            key={`${providerId}-${stableId}-${index}`}
            className='mb-[2px] mr-[2px] h-[200px] w-[calc(50%-10px)] cursor-pointer min-[767px]:w-[calc(33.33%-10px)] min-[1200px]:h-[79.88px] min-[1200px]:w-[calc(14.28%-2px)]'
            onClick={() => onLaunchGame?.(casino)}
          >
            <img
              src={casino.icon}
              alt={casino.game_name}
              className='h-full w-full'
              loading='lazy'
              decoding='async'
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallbackApplied === '1') return;
                img.dataset.fallbackApplied = '1';
                img.src = FALLBACK_ICON;
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default Casino;
