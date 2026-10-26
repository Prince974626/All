import React, { memo } from 'react';
import { FaLock } from 'react-icons/fa';
import { getBetDetails } from '../utils/bettingUtils';

const isSuspended = (item) =>
  !item || String(item?.gstatus || '').toUpperCase() === 'SUSPENDED';

const norm = (s) =>
  String(s || '')
    .trim()
    .toLowerCase();

// Find a betting cell by its display name and (optionally) subtype.
const findCell = (sub, nat, subtype) =>
  sub.find(
    (s) =>
      norm(s.nat) === norm(nat) &&
      (subtype ? norm(s.subtype) === norm(subtype) : true)
  );

const Lock = memo(function Lock() {
  return (
    <span className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-white'>
      <FaLock className='size-3.5' />
    </span>
  );
});

// ============================================================================
// A single blue "back" odds cell. `display` overrides the shown text (used for
// the "Pair Plus N" column which shows the market name instead of the odd).
// ============================================================================
const OddsCell = memo(function OddsCell({ item, display, onSelect, pl }) {
  const suspended = isSuspended(item);
  const odds = item?.b;
  const disabled = suspended || !odds || odds <= 0;

  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() =>
        onSelect?.({
          ...item,
          type: 'back',
          odds,
          marketName: item?.nat,
          teamCount: 1,
        })
      }
      className='relative flex min-h-[46px] w-[20%] flex-col items-center justify-center border-l border-gray-300 bg-[#72bbef] text-[#1f2d3a] transition-colors hover:bg-[#5aabe6]'
    >
      <span className='text-[16px] leading-none font-bold'>
        {display ?? odds ?? 0}
      </span>
      {pl}
      {suspended && <Lock />}
    </button>
  );
});

// ============================================================================
// A generic "Any ..." market cell (Any Colour / Straight / Trio / St. Flush)
// ============================================================================
const OtherCell = memo(function OtherCell({ item, onSelect, pl }) {
  const suspended = isSuspended(item);
  const odds = item?.b;
  const disabled = suspended || !odds || odds <= 0;

  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() =>
        onSelect?.({
          ...item,
          type: 'back',
          odds,
          marketName: item?.nat,
          teamCount: 1,
        })
      }
      className='relative flex min-h-[52px] w-full flex-col items-center justify-center gap-1 border border-white/70 bg-[#72bbef] text-[#1f2d3a] transition-colors hover:bg-[#5aabe6]'
    >
      <span className='text-[13px] leading-none font-bold'>{item?.nat}</span>
      <span className='text-[15px] leading-none font-bold'>{odds ?? 0}</span>
      {pl}
      {suspended && <Lock />}
    </button>
  );
});

// ============================================================================
// TEEN8 (Teenpatti 8 Players) BOARD
// Player 1..8 rows with Odds / Pair Plus / Total columns.
// ============================================================================
const Layout18 = memo(function Layout18({
  bettingData,
  betControl,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
  betAmount,
  betOdds,
  pendingBetAmounts,
}) {
  if (!bettingData?.sub) return null;

  const sub = bettingData.sub;

  const players = Array.from({ length: 8 }, (_, i) => {
    const n = i + 1;
    return {
      n,
      player: findCell(sub, `Player ${n}`, 'Player'),
      pair: findCell(sub, `Pair Plus ${n}`, 'Pair'),
      total: findCell(sub, `Total ${n}`, 'Total'),
    };
  });

  const isSelected = (item, type) =>
    !!item && betControl?.sid === item?.sid && betControl?.type === type;

  const handleSelect = (payload) => {
    if (!payload || isSuspended(payload) || !payload.odds || payload.odds <= 0)
      return;
    setBetControl(payload);
    setSelectedTeamSubtype?.(payload.subtype);
    setValue?.(
      payload.odds,
      payload.nat,
      payload.type,
      payload.nat,
      payload.sid
    );
  };

  // Live / pending profit-loss for a betting item
  const plFor = (item, type = 'back') => {
    if (!item) return null;
    const betDetails = getBetDetails(pendingBetAmounts, item.nat, item.sid);
    const amount = betAmount || 0;
    let value = null;
    if (betDetails) {
      value = betDetails.totalBetAmount || 0;
    } else if (isSelected(item, type) && amount > 0) {
      value = amount * ((betOdds || item.b) - 1);
    }
    if (value === null || value === 0) return null;
    const positive = value >= 0;
    return (
      <span
        className={`text-[10px] leading-none font-bold ${
          positive ? 'text-green-700' : 'text-red-600'
        }`}
      >
        {positive ? '+' : ''}
        {Math.round(value)}
      </span>
    );
  };

  return (
    <div>
      <div className='overflow-hidden border border-gray-300 bg-white'>
        {/* Header row: blank + Odds / Pair Plus / Total */}
        <div className='flex'>
          <div className='w-[40%] bg-[#efefef]' />
          <div className='flex w-[20%] items-center justify-center border-l border-white/70 bg-[#72bbef] py-1 text-[15px] font-bold text-[#1f2d3a]'>
            Odds
          </div>
          <div className='flex w-[20%] items-center justify-center border-l border-white/70 bg-[#72bbef] py-1 text-[15px] font-bold text-[#1f2d3a]'>
            Pair Plus
          </div>
          <div className='flex w-[20%] items-center justify-center border-l border-white/70 bg-[#72bbef] py-1 text-[15px] font-bold text-[#1f2d3a]'>
            Total
          </div>
        </div>

        {players.map(({ n, player, pair, total }) => (
          <div key={n} className='flex border-t border-gray-300'>
            <div className='flex w-[40%] items-center bg-[#efefef] px-3 py-1 text-[15px] font-bold text-[#1f2d3a]'>
              {`Player ${n}`}
            </div>
            <OddsCell
              item={player}
              onSelect={handleSelect}
              pl={plFor(player, 'back')}
            />
            <OddsCell
              item={pair}
              display={`Pair Plus ${n}`}
              onSelect={handleSelect}
              pl={plFor(pair, 'back')}
            />
            <OddsCell
              item={total}
              onSelect={handleSelect}
              pl={plFor(total, 'back')}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

export default Layout18;
