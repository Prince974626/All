import React, { memo } from 'react';
import { FaLock } from 'react-icons/fa';

const isSuspended = (item) =>
  !item || String(item.gstatus || '').toUpperCase() === 'SUSPENDED';

const norm = (s) =>
  String(s || '')
    .trim()
    .toLowerCase();

// Find a betting cell by its display name and (optionally) etype/subtype.
const findCell = (sub, nat, { etype, subtype } = {}) =>
  sub.find(
    (s) =>
      norm(s.nat) === norm(nat) &&
      (etype ? norm(s.etype) === norm(etype) : true) &&
      (subtype ? norm(s.subtype) === norm(subtype) : true)
  );

const WINNER_MARKET = 'winner';
const MAIN_TEAMS = ['player a', 'player b'];

// After the bet is placed only. Nothing is shown while the slip is still open.
// Main (WINNER): bet team shows winProfit, the other player shows netBet.
// Consecutive / Odd-Even: price on the team that was bet.
const PlacedBetPL = memo(function PlacedBetPL({
  playerName,
  winner = false,
  pendingBetAmounts,
}) {
  if (!Array.isArray(pendingBetAmounts) || !pendingBetAmounts.length)
    return null;

  const pName = norm(playerName);
  if (!pName) return null;

  const markets = pendingBetAmounts.filter((m) => Array.isArray(m?.details));

  let market = null;
  let detail = null;
  for (const entry of markets) {
    const match = entry.details.find((d) => norm(d.teamName) === pName);
    if (match) {
      market = entry;
      detail = match;
      break;
    }
  }

  let value;
  if (winner) {
    const winnerMarket =
      markets.find(
        (m) =>
          norm(m.marketName) === WINNER_MARKET ||
          m.details.some((d) => MAIN_TEAMS.includes(norm(d.teamName)))
      ) || market;
    if (!winnerMarket) return null;

    const winnerDetail =
      detail ||
      winnerMarket.details.find((d) => norm(d.teamName) === pName);

    if (winnerDetail) {
      value = Number(winnerDetail.winProfit) || 0;
    } else {
      const onlyMainBook = winnerMarket.details.every((d) => {
        const name = norm(d.teamName);
        return name === 'other' || MAIN_TEAMS.includes(name);
      });
      const hasMainBet = winnerMarket.details.some((d) =>
        MAIN_TEAMS.includes(norm(d.teamName))
      );
      if (!onlyMainBook || !hasMainBet) return null;
      value = Number(winnerMarket.netBet) || 0;
    }
  } else {
    if (!detail) return null;
    value = Number(detail.price);
    if (Number.isNaN(value)) return null;
  }

  if (value === 0) return null;

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

const Lock = memo(function Lock() {
  return (
    <span className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-white'>
      <FaLock className='size-3.5' />
    </span>
  );
});

// ============================================================================
// A single Back / Lay odds cell for the "Main" / "Consecutive" markets
// ============================================================================
const OddsCell = memo(function OddsCell({
  item,
  type,
  marketName,
  teamName,
  onSelect,
}) {
  const suspended = isSuspended(item);
  const odds = type === 'lay' ? item?.l : item?.b;
  const disabled = suspended || !odds || odds <= 0;

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
          ...(teamName ? { nat: teamName } : {}),
          teamCount: type === 'lay' ? 2 : 1,
        })
      }
      className={`relative flex min-h-[46px] w-full flex-col items-center justify-center border-l border-white/70 text-[#1c1c1c] transition-colors ${tone}`}
    >
      <span className='text-[18px] leading-none font-bold'>{odds ?? 0}</span>
      {suspended && <Lock />}
    </button>
  );
});

