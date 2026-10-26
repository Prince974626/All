import React, { memo } from 'react';
import { FaLock } from 'react-icons/fa';

const WINNER_MARKET = 'WINNER';

const normalize = (str) => str?.toLowerCase()?.trim() || '';

const isSuspended = (item) =>
  !item || String(item.gstatus || '').toUpperCase() === 'SUSPENDED';

const findCell = (sub, nat) =>
  sub.find(
    (s) =>
      String(s.nat || '')
        .trim()
        .toLowerCase() === nat.trim().toLowerCase()
  );

/**
 * After place bet only:
 * - patti2 → price (bet team only)
 * - Player B Under/Over 21 (market playerB) → price when that team is bet
 * - other teams → bet team: winProfit, other teams: netBet
 */
const PlacedBetPL = memo(function PlacedBetPL({
  playerName,
  pendingBetAmounts,
  gameid,
  marketName = WINNER_MARKET,
}) {
  if (!Array.isArray(pendingBetAmounts) || !pendingBetAmounts.length)
    return null;

  const market = pendingBetAmounts.find(
    (m) => normalize(m.marketName) === normalize(marketName)
  );
  if (!market) return null;

  const detail = market.details?.find(
    (d) => normalize(d.teamName) === normalize(playerName)
  );

  const isPatti2 = normalize(gameid) === 'patti2';
  const isUnderOver21 =
    normalize(playerName) === 'player b under 21' ||
    normalize(playerName) === 'player b over 21';

  let value;
  if (isPatti2) {
    // patti2: price on bet team only
    if (!detail) return null;
    value = Number(detail.price);
    if (Number.isNaN(value)) return null;
  } else if (isUnderOver21) {
    // Under/Over 21: price only on the bet team (no netBet on the other)
    if (!detail) return null;
    value = Number(detail.price);
    if (Number.isNaN(value)) return null;
  } else {
    // other teams: winProfit on bet team, netBet on others
    value = detail ? Number(detail.winProfit) || 0 : Number(market.netBet) || 0;
  }

  const isProfit = value >= 0;

  return (
    <span
      className={`text-[10px] leading-none font-bold ${
        isProfit ? 'text-green-700' : 'text-red-600'
      }`}
    >
      {value.toFixed(2)}
    </span>
  );
});

const Lock = memo(function Lock() {
  return (
    <span className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-white'>
      <FaLock className='size-3.5' />
    </span>
  );
});

// A single clickable odds cell (back = blue, lay = pink)
const OddsCell = memo(function OddsCell({
  item,
  type,
  onSelect,
  pendingBetAmounts,
  showNamePL = false,
  gameid,
  marketName = WINNER_MARKET,
}) {
  const suspended = isSuspended(item);
  const lineOdds = type === 'lay' ? item?.l : item?.b;
  const oddsBhav = type === 'lay' ? item?.lbhav : item?.bbhav;
  const isTotalAB = item?.nat === 'Total A' || item?.nat === 'Total B';
  // Total A/B: line is display-only; P/L & bet odds use oddsBhav
  const odds = isTotalAB ? oddsBhav : lineOdds;
  const disabled = suspended || !odds || odds <= 0;
  const isColorPlus = item?.nat === 'Color Plus';

  const tone =
    type === 'lay'
      ? 'bg-[#f9c9d4] hover:bg-[#f5b3c2]'
      : 'bg-[#72bbef] hover:bg-[#5aabe6]';

  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() =>
        onSelect?.({
          ...item,
          type,
          odds,
          marketName,
          teamCount: type === 'lay' ? 2 : 1,
        })
      }
      className={`relative flex min-h-[46px] w-full flex-col items-center justify-center border-l border-white/70 text-[#1c1c1c] transition-colors ${tone}`}
    >
      <span
        className={`flex items-center gap-1.5 ${!isTotalAB ? 'text-[18px] font-bold' : 'text-[12px]'} leading-none`}
      >
        {isColorPlus ? 'Color Plus' : isTotalAB ? lineOdds : odds}
        {showNamePL && item && (
          <PlacedBetPL
            playerName={item.nat}
            pendingBetAmounts={pendingBetAmounts}
            gameid={gameid}
            marketName={marketName}
          />
        )}
      </span>
      {oddsBhav > 0 && (
        <span className='text-[18px] leading-none font-bold'>{oddsBhav}</span>
      )}
      {suspended && <Lock />}
    </button>
  );
});

/**
 * PlayerPanel - "Player A" / "Player B" table with Back / Lay on a single "Main" row
 */
