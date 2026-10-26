import React, { memo } from 'react';
import { FaLock } from 'react-icons/fa';

const WINNER_MARKET = 'WINNER';

const normalize = (str) => str?.toLowerCase()?.trim() || '';

const isSuspended = (cell) =>
  !cell || String(cell.gstatus || '').toUpperCase() === 'SUSPENDED';

const isWinnerMarket = (marketName) =>
  normalize(marketName) === normalize(WINNER_MARKET);

// Strip the "Player A" / "Player B" prefix and normalise casing for the button label
const getBonusLabel = (nat, playerName) =>
  String(nat || '')
    .replace(new RegExp(playerName, 'i'), '')
    .trim()
    .replace(/\bcard\b/i, 'Cards')
    .replace(/\bbonus\b/i, 'Bonus');

/**
 * After place bet only:
 * - Player A / Player B (WINNER) → bet team: winProfit, other team: netBet
 * - other markets (bonus) → price (bet team only)
 */
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
  if (!market) return null;

  const detail = market.details?.find(
    (d) => normalize(d.teamName) === normalize(playerName)
  );

  let value;
  if (isWinnerMarket(marketName)) {
    value = detail ? Number(detail.winProfit) || 0 : Number(market.netBet) || 0;
  } else {
    if (!detail) return null;
    value = Number(detail.price);
    if (Number.isNaN(value)) return null;
  }

  const isProfit = value >= 0;

  return (
    <span
      className={`text-[11px] leading-none font-bold ${
        isProfit ? 'text-green-700' : 'text-red-600'
      }`}
    >
      {value.toFixed(2)}
    </span>
  );
});

/**
 * OddsCell - a single back or lay odds box inside the player header row
 */
const OddsCell = memo(function OddsCell({ cell, type, selected, onSelect }) {
  const suspended = isSuspended(cell);
  const value = type === 'back' ? cell?.b : cell?.l;
  const isBack = type === 'back';

  const baseColor = isBack
    ? selected
      ? 'bg-[#4a95c9] text-white'
      : 'bg-[#72bbef] text-[#1c1c1c] hover:bg-[#5aabe6]'
    : selected
      ? 'bg-[#e78ba0] text-white'
      : 'bg-[#f9c9d4] text-[#1c1c1c] hover:bg-[#f5b3c2]';

  return (
    <div className='relative w-[72px] shrink-0'>
      <button
        type='button'
        disabled={suspended || !value}
        onClick={() =>
          onSelect?.({
            ...cell,
            marketName: WINNER_MARKET,
            teamCount: 2,
            type,
            odds: value,
          })
        }
        className={`flex min-h-[46px] w-full items-center justify-center text-[15px] font-bold transition-colors ${baseColor} `}
      >
        {value ?? 0}
      </button>
      {suspended && (
        <span className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-white'>
          <FaLock className='size-3.5' />
        </span>
      )}
    </div>
  );
});

/**
 * BonusButton - full-width market button (e.g. "2 Cards Bonus", "7 Cards Bonus")
 */
const BonusButton = memo(function BonusButton({
  cell,
  label,
  onSelect,
  pendingBetAmounts,
}) {
  const suspended = isSuspended(cell);
  const marketName = cell?.nat;

  return (
    <div className='mb-3 flex-1'>
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
              odds: cell.b,
            })
          }
          className={`flex min-h-[46px] w-full items-center justify-center bg-[#72bbef] text-[16px] font-bold text-[#1c1c1c] transition-colors`}
        >
          {label}
        </button>
        {suspended && (
          <span className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-white'>
            <FaLock className='size-3.5' />
          </span>
        )}
      </div>
      {cell && (
        <div className='flex min-h-[14px] items-center justify-center py-0.5'>
          <PlacedBetPL
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
 * PlayerPanel - "Player A" / "Player B" header (name + back/lay) with bonus buttons
 */
const PlayerPanel = memo(function PlayerPanel({
  title,
  winner,
  bonuses,
  betControl,
  onSelect,
  pendingBetAmounts,
}) {
  return (
    <div className='flex-1'>
      <div className='mb-1 flex items-stretch gap-px'>
        <div className='flex flex-1 items-center gap-1.5 bg-[#e9e9e9] px-2 text-[13px] font-bold text-[#1c1c1c]'>
          <span>{title}</span>
          {winner && (
            <PlacedBetPL
              playerName={winner.nat}
              marketName={WINNER_MARKET}
              pendingBetAmounts={pendingBetAmounts}
            />
          )}
        </div>
        <OddsCell
          cell={winner}
          type='back'
          selected={
            betControl?.sid === winner?.sid && betControl?.type === 'back'
          }
          onSelect={onSelect}
        />
        <OddsCell
          cell={winner}
          type='lay'
          selected={
            betControl?.sid === winner?.sid && betControl?.type === 'lay'
          }
          onSelect={onSelect}
        />
      </div>

      <div className='flex gap-1'>
        {bonuses.map((cell, i) => (
          <BonusButton
            key={cell?.sid ?? i}
            cell={cell}
            label={getBonusLabel(cell?.nat, title)}
            selected={cell && betControl?.sid === cell.sid}
            onSelect={onSelect}
            pendingBetAmounts={pendingBetAmounts}
          />
        ))}
      </div>
    </div>
  );
});

/**
 * Layout1 - renders the betting UI for the Poker game
 * Two player panels: Winner (back/lay) + bonus market buttons
 */
const Layout1 = memo(function Layout1({
  bettingData,
  betControl,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
  pendingBetAmounts,
}) {
  const sub = bettingData?.sub || [];

  const bySr = [...sub].sort((a, b) => (a.sr || 0) - (b.sr || 0));

  const buildPlayer = (playerName) => {
    const name = playerName.toLowerCase();
    const entries = bySr.filter((s) =>
      String(s.nat || '')
        .toLowerCase()
        .startsWith(name)
    );
    return {
      winner: entries.find(
        (s) =>
          String(s.nat || '')
            .trim()
            .toLowerCase() === name
      ),
      bonuses: entries.filter((s) => /bonus/i.test(s.nat)),
    };
  };

  const playerA = buildPlayer('Player A');
  const playerB = buildPlayer('Player B');

  const handleSelect = (payload) => {
    if (!payload || isSuspended(payload) || !payload.odds || payload.odds <= 0)
      return;
    setBetControl(payload);
    setSelectedTeamSubtype?.(payload.nat);
    setValue(payload.odds, payload.nat, payload.type);
  };

  return (
    <div className='flex gap-3'>
      <PlayerPanel
        title='Player A'
        winner={playerA.winner}
        bonuses={playerA.bonuses}
        betControl={betControl}
        onSelect={handleSelect}
        pendingBetAmounts={pendingBetAmounts}
      />
      <PlayerPanel
        title='Player B'
        winner={playerB.winner}
        bonuses={playerB.bonuses}
        betControl={betControl}
        onSelect={handleSelect}
        pendingBetAmounts={pendingBetAmounts}
      />
    </div>
  );
});

export default Layout1;
