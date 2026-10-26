import React, { memo } from 'react';
import { FaLock } from 'react-icons/fa';
import { getBetDetails } from '../utils/bettingUtils';

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

// Suit glyphs
const SPADE = '\u2660';
const HEART = '\u2665';
const CLUB = '\u2663';
const DIAMOND = '\u2666';

// Rank -> face card image (matches the "Card A" .. "Card K" odds `nat`).
const CARD_IMG = {
  A,
  2: two,
  3: three,
  4: four,
  5: five,
  6: six,
  7: seven,
  8: eight,
  9: nine,
  10: ten,
  J,
  Q,
  K,
};

// Suit `nat` -> { glyph, red }. Used to pick the right suit image per odd.
const SUIT_GLYPH = {
  spade: { glyph: SPADE, red: false },
  heart: { glyph: HEART, red: true },
  club: { glyph: CLUB, red: false },
  diamond: { glyph: DIAMOND, red: true },
};

const norm = (s) =>
  String(s || '')
    .trim()
    .toLowerCase();

const isSuspended = (item) =>
  !item || String(item?.gstatus || '').toUpperCase() === 'SUSPENDED';

const findCell = (sub, nat, { etype, subtype } = {}) =>
  sub.find(
    (s) =>
      norm(s.nat) === norm(nat) &&
      (etype ? norm(s.etype) === norm(etype) : true) &&
      (subtype ? norm(s.subtype) === norm(subtype) : true)
  );

// The one OPEN/visible card that actually carries the odds for a market group.
const findActiveOddsCard = (sub, subtype) =>
  sub.find(
    (s) =>
      norm(s.subtype) === norm(subtype) &&
      Array.isArray(s.odds) &&
      s.odds.length > 0
  );

const oddByNat = (card, nat) =>
  card?.odds?.find((o) => norm(o.nat) === norm(nat));

const Lock = memo(function Lock() {
  return (
    <span className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-white'>
      <FaLock className='size-3.5' />
    </span>
  );
});

// ============================================================================
// Back / Lay odds cell (Player A/B "Main" row)
// ============================================================================
const OddsCell = memo(function OddsCell({
  item,
  type,
  marketName,
  onSelect,
  pl,
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
      className={`relative flex min-h-[42px] w-full flex-col items-center justify-center border-l border-white/70 text-[#1c1c1c] transition-colors ${tone}`}
    >
      <span className='text-[16px] leading-none font-bold'>{odds ?? 0}</span>
      {pl}
      {suspended && <Lock />}
    </button>
  );
});

// A single "Under 21" / "Over 22" back cell (label + value pair)
const UnderOverCell = memo(function UnderOverCell({
  label,
  item,
  onSelect,
  pl,
}) {
  const suspended = isSuspended(item);
  const odds = item?.b;
  const disabled = suspended || !odds || odds <= 0;

  return (
    <>
      <div className='flex min-h-[46px] w-[70%] items-center bg-[#efefef] px-3 py-1 text-[16px] font-bold text-[#1f2d3a]'>
        {label}
      </div>
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
        className='relative flex min-h-[42px] min-h-[46px] w-[30%] flex-col items-center justify-center border-l border-white/70 bg-[#72bbef] text-[#1c1c1c] transition-colors hover:bg-[#5aabe6]'
      >
        <span className='text-[16px] leading-none font-bold'>{odds ?? 0}</span>
        {pl}
        {suspended && <Lock />}
      </button>
    </>
  );
});

// ============================================================================
// Player panel: "Player A/B" -> Main (Back/Lay) + Under 21 / Over 22
// ============================================================================
const PlayerPanel = memo(function PlayerPanel({
  title,
  main,
  under,
  over,
  onSelect,
  plFor,
}) {
  return (
    <div className='overflow-hidden border border-gray-300 bg-white'>
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

      <div className='grid grid-cols-[1.6fr_1fr_1fr] border-t border-gray-200'>
        <div className='flex min-h-[46px] items-center px-3 py-1 text-[16px] font-bold text-[#1f2d3a]'>
          Main
        </div>
        <OddsCell
          item={main}
          type='back'
          marketName={main?.nat}
          onSelect={onSelect}
          pl={plFor(main, 'back')}
        />
        <OddsCell
          item={main}
          type='lay'
          marketName={main?.nat}
          onSelect={onSelect}
          pl={plFor(main, 'lay')}
        />
      </div>

      <div className='mt-2 flex border-t border-gray-200'>
        <UnderOverCell
          label='Under 21'
          item={under}
          onSelect={onSelect}
          pl={plFor(under, 'back')}
        />
        <UnderOverCell
          label='Over 22'
          item={over}
          onSelect={onSelect}
          pl={plFor(over, 'back')}
        />
      </div>
    </div>
  );
});

// ============================================================================
// Suit / Odd-Even single cell (blue button with a suit glyph or a text label)
// ============================================================================
const InlineOddCell = memo(function InlineOddCell({
  card,
  oddNat,
  label,
  onSelect,
  pl,
}) {
  const oddObj = oddByNat(card, oddNat);
  const value = oddObj?.b ?? 0;
  const locked =
    isSuspended(card) || card?.visible === 0 || !value || value <= 0;

  return (
    <button
      type='button'
      disabled={locked}
      onClick={() =>
        onSelect?.({
          ...card,
          type: 'back',
          odds: value,
          nat: `${card.nat} ${oddObj.nat}`,
          marketName: card.nat,
          teamCount: 2,
          sno: oddObj?.sno,
        })
      }
      className='relative flex min-h-[46px] flex-1 items-center justify-between gap-2 border-l border-white/70 bg-[#72bbef] px-4 text-[#1c1c1c] transition-colors hover:bg-[#5aabe6]'
    >
      <span className='text-[16px] leading-none font-bold'>{label}</span>
      <span className='text-[18px] leading-none font-bold'>{value}</span>
      {pl}
      {locked && <Lock />}
    </button>
  );
});

