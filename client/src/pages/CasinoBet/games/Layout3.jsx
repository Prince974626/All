import React, { memo } from 'react';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

import 'highcharts/highcharts-3d';

import BetBox from '../components/BetBox';
import {
  getBaccaratChartData,
  getBaccaratChartOptions,
} from '../utils/gameUtils';

const SIDE_BET_NATS = ['Perfect Pair', 'Big', 'Small', 'Either Pair'];
const SIDE_BET_GRADIENT = 'linear-gradient(-180deg,#3d4f63 0,#2a3544 100%)';

const normalize = (str) => str?.toLowerCase()?.trim() || '';

/** Show price only for the placed team — after place bet */
const PlacedBetPL = memo(function PlacedBetPL({
  playerName,
  marketName,
  pendingBetAmounts,
}) {
  if (!Array.isArray(pendingBetAmounts)) return null;

  const market = pendingBetAmounts.find(
    (m) => normalize(m.marketName) === normalize(marketName)
  );
  const detail = market?.details?.find(
    (d) => normalize(d.teamName) === normalize(playerName)
  );
  if (!detail) return null;

  const price = Number(detail.price);
  if (Number.isNaN(price)) return null;
  const isProfit = price >= 0;

  return (
    <span
      className={`text-[10px] leading-none font-bold ${
        isProfit ? 'text-green-400' : 'text-red-400'
      }`}
    >
      {price.toFixed(2)}
    </span>
  );
});

const getSideBets = (sub) => {
  if (!sub?.length) return [];

  const byNat = SIDE_BET_NATS.map((nat) =>
    sub.find((s) => s.nat?.toLowerCase() === nat.toLowerCase())
  ).filter(Boolean);

  if (byNat.length > 0) return byNat;

  return sub.slice(5, 9);
};

const Layout3 = memo(function Layout3({
  bettingData,
  resultData,
  setBetControl,
  setValue,
  pendingBetAmounts,
}) {
  const chartData = getBaccaratChartData(resultData);
  const chartOptions = getBaccaratChartOptions(chartData);
  const sideBets = getSideBets(bettingData?.sub);

  const resolveMarketName = (option) => option?.nat;

  const handleBetClick = (option) => {
    if (option.b <= 0 || option.gstatus === 'SUSPENDED') return;

    setBetControl({
      ...option,
      type: 'back',
      odds: option.b,
      marketName: resolveMarketName(option),
      teamCount: 1,
    });
    setValue(option.b, option.nat, 'back');
  };

  const renderPL = (option) => {
    if (!option) return null;
    return (
      <PlacedBetPL
        playerName={option.nat}
        marketName={resolveMarketName(option)}
        pendingBetAmounts={pendingBetAmounts}
      />
    );
  };

  return (
    <div className='flex flex-wrap'>
      <div className='grid w-full md:w-[20%]'>
        <div className='mx-auto w-full max-w-[300px] overflow-hidden rounded-md'>
          <HighchartsReact highcharts={Highcharts} options={chartOptions} />
        </div>
      </div>

      <div className='w-full md:w-[80%]'>
        <div className='flex justify-between'>
          {sideBets.map((option) => (
            <div
              key={option.sid}
              className='w-[24%] bg-[#2C3E50] text-[16px] text-white'
            >
              <BetBox
                option={option}
                gradient={SIDE_BET_GRADIENT}
                onBetClick={handleBetClick}
                pl={renderPL(option)}
              />
            </div>
          ))}
        </div>

        <div className='mt-4 flex text-[16px] text-white'>
          <div className='mr-[1%] h-[70px] w-[16%] overflow-hidden rounded-l-[30px] bg-[#086cb8]'>
            <BetBox
              option={bettingData?.sub[3]}
              onBetClick={handleBetClick}
              pl={renderPL(bettingData?.sub[3])}
            />
          </div>
          <div className='h-[70px] w-[22%] bg-[#086cb8]'>
            <BetBox
              option={bettingData?.sub[0]}
              onBetClick={handleBetClick}
              pl={renderPL(bettingData?.sub[0])}
            />
          </div>
          <div className='h-[70px] w-[22%] bg-[#279532]'>
            <BetBox
              option={bettingData?.sub[2]}
              onBetClick={handleBetClick}
              pl={renderPL(bettingData?.sub[2])}
            />
          </div>
          <div className='h-[70px] w-[22%] bg-[#ae2130]'>
            <BetBox
              option={bettingData?.sub[1]}
              onBetClick={handleBetClick}
              pl={renderPL(bettingData?.sub[1])}
            />
          </div>
          <div className='ml-[1%] h-[70px] w-[16%] overflow-hidden rounded-r-[30px] bg-[#ae2130]'>
            <BetBox
              option={bettingData?.sub[4]}
              onBetClick={handleBetClick}
              pl={renderPL(bettingData?.sub[4])}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default Layout3;
