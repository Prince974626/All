import React, { memo } from 'react';
import { FaLock } from 'react-icons/fa';

const normalize = (str) => str?.toLowerCase()?.trim() || '';

const isSuspended = (cell) =>
  !cell || String(cell.gstatus || '').toUpperCase() === 'SUSPENDED';

// Ordered market columns rendered in each player panel.
// nat in the feed is "<key> <side>" e.g. "Player A", "3 Baccarat B".
const PANEL_COLUMNS = [
  { key: 'Player', label: 'Player' },
  { key: '3 Baccarat', label: '3 Baccarat' },
  { key: 'Total', label: 'Total' },
  { key: 'Pair Plus', label: 'Pair Plus' },
];

// Suit (Red / Black) bets shown under the column grid.
const SUIT_ROWS = [
  {
    key: 'Black',
    icon: <span className='text-[36px] leading-none text-[#0b1b26]'>♠ ♣</span>,
  },
  {
    key: 'Red',
    icon: <span className='text-[36px] leading-none text-[#d0021b]'>♥ ♦</span>,
  },
];

const findCell = (sub, nat) =>
  sub.find(
    (s) =>
      String(s.nat || '')
        .trim()
        .toLowerCase() === nat.trim().toLowerCase()
  );

/** Show price only for the placed team — after place bet */
const PlacedBetPL = memo(function PlacedBetPL({
  playerName,
  marketName,
  pendingBetAmounts,
}) {
  if (!Array.isArray(pendingBetAmounts) || !pendingBetAmounts.length)
    return null;

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
      className={`text-[11px] leading-none font-bold ${
        isProfit ? 'text-green-700' : 'text-red-600'
      }`}
    >
      {price.toFixed(2)}
    </span>
  );
});

/**
 * OddsCell - clickable back-odds box (column grid + suit rows share this)
 */
const OddsCell = memo(function OddsCell({
  cell,
  marketName,
  onSelect,
  pendingBetAmounts,
  className = '',
}) {
  const suspended = isSuspended(cell);

  return (
    <div className={`relative ${className}`}>
      <button
        type='button'
        disabled={suspended || !cell?.b}
        onClick={() =>
          onSelect?.({
            ...cell,
            marketName: marketName || cell?.nat,
            teamCount: 2,
            type: 'back',
            odds: cell?.b,
          })
        }
        className='flex h-full min-h-[46px] w-full flex-col items-center justify-center gap-0.5 border border-gray-300 bg-[#72bbef] text-[18px] font-bold transition-colors'
      >
        {cell?.b ?? 0}
        {cell && (
          <PlacedBetPL
            playerName={cell.nat}
            marketName={marketName || cell.nat}
            pendingBetAmounts={pendingBetAmounts}
          />
        )}
      </button>
      {suspended && (
        <span className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-white'>
          <FaLock className='size-3.5' />
        </span>
      )}
    </div>
  );
});

/**
 * PlayerPanel - "Player A" / "Player B" table with 4 market columns + 2 suit rows
 */
const PlayerPanel = memo(function PlayerPanel({
  side,
  sub,
  betControl,
  onSelect,
  pendingBetAmounts,
}) {
  const columns = PANEL_COLUMNS.map((col) => {
    const nat = `${col.key} ${side}`;
    return {
      ...col,
      nat,
      label: `${col.label} ${side}`,
      cell: findCell(sub, nat),
    };
  });

  const suits = SUIT_ROWS.map((row) => {
    const nat = `${row.key} ${side}`;
    return { ...row, nat, cell: findCell(sub, nat) };
  });

  return (
    <div className='flex-1 border border-[#7dbde0] bg-[#f2f2f2]'>
      <div className='px-2 py-1 text-[16px] font-bold text-[#1c1c1c]'>
        Player {side}
      </div>

      <div className='grid grid-cols-4'>
        {columns.map((col) => (
          <div
            key={col.nat}
            className='flex min-h-[46px] items-center justify-center border-t border-r border-gray-300 py-[5px] text-center text-[16px] font-bold text-[#1c1c1c] last:border-r-0'
          >
            {col.label}
          </div>
        ))}
      </div>

      <div className='grid grid-cols-4'>
        {columns.map((col) => (
          <OddsCell
            key={col.nat}
            cell={col.cell}
            marketName={col.label}
            selected={col.cell && betControl?.sid === col.cell.sid}
            onSelect={onSelect}
            pendingBetAmounts={pendingBetAmounts}
          />
        ))}
      </div>

      <div className='grid grid-cols-2 border-t border-white/70'>
        {suits.map((row) => {
          const suspended = isSuspended(row.cell);
          return (
            <div
              key={row.nat}
              className='relative flex h-11 items-center border-r border-white/70 bg-[#72bbef] pr-2 pl-3 last:border-r-0'
            >
              <button
                type='button'
                disabled={suspended || !row.cell?.b}
                onClick={() =>
                  onSelect?.({
                    ...row.cell,
                    marketName: row.nat,
                    teamCount: 2,
                    type: 'back',
                    odds: row.cell?.b,
                  })
                }
                className='flex w-full items-center justify-between text-[18px] font-bold transition-colors'
              >
                {row.icon}
                <span className='flex flex-col items-end gap-0.5'>
                  {row.cell?.b ?? 0}
                  {row.cell && (
                    <PlacedBetPL
                      playerName={row.cell.nat}
                      marketName={row.nat}
                      pendingBetAmounts={pendingBetAmounts}
                    />
                  )}
                </span>
              </button>
              {suspended && (
                <span className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-white'>
                  <FaLock className='size-3.5' />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

const Layout12 = memo(function Layout12({
  bettingData,
  betControl,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
  pendingBetAmounts,
}) {
  const sub = bettingData?.sub || [];

  const handleSelect = (payload) => {
    if (!payload || isSuspended(payload) || !payload.odds || payload.odds <= 0)
      return;
    setBetControl(payload);
    setSelectedTeamSubtype?.(payload.nat);
    setValue(payload.odds, payload.nat, payload.type);
  };

  return (
    <div className='flex flex-col gap-3 md:flex-row'>
      <PlayerPanel
        side='A'
        sub={sub}
        betControl={betControl}
        onSelect={handleSelect}
        pendingBetAmounts={pendingBetAmounts}
      />
      <PlayerPanel
        side='B'
        sub={sub}
        betControl={betControl}
        onSelect={handleSelect}
        pendingBetAmounts={pendingBetAmounts}
      />
    </div>
  );
});

export default Layout12;
