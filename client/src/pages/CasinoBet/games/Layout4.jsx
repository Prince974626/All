import React, { memo, useMemo, useState } from 'react';
import A from '../../../assets/cards/A.jpeg';
import K from '../../../assets/cards/K.jpeg';
import Q from '../../../assets/cards/Q.jpeg';
import J from '../../../assets/cards/J.jpeg';
import ten from '../../../assets/cards/10.jpeg';
import nine from '../../../assets/cards/9.jpeg';
import eight from '../../../assets/cards/8.jpeg';
import seven from '../../../assets/cards/7.jpeg';
import six from '../../../assets/cards/6.jpeg';
import five from '../../../assets/cards/5.jpeg';
import four from '../../../assets/cards/4.jpeg';
import three from '../../../assets/cards/3.jpeg';
import two from '../../../assets/cards/2.jpeg';

const normalize = (str) => str?.toLowerCase()?.trim();

/** Show price only for the placed team — never for other rows. */
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
        isProfit ? 'text-green-600' : 'text-red-600'
      }`}
    >
      {price.toFixed(2)}
    </span>
  );
});

const cardImageMap = {
  1: A,
  A: A,
  2: two,
  3: three,
  4: four,
  5: five,
  6: six,
  7: seven,
  8: eight,
  9: nine,
  10: ten,
  J: J,
  Q: Q,
  K: K,
};

/* -------------------------------------------------------------------------- */
/*  LUCKY 7 (with Lines) board                                                */
/* -------------------------------------------------------------------------- */

// Fixed card groups shown inside each "Line" box (7 is the pivot, excluded)
const LINE_CARD_GROUPS = {
  1: ['A', '2', '3'],
  2: ['4', '5', '6'],
  3: ['8', '9', '10'],
  4: ['J', 'Q', 'K'],
};

const CARD_RANK_ORDER = {
  A: 0,
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 7,
  9: 8,
  10: 9,
  J: 10,
  Q: 11,
  K: 12,
};

// "Card 1" -> "A", "Card 10" -> "10", "Card J" -> "J"
const cardNatToValue = (nat) => {
  const m = String(nat || '').match(/card\s+(.+)/i);
  let v = m ? m[1].trim() : String(nat || '').trim();
  if (v === '1') v = 'A';
  return v;
};

// "Line 1" -> 1
const lineNatToNumber = (nat) => {
  const m = String(nat || '').match(/line\s+(\d+)/i);
  return m ? Number(m[1]) : null;
};

/**
 * Group raw sub[] into the sections needed for the lucky7 board.
 * Only what exists in the API response is returned (missing sections stay empty).
 */
const groupLucky7Board = (sub) => {
  if (!Array.isArray(sub)) {
    return {
      lowCard: null,
      highCard: null,
      even: null,
      odd: null,
      red: null,
      black: null,
      cards: [],
      lines: [],
    };
  }
  const find = (re) => sub.find((i) => re.test(String(i.nat || '').trim()));
  const filter = (re) => sub.filter((i) => re.test(String(i.nat || '').trim()));

  const cards = filter(/^card\s+/i).sort(
    (a, b) =>
      (CARD_RANK_ORDER[cardNatToValue(a.nat)] ?? 99) -
      (CARD_RANK_ORDER[cardNatToValue(b.nat)] ?? 99)
  );
  const lines = filter(/^line\s+/i).sort(
    (a, b) => (lineNatToNumber(a.nat) ?? 99) - (lineNatToNumber(b.nat) ?? 99)
  );

  return {
    lowCard: find(/^low\s*card$/i),
    highCard: find(/^high\s*card$/i),
    even: find(/^even$/i),
    odd: find(/^odd$/i),
    red: find(/^red$/i),
    black: find(/^black$/i),
    cards,
    lines,
  };
};

/* -------------------------------------------------------------------------- */
/*  DRAGON TIGER LION (dtl20) table                                           */
/* -------------------------------------------------------------------------- */

const DTL_ENTITIES = [
  { name: 'Dragon', letter: 'D' },
  { name: 'Tiger', letter: 'T' },
  { name: 'Lion', letter: 'L' },
];

const DTL_TOP_ROWS = [
  { type: 'top', prefix: 'Winner', label: 'Winner' },
  {
    type: 'top',
    prefix: 'Black',
    label: (
      <>
        Black <span className='text-[26px] text-black'>♠ ♣</span>
      </>
    ),
  },
  {
    type: 'top',
    prefix: 'Red',
    label: (
      <>
        Red <span className='text-[26px] text-red-600'>♥ ♦</span>
      </>
    ),
  },
  { type: 'top', prefix: 'Odd', label: 'Odd' },
  { type: 'top', prefix: 'Even', label: 'Even' },
];

const DTL_CARDS = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

// nat used by the API for a given row + entity (dtl20: "Winner D", "Dragon A")
const dtlNatFor = (row, entity) =>
  row.type === 'card'
    ? `${entity.name} ${row.card}`
    : `${row.prefix} ${entity.letter}`;

/** "Winner D" → "winner", "Dragon A" → "a" */
const dtlMarketFromNat = (nat) => {
  const s = String(nat || '').trim();
  const top = s.match(/^(winner|black|red|odd|even)\s+[dtl]$/i);
  if (top) return top[1].toLowerCase();
  const card = s.match(/^(dragon|tiger|lion)\s+(.+)$/i);
  if (card) {
    let c = card[2].trim().toLowerCase();
    if (c === '1') c = 'a';
    return c;
  }
  return s.toLowerCase().replace(/\s+/g, '');
};

/** Restore card label used in API nats from market key ("a" → "A") */
const dtlCardLabelFromMarket = (market) => {
  if (market === 'a') return 'A';
  if (market === 'j') return 'J';
  if (market === 'q') return 'Q';
  if (market === 'k') return 'K';
  return market;
};

/* -------------------------------------------------------------------------- */
/*  TEENPATTI 9 (teen9) table — Tiger / Lion / Dragon                         */
/* -------------------------------------------------------------------------- */

const TEEN9_ENTITIES = [
  { name: 'Tiger', key: 'T' },
  { name: 'Lion', key: 'L' },
  { name: 'Dragon', key: 'D' },
];

const TEEN9_ROWS = [
  'Winner',
  'Pair',
  'Flush',
  'Straight',
  'Trio',
  'Straight Flush',
];

// UI row label → payload marketName
const TEEN9_MARKET_NAME = {
  winner: 'winner',
  pair: 'pair',
  flush: 'flush',
  straight: 'straight',
  trio: 'trio',
  'straight flush': 'straightflush',
};

// nat used by the API: "Tiger Winner", "Lion Pair", …
const teen9NatFor = (rowLabel, entity) => `${entity.name} ${rowLabel}`;

/** "Tiger Straight Flush" → "straightflush" */
const teen9MarketFromNat = (nat) => {
  const m = String(nat || '')
    .trim()
    .match(/^(tiger|lion|dragon)\s+(.+)$/i);
  const row = (m ? m[2] : nat || '').trim().toLowerCase();
  return TEEN9_MARKET_NAME[row] || row.replace(/\s+/g, '');
};

// quick nat -> sub item lookup (case-insensitive)
const buildNatIndex = (sub) => {
  const map = {};
  if (Array.isArray(sub)) {
    sub.forEach((s) => {
      map[
        String(s.nat || '')
          .trim()
          .toLowerCase()
      ] = s;
    });
  }
  return map;
};

const LockOverlay = memo(function LockOverlay() {
  return (
    <span className='absolute inset-0 z-20 flex items-center justify-center rounded-[3px] bg-black/55'>
      <svg
        viewBox='0 0 24 24'
        className='h-5 w-5 text-white'
        fill='currentColor'
        aria-label='Suspended'
      >
        <path d='M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm3 8H9V6a3 3 0 0 1 6 0v3z' />
      </svg>
    </span>
  );
});

// Small card image used inside the board (Line boxes + card strip)
const BoardCard = memo(function BoardCard({ value, compact = false }) {
  return (
    <div className={compact ? 'h-[35px]' : 'h-[50px]'}>
      <img
        src={cardImageMap[value]}
        alt={`Card ${value}`}
        className='h-full w-full object-contain'
      />
    </div>
  );
});

const Layout4 = memo(function Layout4({
  gameid,
  bettingData,
  betControl,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
  pendingBetAmounts,
}) {
  const groups = useMemo(
    () => groupLucky7Board(bettingData?.sub),
    [bettingData?.sub]
  );

  const natIndex = useMemo(
    () => buildNatIndex(bettingData?.sub),
    [bettingData?.sub]
  );

  const isDtl =
    gameid === 'dtl20' || (!!natIndex['winner d'] && !!natIndex['winner l']);
  const isTeen9 =
    gameid === 'teen9' ||
    (!!natIndex['tiger winner'] && !!natIndex['lion winner']);

  // Mobile: only one entity column is shown at a time (tab-selected)
  const [activeEntity, setActiveEntity] = useState(
    gameid === 'teen9' ? 'T' : 'D'
  );

  const isSelected = (item) => !!item && betControl?.sid === item?.sid;
  const isSuspended = (item) => item?.gstatus === 'SUSPENDED';

  // lucky5 / lucky7 / teen9 / dtl20 markets for payload
  const resolveMarketName = (item) => {
    if (isDtl) return dtlMarketFromNat(item.nat);
    if (isTeen9) return teen9MarketFromNat(item.nat);
    const nat = String(item?.nat || '')
      .trim()
      .toLowerCase();
    if (nat === 'low card' || nat === 'high card') return gameid;
    if (nat === 'even' || nat === 'odd') return 'evenOdd';
    if (nat === 'red' || nat === 'black') return 'redBlack';
    if (
      nat === 'line 1' ||
      nat === 'line 2' ||
      nat === 'line 3' ||
      nat === 'line 4'
    )
      return 'line';
    if (/^card\s+/i.test(String(item?.nat || ''))) return 'card';
    return item.nat;
  };

  const resolveTeamCount = (item) => {
    if (isDtl) {
      const market = dtlMarketFromNat(item.nat);
      const topMarkets = ['winner', 'black', 'red', 'odd', 'even'];
      if (topMarkets.includes(market)) {
        const count = DTL_ENTITIES.filter(
          (entity) => natIndex[`${market} ${entity.letter}`.toLowerCase()]
        ).length;
        return count || DTL_ENTITIES.length;
      }
      // Card row (A–K): count Dragon/Tiger/Lion options for that card
      const cardLabel = dtlCardLabelFromMarket(market);
      const count = DTL_ENTITIES.filter(
        (entity) => natIndex[`${entity.name} ${cardLabel}`.toLowerCase()]
      ).length;
      return count || DTL_ENTITIES.length;
    }
    if (isTeen9) {
      // Count Tiger/Lion/Dragon options present for this row in the API
      const m = String(item?.nat || '')
        .trim()
        .match(/^(tiger|lion|dragon)\s+(.+)$/i);
      const rowLabel = m ? m[2].trim() : '';
      if (!rowLabel) return TEEN9_ENTITIES.length;
      const count = TEEN9_ENTITIES.filter(
        (entity) => natIndex[teen9NatFor(rowLabel, entity).toLowerCase()]
      ).length;
      return count || TEEN9_ENTITIES.length;
    }
    const nat = String(item?.nat || '')
      .trim()
      .toLowerCase();
    if (nat === 'low card' || nat === 'high card') {
      return (groups.lowCard ? 1 : 0) + (groups.highCard ? 1 : 0);
    }
    if (nat === 'even' || nat === 'odd') {
      return (groups.even ? 1 : 0) + (groups.odd ? 1 : 0);
    }
    if (nat === 'red' || nat === 'black') {
      return (groups.red ? 1 : 0) + (groups.black ? 1 : 0);
    }
    if (/^line\s+\d+/i.test(String(item?.nat || ''))) {
      return groups.lines.length || 1;
    }
    if (/^card\s+/i.test(String(item?.nat || ''))) {
      return groups.cards.length || 1;
    }
    return 1;
  };

  const handleSelect = (item) => {
    if (!item || item.b <= 0 || isSuspended(item)) return;
    setBetControl({
      ...item,
      type: 'back',
      odds: item.b,
      marketName: resolveMarketName(item),
      teamCount: resolveTeamCount(item),
    });
    setSelectedTeamSubtype?.(item.subtype);
    setValue?.(item.b, item.nat, 'back');
  };

  // Live potential P/L while placing; placed bets via PlacedBetPL (Layout8 style)
  const renderPL = (item) => {
    if (!item) return null;
    return (
      <>
        <PlacedBetPL
          playerName={item.nat}
          marketName={resolveMarketName(item)}
          pendingBetAmounts={pendingBetAmounts}
        />
      </>
    );
  };

  // Big blue betting button (Low/High card, Even/Odd, Red/Black)
  const renderOddsButton = (item, label, sub = null) => {
    if (!item) return null;
    const suspended = isSuspended(item);
    return (
      <div className='flex flex-col'>
        <div className='text-center text-[18px] leading-none font-bold text-[#243a48]'>
          {item.b}
        </div>
        <button
          type='button'
          onClick={() => handleSelect(item)}
          disabled={suspended}
          className={`relative flex min-h-[46px] w-full flex-col items-center justify-center gap-0.5 bg-gradient-to-r from-[#0088CC] to-[#2C3E50] px-2 py-[5px] font-bold text-white shadow-sm transition`}
        >
          <span className='flex items-center gap-1 text-[14px] leading-none'>
            {label}
            {sub}
          </span>

          {suspended && <LockOverlay />}
        </button>
        <span className='block min-h-[18px] text-center font-bold'>
          {renderPL(item)}
        </span>
      </div>
    );
  };

  // Line box (odds on top, 3 illustrative cards inside a clickable box)
  const renderLineBox = (item) => {
    if (!item) return null;
    const suspended = isSuspended(item);
    const cards = LINE_CARD_GROUPS[lineNatToNumber(item.nat)] || [];
    return (
      <div key={item.sid} className='flex flex-col'>
        <div className='text-center text-[18px] leading-none font-bold text-[#243a48]'>
          {item.b}
        </div>
        <button
          type='button'
          onClick={() => handleSelect(item)}
          disabled={suspended}
          className={`relative flex min-h-[64px] w-full items-center justify-center gap-1 transition`}
        >
          {cards.map((c) => (
            <BoardCard key={c} value={c} />
          ))}

          {suspended && <LockOverlay />}
        </button>
        <span className='block min-h-[18px] text-center'>{renderPL(item)}</span>
      </div>
    );
  };

  // Single card cell in the bottom strip
  const renderCardCell = (item) => {
    if (!item) return null;
    const value = cardNatToValue(item.nat);
    const suspended = isSuspended(item);
    return (
      <div key={item.sid} className='flex flex-col items-center'>
        <button
          type='button'
          onClick={() => handleSelect(item)}
          disabled={suspended}
          className={`relative rounded-[3px] p-0.5 transition`}
        >
          <BoardCard value={value} />
          {suspended && <LockOverlay />}
        </button>
        <span className='block min-h-[18px] text-center'>{renderPL(item)}</span>
      </div>
    );
  };

  /* ---- Dragon Tiger Lion (dtl20) renderers ---- */

  // One odds cell inside the DTL table (a specific row + entity)
  // `isActive` controls mobile visibility (only the tab-selected entity shows)
  const renderDtlCell = (nat, isActive) => {
    const vis = isActive ? 'flex' : 'hidden sm:flex';
    const item = natIndex[nat.trim().toLowerCase()];
    if (!item) {
      return (
        <div
          key={nat}
          className={`${vis} w-[60%] border-l border-white/60 bg-[#9ccdf0] py-2 sm:w-[20%]`}
        />
      );
    }
    const selected = isSelected(item);
    const suspended = isSuspended(item);
    return (
      <div
        key={nat}
        onClick={() => handleSelect(item)}
        className={`relative ${vis} w-[40%] cursor-pointer flex-col items-center justify-center border-l border-white/60 py-2 text-[16px] font-bold transition sm:w-[20%] ${
          selected
            ? 'bg-[#1a8ee1] text-white'
            : 'bg-[#72bbef] text-[#1f2d3a] hover:brightness-105'
        } ${suspended ? 'cursor-not-allowed' : ''}`}
      >
        <span>{item.b}</span>
        {renderPL(item)}
        {suspended && <LockOverlay />}
      </div>
    );
  };

  const renderDtlRow = (row, idx) => (
    <div
      key={row.type === 'card' ? row.card : `${row.prefix}-${idx}`}
      className='flex border-b border-gray-300'
    >
      <div className='flex h-[46px] w-[60%] items-center gap-1 bg-white px-2 py-1 text-[16px] font-bold text-[#1f2d3a] sm:w-[40%]'>
        {row.type === 'card' ? (
          <BoardCard value={row.card} compact />
        ) : (
          row.label
        )}
      </div>
      {DTL_ENTITIES.map((entity) =>
        renderDtlCell(dtlNatFor(row, entity), entity.letter === activeEntity)
      )}
    </div>
  );

  const renderDtlTable = (rows) => (
    <div className='flex-1 overflow-hidden rounded border border-gray-300 bg-white'>
      {/* Column header - desktop only (mobile uses the tab bar) */}
      <div className='hidden border-b border-gray-300 text-[16px] font-bold text-black sm:flex'>
        <div className='w-[40%] p-0.5' />
        <div className='w-[20%] border-l border-white/30 bg-[#72bbef] p-0.5 text-center'>
          Dragon
        </div>
        <div className='w-[20%] border-l border-white/30 bg-[#72bbef] p-0.5 text-center'>
          Tiger
        </div>
        <div className='w-[20%] border-l border-white/30 bg-[#72bbef] p-0.5 text-center'>
          Lion
        </div>
      </div>
      {rows.map((row, idx) => renderDtlRow(row, idx))}
    </div>
  );

  /* ---- TeenPatti 9 (teen9) renderers ---- */

  const renderTeen9Cell = (nat) => {
    const item = natIndex[nat.trim().toLowerCase()];
    if (!item) {
      return (
        <div
          key={nat}
          className={`w-[40%] border-l border-white/60 bg-[#9ccdf0] py-2 sm:w-[20%]`}
        />
      );
    }
    const selected = isSelected(item);
    const suspended = isSuspended(item);
    return (
      <div
        key={nat}
        onClick={() => handleSelect(item)}
        className={`relative w-[20%] cursor-pointer grid h-[46px] items-center justify-center border-l border-white/60 py-2 text-center text-[16px] font-bold transition ${
          selected
            ? 'bg-[#1a8ee1] text-white'
            : 'bg-[#72bbef] text-[#1f2d3a] hover:brightness-105'
        } ${suspended ? 'cursor-not-allowed' : ''}`}
      >
        <span>{item.b}</span>
        {renderPL(item)}
        {suspended && <LockOverlay />}
      </div>
    );
  };

  const renderTeen9Row = (label) => (
    <div key={label} className='flex border-b border-gray-300 last:border-b-0'>
      <div className='flex h-[46px] w-[40%] items-center gap-1 bg-white px-2 py-1 text-[16px] font-bold text-[#1f2d3a]'>
        {label}
      </div>
      {TEEN9_ENTITIES.map((entity) =>
        renderTeen9Cell(teen9NatFor(label, entity), entity.key === activeEntity)
      )}
    </div>
  );

  if (isTeen9) {
    return (
      <div className='bg-[#e6eaea] p-2 select-none'>
        <div className='overflow-hidden rounded border border-gray-300 bg-white'>
          <div className='flex border-b border-gray-300 text-[16px] font-bold text-black'>
            <div className='w-[40%] p-0.5' />
            {TEEN9_ENTITIES.map((entity) => (
              <div
                key={entity.key}
                className='w-[20%] border-l border-white/30 bg-[#72bbef] p-0.5 text-center'
              >
                {entity.name}
              </div>
            ))}
          </div>
          {TEEN9_ROWS.map((label) => renderTeen9Row(label))}
        </div>
      </div>
    );
  }

  if (isDtl) {
    const cardRows = DTL_CARDS.map((card) => ({ type: 'card', card }));
    const leftRows = [...DTL_TOP_ROWS, ...cardRows.slice(0, 4)];
    const rightRows = cardRows.slice(4);
    return (
      <div className='bg-[#e6eaea] p-2 select-none'>
        {/* Mobile entity tabs (Dragon / Tiger / Lion) */}
        <div className='mb-2 flex overflow-hidden rounded sm:hidden'>
          {DTL_ENTITIES.map((entity) => (
            <button
              key={entity.letter}
              type='button'
              onClick={() => setActiveEntity(entity.letter)}
              className={`flex-1 border-r border-white/60 py-2 text-[14px] font-bold transition last:border-r-0 ${
                activeEntity === entity.letter
                  ? 'bg-[#243a48] text-white'
                  : 'bg-[#d7dede] text-[#243a48]'
              }`}
            >
              {entity.name}
            </button>
          ))}
        </div>

        <div className='flex gap-2'>
          {renderDtlTable(leftRows)}
          {renderDtlTable(rightRows)}
        </div>
      </div>
    );
  }

  return (
    <div className='bg-[#e6eaea] p-2 select-none'>
      {/* Row 1: Low Card | 7 | High Card */}
      {(groups.lowCard || groups.highCard) && (
        <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-4'>
          {renderOddsButton(groups.lowCard, 'Low Card')}
          <div className='flex flex-col items-center justify-end'>
            <div className='w-[50px]'>
              <img
                src={`${gameid === 'lucky5' ? six : seven}`}
                alt='7'
                className='h-full'
              />
            </div>
          </div>
          {renderOddsButton(groups.highCard, 'High Card')}
        </div>
      )}

      {/* Row 2: Even | Odd | Red | Black */}
      {(groups.even || groups.odd || groups.red || groups.black) && (
        <div className='mt-4 grid grid-cols-4 gap-2'>
          {renderOddsButton(groups.even, 'Even')}
          {renderOddsButton(groups.odd, 'Odd')}
          {renderOddsButton(
            groups.red,
            '',
            <span className='text-[24px] text-[#ff0000]'>♥ ♦</span>
          )}
          {renderOddsButton(
            groups.black,
            '',
            <span className='text-[24px] text-[#0b1b26]'>♠ ♣</span>
          )}
        </div>
      )}

      {/* Row 3: Line 1 - Line 4 */}
      {groups.lines.length > 0 && (
        <div className='mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4'>
          {groups.lines.map((item) => renderLineBox(item))}
        </div>
      )}

      {/* Row 4: individual cards A - K */}
      <div className='mt-4'>
        {groups.cards.length > 0 && (
          <>
            <div className='text-center text-[18px] leading-none font-bold text-[#243a48]'>
              {groups.cards[0]?.b}
            </div>
            <div className='flex flex-wrap items-end justify-center gap-x-2.5 pb-4'>
              {groups.cards.map((item) => renderCardCell(item))}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default Layout4;