// ============================================================================
// Player panel: "Player A/B" with a "Main" and "Consecutive" row (Back / Lay)
// ============================================================================
const PlayerPanel = memo(function PlayerPanel({
  title,
  main,
  con,
  onSelect,
  pendingBetAmounts,
}) {
  const consecutiveName = `player ${title.slice(-1)}-con`;
  const rows = [
    { label: 'Main', item: main, marketName: 'WINNER', winner: true },
    {
      label: 'Consecutive',
      item: con,
      marketName: consecutiveName,
      teamName: consecutiveName,
    },
  ];

  return (
    <div className='overflow-hidden border border-gray-300 bg-white'>
      {/* Header: title + Back / Lay */}
      <div className='grid grid-cols-[1.6fr_1fr_1fr]'>
        <div className='flex items-center bg-[#efefef] px-3 py-1.5 text-[15px] font-bold text-[#1f2d3a]'>
          {title}
        </div>
        <div className='flex items-center justify-center border-l border-white/70 bg-[#72bbef] py-1.5 text-[15px] font-bold text-[#1f2d3a]'>
          Back
        </div>
        <div className='flex items-center justify-center border-l border-white/70 bg-[#f9c9d4] py-1.5 text-[15px] font-bold text-[#1f2d3a]'>
          Lay
        </div>
      </div>

      {rows.map(({ label, item, marketName, teamName, winner }) => (
        <div
          key={label}
          className='grid grid-cols-[1.6fr_1fr_1fr] border-t border-gray-200'
        >
          <div className='flex items-center gap-1.5 px-3 py-1 text-[14px] font-bold text-[#1f2d3a]'>
            {label}
            <PlacedBetPL
              playerName={teamName || item?.nat}
              winner={winner}
              pendingBetAmounts={pendingBetAmounts}
            />
          </div>
          <OddsCell
            item={item}
            type='back'
            marketName={marketName}
            teamName={teamName}
            onSelect={onSelect}
          />
          <OddsCell
            item={item}
            type='lay'
            marketName={marketName}
            teamName={teamName}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  );
});

// ============================================================================
// Odd / Even card grid (Card 1 .. Card 6, rows "Odd" and "Even")
// ============================================================================
const CardOddEvenCell = memo(function CardOddEvenCell({
  card,
  type,
  onSelect,
  pl,
}) {
  const oddObj = card?.odds?.find((o) => norm(o.nat) === norm(type));
  const value = oddObj?.b ?? 0;
  const cardSuspended = isSuspended(card) || card?.visible === 0;
  const locked = cardSuspended || !value || value === 0;

  // if (locked) {
  //   return (
  //     <div className='relative flex min-h-[46px] flex-col items-center justify-center border-l border-t border-gray-300 bg-[#3b4a54] text-white'>
  //       <FaLock className='size-3.5' />
  //     </div>
  //   );
  // }

  return (
    <button
      type='button'
      onClick={() =>
        onSelect?.({
          ...card,
          type: 'back',
          odds: value,
          nat: `${card.nat} ${oddObj.nat}`,
          marketName: card.nat,
          teamCount: 2,
          sno: oddObj.sno,
        })
      }
      className='relative flex min-h-[46px] w-full flex-col items-center justify-center border-t border-l border-gray-300 bg-[#72bbef] text-[#1c1c1c] transition-colors hover:bg-[#5aabe6]'
    >
      <span className='text-[18px] leading-none font-bold'>{value}</span>
      {locked && (
        <span className='absolute inset-0 flex items-center justify-center bg-black/60 text-white'>
          <FaLock className='size-3.5' />
        </span>
      )}
      {pl}
    </button>
  );
});

const CardOddEvenTable = memo(function CardOddEvenTable({
  cards,
  onSelect,
  pendingBetAmounts,
}) {
  if (!cards?.length) return null;

  const gridCols = {
    gridTemplateColumns: `1.2fr repeat(${cards.length}, 1fr)`,
  };

  return (
    <div className='mt-2 overflow-hidden border border-gray-300 bg-white'>
      {/* Header row: blank + Card labels */}
      <div className='grid' style={gridCols}>
        <div className='bg-[#efefef]' />
        {cards.map((card) => (
          <div
            key={card.sid}
            className='flex items-center justify-center border-t border-l border-gray-300 bg-[#efefef] py-2 text-[14px] font-bold text-[#1f2d3a]'
          >
            {card.nat}
          </div>
        ))}
      </div>

      {['Odd', 'Even'].map((type) => (
        <div key={type} className='grid' style={gridCols}>
          <div className='flex items-center border-t border-gray-300 bg-[#efefef] px-3 py-1 text-[14px] font-bold text-[#1f2d3a]'>
            {type}
          </div>
          {cards.map((card) => (
            <CardOddEvenCell
              key={card.sid}
              card={card}
              type={type}
              onSelect={onSelect}
              pl={
                <PlacedBetPL
                  playerName={`${card.nat} ${type}`}
                  pendingBetAmounts={pendingBetAmounts}
                />
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
});

// ============================================================================
// TEEN (2 players + Consecutive fancy1 + Odd/Even cards)
// ============================================================================
const Layout16 = memo(function Layout16({
  bettingData,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
  pendingBetAmounts,
}) {
  if (!bettingData?.sub) return null;

  const sub = bettingData.sub;

  const playerAMain = findCell(sub, 'Player A', { etype: 'match' });
  const playerBMain = findCell(sub, 'Player B', { etype: 'match' });
  const playerACon = findCell(sub, 'Player A', { subtype: 'con' });
  const playerBCon = findCell(sub, 'Player B', { subtype: 'con' });

  const cards = sub
    .filter((s) => norm(s.subtype) === 'oddeven')
    .sort((a, b) => (a.sr || 0) - (b.sr || 0));

  const handleSelect = (payload) => {
    if (!payload || !payload.odds || payload.odds <= 0) return;
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

  return (
    <div className='bg-[#f7f7f7] p-2'>
      <div className='grid gap-2 md:grid-cols-2'>
        <PlayerPanel
          title='Player A'
          main={playerAMain}
          con={playerACon}
          onSelect={handleSelect}
          pendingBetAmounts={pendingBetAmounts}
        />
        <PlayerPanel
          title='Player B'
          main={playerBMain}
          con={playerBCon}
          onSelect={handleSelect}
          pendingBetAmounts={pendingBetAmounts}
        />
      </div>

      <CardOddEvenTable
        cards={cards}
        onSelect={handleSelect}
        pendingBetAmounts={pendingBetAmounts}
      />
    </div>
  );
});

export default Layout16;
