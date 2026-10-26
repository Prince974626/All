import React, { memo } from 'react';
import { FaLock } from 'react-icons/fa';

const isSuspended = (item) =>
  !item || String(item.gstatus || '').toUpperCase() === 'SUSPENDED';

const normalize = (str) => str?.toLowerCase()?.trim() || '';

// Suit glyphs used in the Red/Black and suit headers
const SPADE = '\u2660';
const HEART = '\u2665';
const CLUB = '\u2663';
const DIAMOND = '\u2666';

const HEADER_TONE = {
  back: 'bg-[#72bbef] text-[#1f2d3a]',
  lay: 'bg-[#f9c9d4] text-[#1f2d3a]',
  plain: 'bg-[#eaeaea] text-[#1f2d3a]',
};

/** Resolve payload marketName for dt6 / joker20 */
const resolveMarketName = (item, gameid, forceJoker = false) => {
  const nat = normalize(item?.nat);
  const gid = normalize(gameid);
  const isJoker =
    forceJoker ||
    gid === 'joker20' ||
    nat === 'player a' ||
    nat === 'player b' ||
    nat.startsWith('joker ');

  if (isJoker) {
    if (nat === 'player a' || nat === 'player b') return 'joker20';
    if (nat === 'joker even' || nat === 'joker odd') return 'jokerEvenOdd';
    if (nat === 'joker red' || nat === 'joker black') return 'jokerRedBlack';
    if (
      nat === 'joker spade' ||
      nat === 'joker heart' ||
      nat === 'joker diamond' ||
      nat === 'joker club'
    )
      return 'jokerColor';
    return item?.nat;
  }

  // dt6 (default for this layout)
  if (nat === 'dragon' || nat === 'tiger') return gameid || 'dt6';
  if (nat === 'pair') return 'pair';
  if (nat === 'dragon even' || nat === 'dragon odd') return 'dragonEvenOdd';
  if (nat === 'dragon red' || nat === 'dragon black') return 'dragonRedBlack';
  if (nat === 'tiger even' || nat === 'tiger odd') return 'tigerEvenOdd';
  if (nat === 'tiger red' || nat === 'tiger black') return 'tigerRedBlack';
  if (nat === 'dragon spade' || nat === 'tiger spade') return 'spade';
  if (nat === 'dragon heart' || nat === 'tiger heart') return 'heart';
  if (nat === 'dragon diamond' || nat === 'tiger diamond') return 'diamond';
  if (nat === 'dragon club' || nat === 'tiger club') return 'club';
  return item?.nat;
};

