import React from 'react';

function Casino({ casinos, onLaunchGame }) {
  return (
    <div className='flex flex-wrap'>
      {casinos.map((casino) => (
        <div
          key={casino.id || casino.game_uid}
          className='mb-[2px] mr-[2px] w-[calc(50%-10px)] min-[767px]:w-[calc(33.33%-10px)] min-[1200px]:w-[calc(14.28%-2px)]'
          onClick={() => onLaunchGame(casino)}
        >
          <img
            src={casino.icon}
            alt={casino.game_name}
            className='h-full w-full'
            onError={(e) => {
              e.target.src =
                'https://sitethemedata.com/casino_icons/other/bcslot/creedroomz/500000674.jpg';
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default Casino;
