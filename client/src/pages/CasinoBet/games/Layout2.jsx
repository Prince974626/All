import React, { memo } from 'react';
import { FaLock } from 'react-icons/fa';
import lucky9 from '../../../assets/lucky9.png';

// TeenSin player panel columns (mapped to sub[].subtype)
const TEENSIN_COLUMNS = [
  { subtype: 'teensin', label: 'Winner' },
  { subtype: 'highcard', label: 'High Card' },
  { subtype: 'pair', label: 'Pair' },
  { subtype: 'colorplus', label: 'Color Plus' },
];

// TeenMuf player panel columns (mapped to sub[].subtype)
const TEENMUF_COLUMNS = [
  { subtype: 'teenmuf', label: 'Winner' },
  { subtype: 'top9', label: 'Top 9' },
  { subtype: 'mbacc', label: 'M Baccarat' },
];

const normalize = (str) => str?.toLowerCase()?.trim() || '';

const isSuspended = (cell) =>
  !cell || String(cell.gstatus || '').toUpperCase() === 'SUSPENDED';

/**
 * After place bet only (poker20 / teenmuf):
 * show price for the placed team only.
 * Match teamName to cell.nat (e.g. "M Baccarat B"), not column label ("M Baccarat").
 */
const PlacedBetPL = memo(function PlacedBetPL({
  playerName,
  marketName,
  pendingBetAmounts,
}) {
  if (!Array.isArray(pendingBetAmounts) || !pendingBetAmounts.length)
    return null;

  const pName = normalize(playerName);
  const mName = normalize(marketName);

  const market = pendingBetAmounts.find(
    (m) => normalize(m.marketName) === mName
  );
  let detail = market?.details?.find((d) => normalize(d.teamName) === pName);

  // Fallback: find by teamName across markets (legacy teenmuf used marketName WINNER)
  if (!detail && pName) {
    for (const m of pendingBetAmounts) {
      if (!Array.isArray(m?.details)) continue;
      const d = m.details.find((x) => normalize(x.teamName) === pName);
      if (d) {
        detail = d;
        break;
      }
    }
  }

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

const isLucky9Market = (marketName) => {
  const m = normalize(marketName);
  return m === 'lucky 9' || m === 'lucky9';
};

/**
 * After place bet only (teensin):
 * - Lucky 9 → winProfit
 * - other markets → price (bet team only)
 */
const TeenSinPlacedBetPL = memo(function TeenSinPlacedBetPL({
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

  const value = isLucky9Market(marketName)
    ? Number(detail.winProfit)
    : Number(detail.price);

  if (Number.isNaN(value)) return null;
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

/* ============================ TeenSin ============================ */

/**
 * OddsCell - a single clickable back-odds cell inside a TeenSin player panel
 */
const OddsCell = memo(function OddsCell({
  cell,
  marketName,
  onSelect,
  pendingBetAmounts,
  showPlacedPL = false,
  plMode = 'price',
}) {
  const suspended = isSuspended(cell);
  const PL = plMode === 'teensin' ? TeenSinPlacedBetPL : PlacedBetPL;

  return (
    <div className='border-r border-white/70 last:border-r-0'>
      <div className='relative'>
        <button
          type='button'
          disabled={suspended || !cell?.b}
          onClick={() =>
            onSelect?.({
              ...cell,
              marketName,
              teamCount: 2,
              type: 'back',
              odds: cell.b,
            })
          }
          className={`flex min-h-[46px] w-full items-center justify-center bg-[#72bbef] text-[18px] font-bold text-[#1c1c1c] transition-colors hover:bg-[#5aabe6]`}
        >
          {cell?.b ?? 0}
        </button>
        {suspended && (
          <div className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-white'>
            <FaLock className='size-3.5' />
          </div>
        )}
      </div>
      {showPlacedPL && cell && (
        <div className='flex min-h-[14px] items-center justify-center bg-white py-0.5'>
          <PL
            playerName={cell.nat}
            marketName={marketName}
            pendingBetAmounts={pendingBetAmounts}
          />
        </div>
      )}
    </div>
  );
});

/**
 * PlayerPanel - "Player A" / "Player B" table rendered from a dynamic column config
 */
const PlayerPanel = memo(function PlayerPanel({
  title,
  side,
  sub,
  columns,
  betControl,
  onSelect,
  pendingBetAmounts,
  showPlacedPL = false,
  plMode = 'price',
}) {
  const getCell = (subtype) =>
    sub.find(
      (s) =>
        s.subtype === subtype &&
        String(s.nat || '')
          .trim()
          .toUpperCase()
          .endsWith(side)
    );

  const gridStyle = {
    gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
  };

  return (
    <div className='flex-1 border border-gray-300 bg-white'>
      <div className='bg-[#f2f2f2] px-2 py-1 text-[16px] font-bold text-black'>
        {title}
      </div>

      <div className='grid border-t border-gray-300' style={gridStyle}>
        {columns.map((col) => (
          <div
            key={col.subtype}
            className='min-h-[46px] border-r border-gray-200 py-2 text-center text-[16px] font-semibold text-[#243a48] last:border-r-0'
          >
            {col.label}
          </div>
        ))}
      </div>

      <div className='grid' style={gridStyle}>
        {columns.map((col) => {
          const cell = getCell(col.subtype);
          return (
            <OddsCell
              key={col.subtype}
              cell={cell}
              marketName={col.label}
              onSelect={onSelect}
              selected={cell && betControl?.sid === cell.sid}
              pendingBetAmounts={pendingBetAmounts}
              showPlacedPL={showPlacedPL}
              plMode={plMode}
            />
          );
        })}
      </div>
    </div>
  );
});

/**
 * TeenSinLayout - two player panels + Lucky 9 row
 */
const TeenSinLayout = memo(function TeenSinLayout({
  sub,
  betControl,
  onSelect,
  pendingBetAmounts,
}) {
  const lucky9Cell = sub.find((s) => s.subtype === 'lucky9');
  const lucky9Suspended = isSuspended(lucky9Cell);
  const lucky9Market = 'Lucky 9';

  return (
    <div className='space-y-3'>
      <div className='flex flex-col gap-3 md:flex-row'>
        <PlayerPanel
          title='Player A'
          side='A'
          sub={sub}
          columns={TEENSIN_COLUMNS}
          betControl={betControl}
          onSelect={onSelect}
          pendingBetAmounts={pendingBetAmounts}
          showPlacedPL
          plMode='teensin'
        />
        <PlayerPanel
          title='Player B'
          side='B'
          sub={sub}
          columns={TEENSIN_COLUMNS}
          betControl={betControl}
          onSelect={onSelect}
          pendingBetAmounts={pendingBetAmounts}
          showPlacedPL
          plMode='teensin'
        />
      </div>

      <div className='flex items-center justify-center border border-gray-300 bg-white px-4 py-3'>
        <div className='relative -right-2 z-10 flex flex-1/2 justify-end'>
          <img src={lucky9} alt='Lucky 9' className='h-26 w-auto' />
        </div>

        <div className='flex flex-1/2 flex-col items-start'>
          <div className='flex'>
            <button
              type='button'
              disabled={lucky9Suspended || !lucky9Cell?.b}
              onClick={() =>
                onSelect({
                  ...lucky9Cell,
                  marketName: lucky9Market,
                  teamCount: 2,
                  type: 'back',
                  odds: lucky9Cell?.b,
                })
              }
              className={`relative flex min-h-[46px] w-20 items-center justify-center text-[16px] font-bold transition-colors ${
                lucky9Suspended
                  ? 'cursor-not-allowed bg-[#3b4a54] text-white/25'
                  : betControl?.sid === lucky9Cell?.sid &&
                      betControl?.type === 'back'
                    ? 'bg-[#4a95c9] text-white'
                    : 'bg-[#72bbef] text-[#1c1c1c] hover:bg-[#5aabe6]'
              }`}
            >
              {lucky9Cell?.b ?? 0}
              {lucky9Suspended && (
                <span className='pointer-events-none absolute inset-0 flex items-center justify-center text-white'>
                  <FaLock className='size-3.5' />
                </span>
              )}
            </button>

            <button
              type='button'
              disabled={lucky9Suspended || !lucky9Cell?.l}
              onClick={() =>
                onSelect({
                  ...lucky9Cell,
                  marketName: lucky9Market,
                  teamCount: 2,
                  type: 'lay',
                  odds: lucky9Cell?.l,
                })
              }
              className={`relative flex h-12 w-20 items-center justify-center text-[16px] font-bold transition-colors ${
                lucky9Suspended
                  ? 'cursor-not-allowed bg-[#5b4750] text-white/25'
                  : betControl?.sid === lucky9Cell?.sid &&
                      betControl?.type === 'lay'
                    ? 'bg-[#e78ba0] text-white'
                    : 'bg-[#f9c9d4] text-[#1c1c1c] hover:bg-[#f5b3c2]'
              }`}
            >
              {lucky9Cell?.l ?? 0}
              {lucky9Suspended && (
                <span className='pointer-events-none absolute inset-0 flex items-center justify-center text-white'>
                  <FaLock className='size-3.5' />
                </span>
              )}
            </button>
          </div>
          {lucky9Cell && (
            <div className='flex min-h-[14px] w-40 items-center justify-center py-0.5'>
              <TeenSinPlacedBetPL
                playerName={lucky9Cell.nat}
                marketName={lucky9Market}
                pendingBetAmounts={pendingBetAmounts}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/* ============================ TeenMuf ============================ */

/**
 * TeenMufLayout - two player panels (Winner / Top 9 / M Baccarat), no Lucky 9 row
 */
const TeenMufLayout = memo(function TeenMufLayout({
  sub,
  betControl,
  onSelect,
  pendingBetAmounts,
}) {
  return (
    <div className='flex flex-col gap-3 md:flex-row'>
      <PlayerPanel
        title='Player A'
        side='A'
        sub={sub}
        columns={TEENMUF_COLUMNS}
        betControl={betControl}
        onSelect={onSelect}
        pendingBetAmounts={pendingBetAmounts}
        showPlacedPL
        plMode='price'
      />
      <PlayerPanel
        title='Player B'
        side='B'
        sub={sub}
        columns={TEENMUF_COLUMNS}
        betControl={betControl}
        onSelect={onSelect}
        pendingBetAmounts={pendingBetAmounts}
        showPlacedPL
        plMode='price'
      />
    </div>
  );
});

/* ============================ Poker20 ============================ */

const POKER20_MARKET = 'poker20';

/** Bet teamName is `${nat}#A` / `${nat}#B` (sid 11–19 → A). */
const getPoker20TeamName = (cell) => {
  if (!cell?.nat) return '';
  const suffix = cell.sid >= 11 && cell.sid <= 19 ? 'A' : 'B';
  return `${cell.nat}#${suffix}`;
};

/**
 * PokerCell - stacked market label + back-odds card
 * P/L shows price under odds after place bet (match teamName e.g. Winner#A)
 */
const PokerCell = memo(function PokerCell({
  cell,
  onSelect,
  pendingBetAmounts,
}) {
  const suspended = isSuspended(cell);
  const teamName = getPoker20TeamName(cell);

  return (
    <div>
      <div className='flex items-center justify-center text-[16px] font-bold text-[#243a48]'>
        <span>{cell?.nat}</span>
      </div>
      <button
        type='button'
        disabled={suspended || !cell?.b}
        onClick={() =>
          onSelect?.({
            ...cell,
            marketName: POKER20_MARKET,
            teamCount: 2,
            type: 'back',
            odds: cell.b,
          })
        }
        className='relative flex min-h-[46px] w-full items-center justify-center bg-[#72bbef] text-[18px] font-bold text-[#1c1c1c] transition-colors hover:bg-[#5aabe6]'
      >
        {cell?.b ?? 0}
        {suspended && (
          <span className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-white'>
            <FaLock className='size-3.5' />
          </span>
        )}
      </button>
      {cell && (
        <div className='flex min-h-[14px] items-center justify-center py-0.5'>
          <PlacedBetPL
            playerName={teamName}
            marketName={POKER20_MARKET}
            pendingBetAmounts={pendingBetAmounts}
          />
        </div>
      )}
    </div>
  );
});

/**
 * PokerLayout - two 3x3 market grids (Player A / Player B)
 */
const PokerLayout = memo(function PokerLayout({
  sub,
  betControl,
  onSelect,
  pendingBetAmounts,
}) {
  // Group by market name (two entries each: A first, B second by sort order)
  const order = [];
  const byNat = {};
  [...sub]
    .sort((a, b) => (a.sr || 0) - (b.sr || 0))
    .forEach((item) => {
      if (!byNat[item.nat]) {
        byNat[item.nat] = [];
        order.push(item.nat);
      }
      byNat[item.nat].push(item);
    });

  const playerA = order.map((nat) => byNat[nat][0]);
  const playerB = order.map((nat) => byNat[nat][1] || null);

  const renderPanel = (markets) => (
    <div className='grid flex-1 grid-cols-3 gap-2 bg-[#f2f2f2] py-2.5'>
      {markets.map((cell, i) => (
        <PokerCell
          key={cell?.sid ?? i}
          cell={cell}
          onSelect={onSelect}
          selected={cell && betControl?.sid === cell.sid}
          pendingBetAmounts={pendingBetAmounts}
        />
      ))}
    </div>
  );

  return (
    <div className='flex flex-col gap-2 md:flex-row'>
      {renderPanel(playerA)}
      {renderPanel(playerB)}
    </div>
  );
});

/* ============================ Layout2 ============================ */

/**
 * Layout2 - renders the betting UI for TeenSin, TeenMuf and Poker20
 */
const Layout2 = memo(function Layout2({
  gameid,
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

  if (gameid === 'poker20') {
    return (
      <PokerLayout
        sub={sub}
        betControl={betControl}
        onSelect={handleSelect}
        pendingBetAmounts={pendingBetAmounts}
      />
    );
  }

  if (gameid === 'teenmuf') {
    return (
      <TeenMufLayout
        sub={sub}
        betControl={betControl}
        onSelect={handleSelect}
        pendingBetAmounts={pendingBetAmounts}
      />
    );
  }

  return (
    <TeenSinLayout
      sub={sub}
      betControl={betControl}
      onSelect={handleSelect}
      pendingBetAmounts={pendingBetAmounts}
    />
  );
});

export default Layout2;