/**
 * After place bet only:
 * - dt6 / poker20 → bet team: winProfit, other teams: netBet
 * - all other markets (incl. joker20) → price (bet team only)
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
  const isDt6Main = mName === 'dt6';
  const isPoker20Main = mName === 'poker20';
  const isMainMarket = isDt6Main || isPoker20Main;

  // Nested: [{ marketName, details: [{ teamName, price, winProfit }], netBet }]
  const market = pendingBetAmounts.find(
    (m) => normalize(m.marketName) === mName
  );

  // dt6 / poker20: bet team → winProfit, other teams → netBet
  if (isMainMarket) {
    if (!market) return null;
    const detail = market.details?.find((d) => normalize(d.teamName) === pName);
    const value = detail
      ? Number(detail.winProfit) || 0
      : Number(market.netBet) || 0;
    const isProfit = value >= 0;
    return (
      <span
        className={`relative z-20 text-[10px] leading-none font-bold ${
          isProfit ? 'text-green-700' : 'text-red-600'
        }`}
      >
        {value.toFixed(2)}
      </span>
    );
  }

  // Other markets: price on bet team only
  let detail = market?.details?.find((d) => normalize(d.teamName) === pName);

  if (!detail) {
    for (const m of pendingBetAmounts) {
      if (!Array.isArray(m?.details)) continue;
      const d = m.details.find((x) => normalize(x.teamName) === pName);
      if (d) {
        detail = d;
        break;
      }
    }
  }

  if (!detail) {
    const flat = pendingBetAmounts.find(
      (b) => normalize(b.teamName) === pName && b.price != null
    );
    if (!flat) return null;
    detail = flat;
  }

  if (detail.price == null && detail.winProfit == null) return null;
  const value =
    detail.price != null ? Number(detail.price) : Number(detail.winProfit);
  if (Number.isNaN(value)) return null;

  const isProfit = value >= 0;
  return (
    <span
      className={`relative z-20 text-[10px] leading-none font-bold ${
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

const HeaderCell = memo(function HeaderCell({ children, tone = 'lay' }) {
  return (
    <div
      className={`flex min-h-[38px] items-center justify-center border-l border-white/70 text-[15px] font-bold ${HEADER_TONE[tone]}`}
    >
      {children}
    </div>
  );
});

// A single clickable odds cell (back = blue, lay = pink)
const OddsCell = memo(function OddsCell({
  item,
  type,
  onSelect,
  marketName,
  pendingBetAmounts,
  showCellPL = true,
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
          teamCount: type === 'lay' ? 2 : 1,
        })
      }
      className={`relative flex min-h-[46px] w-full flex-col items-center justify-center border-l border-white/70 text-[17px] font-bold text-[#1c1c1c] transition-colors ${tone} `}
    >
      <span>{odds ?? 0}</span>
      {showCellPL && item && (
        <PlacedBetPL
          playerName={item.nat}
          marketName={marketName}
          pendingBetAmounts={pendingBetAmounts}
        />
      )}
      {suspended && <Lock />}
    </button>
  );
});

/**
 * OddsTable - Dragon/Tiger row table (label column + N odds columns)
 * showLabelPL: show P/L below team name, not on odds (used for dt6 / joker20 main)
 */