const PlayerPanel = memo(function PlayerPanel({
  item,
  side,
  onSelect,
  pendingBetAmounts,
  gameid,
  marketName = WINNER_MARKET,
}) {
  const showLay =
    item?.nat !== 'Mini Baccarat A' &&
    item?.nat !== 'Mini Baccarat B' &&
    item?.nat !== 'Color Plus' &&
    item?.nat !== 'Player B Under 21' &&
    item?.nat !== 'Player B Over 21';
  const colorPlus = item?.nat !== 'Color Plus';
  return (
    <div className='overflow-hidden border border-gray-300'>
      <div
        className={`grid border-t border-gray-200 ${
          showLay
            ? 'grid-cols-[1.6fr_1fr_1fr]'
            : item?.nat === 'Color Plus'
              ? 'grid-cols-1'
              : 'grid-cols-[1.6fr_2fr]'
        }`}
      >
        {colorPlus && (
          <div className='flex min-h-[46px] items-center gap-1.5 px-3 text-[15px] font-bold text-[#1f2d3a]'>
            <span>{item?.nat || `Player ${side}`}</span>
            {item && (
              <PlacedBetPL
                playerName={item.nat}
                pendingBetAmounts={pendingBetAmounts}
                gameid={gameid}
                marketName={marketName}
              />
            )}
          </div>
        )}

        <OddsCell
          item={item}
          type='back'
          onSelect={onSelect}
          pendingBetAmounts={pendingBetAmounts}
          showNamePL={!colorPlus}
          gameid={gameid}
          marketName={marketName}
        />
        {showLay && colorPlus && (
          <OddsCell
            item={item}
            type='lay'
            onSelect={onSelect}
            marketName={marketName}
          />
        )}
      </div>
    </div>
  );
});

// ============================================================================
// TEEN32 (Premium Teenpatti - 2 players) BOARD
// ============================================================================
const Layout15 = memo(function Layout15({
  gameid,
  bettingData,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
  pendingBetAmounts,
}) {
  if (!bettingData?.sub) return null;

  const sub = bettingData.sub;
  const playerA = findCell(sub, 'Player A');
  const playerB = findCell(sub, 'Player B');

  const PlayerBUnder21 = findCell(sub, 'Player B Under 21');
  const PlayerBOver21 = findCell(sub, 'Player B Over 21');

  const miniBaccaratA = findCell(sub, 'Mini Baccarat A');
  const miniBaccaratB = findCell(sub, 'Mini Baccarat B');
  const totalA = findCell(sub, 'Total A');
  const totalB = findCell(sub, 'Total B');
  const ColorPlus = findCell(sub, 'Color Plus');

  const handleSelect = (payload) => {
    if (!payload || isSuspended(payload) || !payload.odds || payload.odds <= 0)
      return;
    setBetControl(payload);
    setSelectedTeamSubtype?.(payload.subtype);
    setValue?.(payload.odds, payload.nat, payload.type);
  };

  return (
    <div className='bg-[#f7f7f7] p-2'>
      <div className='grid md:grid-cols-2'>
        <div className='grid grid-cols-[1.6fr_1fr_1fr]'>
          <div className='p-0.5' />
          <div className='flex items-center justify-center border-l border-white/70 bg-[#72bbef] p-0.5 text-[16px] font-bold text-[#1f2d3a]'>
            Back
          </div>
          <div className='flex items-center justify-center border-l border-white/70 bg-[#f9c9d4] p-0.5 text-[16px] font-bold text-[#1f2d3a]'>
            Lay
          </div>
        </div>
        <div className='hidden grid-cols-[1.6fr_1fr_1fr] md:grid'>
          <div className='p-0.5' />
          <div className='flex items-center justify-center border-l border-white/70 bg-[#72bbef] p-0.5 text-[16px] font-bold text-[#1f2d3a]'>
            Back
          </div>
          <div className='flex items-center justify-center border-l border-white/70 bg-[#f9c9d4] p-0.5 text-[16px] font-bold text-[#1f2d3a]'>
            Lay
          </div>
        </div>
      </div>

      <div className='grid md:grid-cols-2'>
        <PlayerPanel
          item={playerA}
          side='A'
          onSelect={handleSelect}
          pendingBetAmounts={pendingBetAmounts}
          gameid={gameid}
        />
        <PlayerPanel
          item={playerB}
          side='B'
          onSelect={handleSelect}
          pendingBetAmounts={pendingBetAmounts}
          gameid={gameid}
        />
        {gameid === 'patti2' && (
          <>
            <PlayerPanel
              item={miniBaccaratA}
              side='A'
              onSelect={handleSelect}
              pendingBetAmounts={pendingBetAmounts}
              gameid={gameid}
            />
            <PlayerPanel
              item={miniBaccaratB}
              side='B'
              onSelect={handleSelect}
              pendingBetAmounts={pendingBetAmounts}
              gameid={gameid}
            />
            <PlayerPanel
              item={totalA}
              side='A'
              onSelect={handleSelect}
              pendingBetAmounts={pendingBetAmounts}
              gameid={gameid}
            />
            <PlayerPanel
              item={totalB}
              side='B'
              onSelect={handleSelect}
              pendingBetAmounts={pendingBetAmounts}
              gameid={gameid}
            />
          </>
        )}
      </div>
      {gameid === 'patti2' && (
        <div className='mt-2 grid'>
          <PlayerPanel
            item={ColorPlus}
            side='A'
            onSelect={handleSelect}
            pendingBetAmounts={pendingBetAmounts}
            gameid={gameid}
          />
        </div>
      )}

      {(gameid === 'teen42' || gameid === 'teen41') && (
        <div className='mt-4 grid md:grid-cols-2'>
          <div></div>
          <div className='flex'>
            <PlayerPanel
              item={PlayerBUnder21}
              side='B'
              onSelect={handleSelect}
              pendingBetAmounts={pendingBetAmounts}
              gameid={gameid}
              marketName='playerB'
            />
            <PlayerPanel
              item={PlayerBOver21}
              side='B'
              onSelect={handleSelect}
              pendingBetAmounts={pendingBetAmounts}
              gameid={gameid}
              marketName='playerB'
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default Layout15;