// ============================================================================
// Card A .. Card K row (face images + odds on top, yellow border)
// ============================================================================
const CardOddCell = memo(function CardOddCell({ card, oddNat, onSelect, pl }) {
  const oddObj = oddByNat(card, oddNat);
  const value = oddObj?.b ?? 0;
  const rank = oddNat.replace(/card/i, '').trim();
  const img = CARD_IMG[rank];
  const locked =
    isSuspended(card) || card?.visible === 0 || !value || value <= 0;

  return (
    <button
      type='button'
      disabled={locked}
      onClick={() =>
        onSelect?.({
          ...card,
          type: 'back',
          odds: value,
          nat: `${card.nat} ${oddObj.nat}`,
          marketName: card.nat,
          teamCount: 2,
          sno: oddObj?.sno,
        })
      }
      className='relative flex flex-col items-center gap-0.5 text-black transition-transform hover:-translate-y-0.5'
    >
      <span className='text-[11px] leading-none font-bold'>{value}</span>
      <div className='relative rounded-sm'>
        <img
          src={img}
          alt={rank}
          draggable={false}
          className='h-12 w-auto object-contain'
        />
        {locked && (
          <span className='absolute inset-0 z-10 flex items-center justify-center bg-black/55 text-white'>
            <FaLock className='size-3' />
          </span>
        )}
      </div>
      {pl}
    </button>
  );
});

// ============================================================================
// TEEN6 (Player A/B main + Under/Over + Suit/OddEven + Card A..K)
// ============================================================================
const Layout17 = memo(function Layout17({
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

  const playerAMain = findCell(sub, 'Player A', { etype: 'match' });
  const playerBMain = findCell(sub, 'Player B', { etype: 'match' });

  const playerAUnder = findCell(sub, 'Player A Under 21', { subtype: 'uo' });
  const playerAOver = findCell(sub, 'Player A Over 22', { subtype: 'uo' });
  const playerBUnder = findCell(sub, 'Player B Under 21', { subtype: 'uo' });
  const playerBOver = findCell(sub, 'Player B Over 22', { subtype: 'uo' });

  const suitCard = findActiveOddsCard(sub, 'suit');
  const oddEvenCard = findActiveOddsCard(sub, 'oddeven');
  const cardsCard = findActiveOddsCard(sub, 'cards');

  const cardOdds = Array.isArray(cardsCard?.odds) ? cardsCard.odds : [];

  const isSelected = (item, type, subKey) =>
    !!item &&
    betControl?.sid === item?.sid &&
    betControl?.type === type &&
    (subKey ? norm(betControl?.nat).endsWith(norm(subKey)) : true);

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

  const plFor = (item, type = 'back', subKey) => {
    if (!item) return null;
    const betDetails = getBetDetails(pendingBetAmounts, item.nat, item.sid);
    const amount = betAmount || 0;
    let value = null;
    if (betDetails) {
      value = betDetails.totalBetAmount || 0;
    } else if (isSelected(item, type, subKey) && amount > 0) {
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

  const suitColumns = [
    { nat: 'Spade', ...SUIT_GLYPH.spade },
    { nat: 'Heart', ...SUIT_GLYPH.heart },
    { nat: 'Club', ...SUIT_GLYPH.club },
    { nat: 'Diamond', ...SUIT_GLYPH.diamond },
  ];

  return (
    <div className='bg-[#f7f7f7] p-2 select-none'>
      <div className='grid gap-2 md:grid-cols-2'>
        <PlayerPanel
          title='Player A'
          main={playerAMain}
          under={playerAUnder}
          over={playerAOver}
          onSelect={handleSelect}
          plFor={plFor}
        />
        <PlayerPanel
          title='Player B'
          main={playerBMain}
          under={playerBUnder}
          over={playerBOver}
          onSelect={handleSelect}
          plFor={plFor}
        />
      </div>

      {/* Suit (Spade/Heart/Club/Diamond) + Odd / Even */}
      <div className='mt-2 grid grid-cols-2 gap-2 overflow-hidden border border-gray-300 bg-white md:grid-cols-6'>
        {suitColumns.map((col) => (
          <InlineOddCell
            key={col.nat}
            card={suitCard}
            oddNat={col.nat}
            label={
              <span
                className={`text-[30px] leading-none ${
                  col.red ? 'text-[#ff0000]' : 'text-[#0b1b26]'
                }`}
              >
                {col.glyph}
              </span>
            }
            onSelect={handleSelect}
            pl={plFor(suitCard, 'back', col.nat)}
          />
        ))}
        <InlineOddCell
          card={oddEvenCard}
          oddNat='Odd'
          label='Odd'
          onSelect={handleSelect}
          pl={plFor(oddEvenCard, 'back', 'Odd')}
        />
        <InlineOddCell
          card={oddEvenCard}
          oddNat='Even'
          label='Even'
          onSelect={handleSelect}
          pl={plFor(oddEvenCard, 'back', 'Even')}
        />
      </div>

      {/* Card A .. Card K */}
      {cardOdds.length > 0 && (
        <div className='mt-2 flex flex-wrap items-start justify-center gap-1 rounded bg-white p-2'>
          {cardOdds.map((odd) => (
            <CardOddCell
              key={odd.sid}
              card={cardsCard}
              oddNat={odd.nat}
              onSelect={handleSelect}
              pl={plFor(cardsCard, 'back', odd.nat)}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default Layout17;