const OddsTable = memo(function OddsTable({
  colTemplate,
  columns,
  rows,
  onSelect,
  resolveMarket,
  pendingBetAmounts,
  showLabelPL = false,
}) {
  const style = { gridTemplateColumns: colTemplate };
  return (
    <div className='overflow-hidden rounded border border-gray-300 bg-white'>
      <div className='grid' style={style}>
        <div className='bg-white' />
        {columns.map((col) => (
          <HeaderCell key={col.key} tone={col.tone}>
            {col.label}
          </HeaderCell>
        ))}
      </div>
      {rows.map((row) => {
        const labelItem =
          row.cells.back ||
          row.cells.lay ||
          Object.values(row.cells).find(Boolean);
        return (
          <div
            key={row.label}
            className='grid border-t border-gray-200'
            style={style}
          >
            <div className='flex min-h-[46px] flex-col justify-center gap-0.5 bg-[#f2f2f2] px-3 text-[15px] font-bold text-[#1f2d3a]'>
              <span>{row.label}</span>
              {showLabelPL && labelItem && (
                <PlacedBetPL
                  playerName={labelItem.nat}
                  marketName={resolveMarket(labelItem)}
                  pendingBetAmounts={pendingBetAmounts}
                />
              )}
            </div>
            {columns.map((col) => {
              const item = row.cells[col.key];
              return (
                <OddsCell
                  key={col.key}
                  item={item}
                  type={col.type}
                  onSelect={onSelect}
                  marketName={item ? resolveMarket(item) : undefined}
                  pendingBetAmounts={pendingBetAmounts}
                  showCellPL={!showLabelPL}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
});

// ============================================================================
// DT6 (One Day Dragon Tiger) / JOKER20 BOARD
// ============================================================================
const Layout14 = memo(function Layout14({
  gameid,
  bettingData,
  betControl,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
  pendingBetAmounts,
}) {
  if (!bettingData?.sub) return null;

  const sub = bettingData.sub;
  const byNat = (nat) =>
    sub.find((s) => s.nat?.trim().toLowerCase() === nat.toLowerCase());

  const isJoker20 =
    normalize(gameid) === 'joker20' ||
    normalize(bettingData.gtype) === 'joker20';

  const resolveMarket = (item) =>
    resolveMarketName(
      item,
      gameid || (isJoker20 ? 'joker20' : 'dt6'),
      isJoker20
    );

  const dragon = byNat('Dragon');
  const tiger = byNat('Tiger');
  const pair = byNat('Pair');

  const dragonEven = byNat('Dragon Even');
  const dragonOdd = byNat('Dragon Odd');
  const dragonRed = byNat('Dragon Red');
  const dragonBlack = byNat('Dragon Black');
  const dragonSpade = byNat('Dragon Spade');
  const dragonHeart = byNat('Dragon Heart');
  const dragonClub = byNat('Dragon Club');
  const dragonDiamond = byNat('Dragon Diamond');

  const tigerEven = byNat('Tiger Even');
  const tigerOdd = byNat('Tiger Odd');
  const tigerRed = byNat('Tiger Red');
  const tigerBlack = byNat('Tiger Black');
  const tigerSpade = byNat('Tiger Spade');
  const tigerHeart = byNat('Tiger Heart');
  const tigerClub = byNat('Tiger Club');
  const tigerDiamond = byNat('Tiger Diamond');

  const handleSelect = (payload) => {
    if (!payload || isSuspended(payload) || !payload.odds || payload.odds <= 0)
      return;
    setBetControl(payload);
    setSelectedTeamSubtype?.(payload.subtype);
    setValue?.(payload.odds, payload.nat, payload.type);
  };

  const RED = (
    <span className='flex items-center gap-1'>
      Red{' '}
      <span className='text-[16px] text-[#ff0000]'>
        {HEART} {DIAMOND}
      </span>
    </span>
  );
  const BLACK = (
    <span className='flex items-center gap-1'>
      Black{' '}
      <span className='text-[16px] text-[#0b1b26]'>
        {SPADE} {CLUB}
      </span>
    </span>
  );

  const suitHeader = (glyph, red) => (
    <span
      className={`text-[20px] ${red ? 'text-[#ff0000]' : 'text-[#0b1b26]'}`}
    >
      {glyph}
    </span>
  );

  // ==========================================================================
  // JOKER20
  // ==========================================================================
  if (isJoker20) {
    const playerA = byNat('Player A');
    const playerB = byNat('Player B');

    const jokerEven = byNat('Joker Even');
    const jokerOdd = byNat('Joker Odd');
    const jokerRed = byNat('Joker Red');
    const jokerBlack = byNat('Joker Black');

    const jokerSpade = byNat('Joker Spade');
    const jokerHeart = byNat('Joker Heart');
    const jokerDiamond = byNat('Joker Diamond');
    const jokerClub = byNat('Joker Club');

    return (
      <div className='bg-white p-2 select-none'>
        <div className='grid gap-2 md:grid-cols-2'>
          {/* Left: Player A / Player B (Back / Lay) */}
          <OddsTable
            colTemplate='1.6fr 1fr 1fr'
            columns={[
              { key: 'back', label: 'Back', tone: 'back', type: 'back' },
              { key: 'lay', label: 'Lay', tone: 'lay', type: 'lay' },
            ]}
            rows={[
              { label: 'Player A', cells: { back: playerA, lay: playerA } },
              { label: 'Player B', cells: { back: playerB, lay: playerB } },
            ]}
            betControl={betControl}
            onSelect={handleSelect}
            resolveMarket={resolveMarket}
            pendingBetAmounts={pendingBetAmounts}
            showLabelPL
          />

          {/* Right: Joker Even/Odd/Red/Black + suit bets */}
          <div className='overflow-hidden rounded border border-gray-300 bg-white'>
            {/* Header: Even / Odd / Red / Black */}
            <div
              className='grid'
              style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr' }}
            >
              <div className='bg-white' />
              <HeaderCell tone='plain'>Even</HeaderCell>
              <HeaderCell tone='plain'>Odd</HeaderCell>
              <HeaderCell tone='plain'>{RED}</HeaderCell>
              <HeaderCell tone='plain'>{BLACK}</HeaderCell>
            </div>

            {/* Joker odds row */}
            <div
              className='grid border-t border-gray-200'
              style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr' }}
            >
              <div className='flex min-h-[46px] items-center bg-[#f2f2f2] px-3 text-[15px] font-bold text-[#1f2d3a]'>
                Joker
              </div>
              <OddsCell
                item={jokerEven}
                type='back'
                onSelect={handleSelect}
                marketName={resolveMarket(jokerEven)}
                pendingBetAmounts={pendingBetAmounts}
              />
              <OddsCell
                item={jokerOdd}
                type='back'
                onSelect={handleSelect}
                marketName={resolveMarket(jokerOdd)}
                pendingBetAmounts={pendingBetAmounts}
              />
              <OddsCell
                item={jokerRed}
                type='back'
                onSelect={handleSelect}
                marketName={resolveMarket(jokerRed)}
                pendingBetAmounts={pendingBetAmounts}
              />
              <OddsCell
                item={jokerBlack}
                type='back'
                onSelect={handleSelect}
                marketName={resolveMarket(jokerBlack)}
                pendingBetAmounts={pendingBetAmounts}
              />
            </div>

            {/* Suit header: Spade / Heart / Diamond / Club */}
            <div
              className='grid border-t border-gray-200'
              style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr' }}
            >
              <div className='bg-white' />
              <HeaderCell tone='plain'>{suitHeader(SPADE, false)}</HeaderCell>
              <HeaderCell tone='plain'>{suitHeader(HEART, true)}</HeaderCell>
              <HeaderCell tone='plain'>{suitHeader(DIAMOND, true)}</HeaderCell>
              <HeaderCell tone='plain'>{suitHeader(CLUB, false)}</HeaderCell>
            </div>

            {/* Joker suit odds row */}
            <div
              className='grid border-t border-gray-200'
              style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr' }}
            >
              <div className='flex min-h-[46px] items-center bg-[#f2f2f2] px-3 text-[15px] font-bold text-[#1f2d3a]'>
                Joker
              </div>
              <OddsCell
                item={jokerSpade}
                type='back'
                onSelect={handleSelect}
                marketName={resolveMarket(jokerSpade)}
                pendingBetAmounts={pendingBetAmounts}
              />
              <OddsCell
                item={jokerHeart}
                type='back'
                onSelect={handleSelect}
                marketName={resolveMarket(jokerHeart)}
                pendingBetAmounts={pendingBetAmounts}
              />
              <OddsCell
                item={jokerDiamond}
                type='back'
                onSelect={handleSelect}
                marketName={resolveMarket(jokerDiamond)}
                pendingBetAmounts={pendingBetAmounts}
              />
              <OddsCell
                item={jokerClub}
                type='back'
                onSelect={handleSelect}
                marketName={resolveMarket(jokerClub)}
                pendingBetAmounts={pendingBetAmounts}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pairSuspended = isSuspended(pair);
  const pairMarket = resolveMarket(pair);

  return (
    <div className='bg-white p-2 select-none'>
      {/* Row 1: Dragon/Tiger Back-Lay  ||  Pair */}
      <div className='grid gap-2 md:grid-cols-2'>
        <OddsTable
          colTemplate='1.6fr 1fr 1fr'
          columns={[
            { key: 'back', label: 'Back', tone: 'back', type: 'back' },
            { key: 'lay', label: 'Lay', tone: 'lay', type: 'lay' },
          ]}
          rows={[
            { label: 'Dragon', cells: { back: dragon, lay: dragon } },
            { label: 'Tiger', cells: { back: tiger, lay: tiger } },
          ]}
          betControl={betControl}
          onSelect={handleSelect}
          resolveMarket={resolveMarket}
          pendingBetAmounts={pendingBetAmounts}
          showLabelPL
        />

        <div className='overflow-hidden rounded border border-gray-300 bg-white'>
          <div className='flex min-h-[38px] items-center justify-center text-[16px] font-bold text-black'>
            {pair?.b ?? 0}
          </div>
          <button
            type='button'
            disabled={pairSuspended || !pair?.b}
            onClick={() =>
              handleSelect({
                ...pair,
                type: 'back',
                odds: pair?.b,
                marketName: pairMarket,
                teamCount: 1,
              })
            }
            className='relative flex min-h-[46px] w-full flex-col items-center justify-center text-[18px] font-bold text-white transition'
            style={{
              backgroundImage: 'linear-gradient(to right, #0088cc, #2c3e50)',
            }}
          >
            Pair
            {pair && (
              <PlacedBetPL
                playerName={pair.nat}
                marketName={pairMarket}
                pendingBetAmounts={pendingBetAmounts}
              />
            )}
            {pairSuspended && <Lock />}
          </button>
        </div>
      </div>

      {/* Row 2: Even/Odd  ||  Red/Black */}
      <div className='mt-2 grid gap-2 md:grid-cols-2'>
        <OddsTable
          colTemplate='1.6fr 1fr 1fr'
          columns={[
            { key: 'even', label: 'Even', tone: 'back', type: 'back' },
            { key: 'odd', label: 'Odd', tone: 'back', type: 'back' },
          ]}
          rows={[
            {
              label: 'Dragon',
              cells: { even: dragonEven, odd: dragonOdd },
            },
            {
              label: 'Tiger',
              cells: { even: tigerEven, odd: tigerOdd },
            },
          ]}
          betControl={betControl}
          onSelect={handleSelect}
          resolveMarket={resolveMarket}
          pendingBetAmounts={pendingBetAmounts}
        />

        <OddsTable
          colTemplate='1.6fr 1fr 1fr'
          columns={[
            { key: 'red', label: RED, tone: 'back', type: 'back' },
            { key: 'black', label: BLACK, tone: 'back', type: 'back' },
          ]}
          rows={[
            {
              label: 'Dragon',
              cells: { red: dragonRed, black: dragonBlack },
            },
            {
              label: 'Tiger',
              cells: { red: tigerRed, black: tigerBlack },
            },
          ]}
          betControl={betControl}
          onSelect={handleSelect}
          resolveMarket={resolveMarket}
          pendingBetAmounts={pendingBetAmounts}
        />
      </div>

      {/* Row 3: Suit bets (Spade / Heart / Club / Diamond) */}
      <div className='mt-2'>
        <OddsTable
          colTemplate='1.4fr repeat(4, 1fr)'
          columns={[
            {
              key: 'spade',
              label: suitHeader(SPADE, false),
              tone: 'plain',
              type: 'back',
            },
            {
              key: 'heart',
              label: suitHeader(HEART, true),
              tone: 'plain',
              type: 'back',
            },
            {
              key: 'club',
              label: suitHeader(CLUB, false),
              tone: 'plain',
              type: 'back',
            },
            {
              key: 'diamond',
              label: suitHeader(DIAMOND, true),
              tone: 'plain',
              type: 'back',
            },
          ]}
          rows={[
            {
              label: 'Dragon',
              cells: {
                spade: dragonSpade,
                heart: dragonHeart,
                club: dragonClub,
                diamond: dragonDiamond,
              },
            },
            {
              label: 'Tiger',
              cells: {
                spade: tigerSpade,
                heart: tigerHeart,
                club: tigerClub,
                diamond: tigerDiamond,
              },
            },
          ]}
          betControl={betControl}
          onSelect={handleSelect}
          resolveMarket={resolveMarket}
          pendingBetAmounts={pendingBetAmounts}
        />
      </div>
    </div>
  );
});

export default Layout14;
