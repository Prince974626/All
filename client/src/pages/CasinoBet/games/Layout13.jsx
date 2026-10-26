import React, { memo, useState } from 'react';
import { FaLock } from 'react-icons/fa';

const normalize = (str) => str?.toLowerCase()?.trim() || '';

const isSuspended = (cell) =>
  !cell || String(cell.gstatus || '').toUpperCase() === 'SUSPENDED';

// Poker 6: sid 11-16 are the six hands, everything else is a pattern market.
const isHandCell = (cell) => /^player\s*\d/i.test(String(cell?.nat || ''));

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
 * OddsRow - a single full-width clickable market row (name left, back-odds right)
 */
const OddsRow = memo(function OddsRow({ cell, onSelect, pendingBetAmounts }) {
  const suspended = isSuspended(cell);
  const marketName = cell?.nat;

  return (
    <div className='col-span-1'>
      <div className='relative'>
        <button
          type='button'
          disabled={suspended || !cell?.b}
          onClick={() =>
            onSelect?.({
              ...cell,
              marketName,
              teamCount: 1,
              type: 'back',
              odds: cell?.b,
            })
          }
          className='flex min-h-[46px] w-full items-center justify-between bg-[#5aabe6] px-4 text-[16px] font-bold text-[#123a52]'
        >
          <span className='flex items-center gap-1.5'>
            <span>{cell?.nat}</span>
            <PlacedBetPL
              playerName={cell?.nat}
              marketName={marketName}
              pendingBetAmounts={pendingBetAmounts}
            />
          </span>
          <span>{cell?.b ?? 0}</span>
        </button>
        {suspended && (
          <span className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-white'>
            <FaLock className='size-4' />
          </span>
        )}
      </div>
    </div>
  );
});

const Layout13 = memo(function Layout13({
  bettingData,
  betControl,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
  pendingBetAmounts,
}) {
  const [activeTab, setActiveTab] = useState('hands');

  const sub = bettingData?.sub || [];
  const bySr = [...sub].sort((a, b) => (a.sr || 0) - (b.sr || 0));

  const hands = bySr.filter(isHandCell);
  const patterns = bySr.filter((cell) => !isHandCell(cell));

  const handleSelect = (payload) => {
    if (!payload || isSuspended(payload) || !payload.odds || payload.odds <= 0)
      return;
    setBetControl(payload);
    setSelectedTeamSubtype?.(payload.nat);
    setValue(payload.odds, payload.nat, payload.type);
  };

  const cells = activeTab === 'hands' ? hands : patterns;

  return (
    <div className='w-full'>
      {/* Tabs */}
      <div className='flex bg-[#f5f5f5]'>
        <button
          type='button'
          onClick={() => setActiveTab('hands')}
          className={`px-6 py-2 text-[15px] font-bold transition-colors ${
            activeTab === 'hands'
              ? 'bg-[#243a48] text-white'
              : 'bg-[#bcbcbc] text-[#333]'
          }`}
        >
          Hands
        </button>
        <button
          type='button'
          onClick={() => setActiveTab('pattern')}
          className={`px-6 py-2 text-[15px] font-bold transition-colors ${
            activeTab === 'pattern'
              ? 'bg-[#243a48] text-white'
              : 'bg-[#bcbcbc] text-[#333]'
          }`}
        >
          Pattern
        </button>
      </div>

      {/* Market rows: two columns on desktop, single column on mobile */}
      <div
        className={`grid grid-cols-1 gap-2 py-2 ${activeTab === 'pattern' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
      >
        {cells.map((cell) => (
          <OddsRow
            key={cell.sid}
            cell={cell}
            selected={
              betControl?.sid === cell.sid && betControl?.type === 'back'
            }
            onSelect={handleSelect}
            pendingBetAmounts={pendingBetAmounts}
          />
        ))}
      </div>
    </div>
  );
});

export default Layout13;
