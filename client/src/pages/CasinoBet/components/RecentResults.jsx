import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { getResultLabel, getResultBgColor } from '../constants';

const RecentResults = memo(function RecentResults({
  gameid,
  currentGameId,
  results,
  onItemClick,
}) {
  if (currentGameId !== gameid || !results?.length) {
    return (
      <div className='mb-25 overflow-x-auto bg-black p-1 whitespace-nowrap text-white'>
        <span className='pr-4 text-[1.07375rem] font-bold'>Recent Result</span>
      </div>
    );
  }

  return (
    <>
      <div className='mb-1 flex items-center justify-between bg-black p-1 px-2 text-[14px] text-white'>
        <span>Last Result</span>
        <Link to='/casino-results'>View All</Link>
      </div>
      <div className='overflow-x-auto text-end whitespace-nowrap'>
        {results.map((item, index) => {
          const label = getResultLabel(gameid, item.win);
          const bgColor = getResultBgColor(gameid, item.win);

          return (
            <span
              onClick={() => onItemClick?.(item)}
              key={index}
              className={`mr-2 inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full text-[16px] leading-none font-bold ${bgColor}`}
            >
              {label}
            </span>
          );
        })}
      </div>
    </>
  );
});

export default RecentResults;
